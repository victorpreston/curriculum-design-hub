import {
  and,
  arrayContains,
  cosineDistance,
  eq,
  inArray,
  notInArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { RetrievedChunk, SourceScore } from '@hub/shared';
import type { Executor } from '../db/client';
import { corpusChunks, corpusDocuments } from '../db/schema';
import type { EmbeddingProvider } from './embeddings';
import type { LearningOutcome } from './outcomeRepository';

export const RETRIEVAL_TOP_K = 6;
export const MAPPED_SOURCE_LIMIT = 4;

export function retrievalQuery(outcome: LearningOutcome): string {
  return `${outcome.description}. ${outcome.subStrand}. ${outcome.strand}`;
}

const chunkColumns = {
  chunkId: corpusChunks.id,
  documentId: corpusChunks.documentId,
  documentTitle: corpusDocuments.title,
  documentType: corpusDocuments.type,
  heading: corpusChunks.heading,
  text: corpusChunks.text,
};

function selectRankedChunks(
  db: Executor,
  queryVector: number[],
  where: SQL | undefined,
  limit: number,
) {
  const distance = cosineDistance(corpusChunks.embedding, queryVector);
  return db
    .select({ ...chunkColumns, similarity: sql<number>`1 - (${distance})` })
    .from(corpusChunks)
    .innerJoin(corpusDocuments, eq(corpusChunks.documentId, corpusDocuments.id))
    .where(where)
    .orderBy(distance)
    .limit(limit);
}

export async function retrieveForOutcome(
  db: Executor,
  embedder: EmbeddingProvider,
  outcome: LearningOutcome,
  topK = RETRIEVAL_TOP_K,
): Promise<RetrievedChunk[]> {
  const [queryVector] = await embedder.embed([retrievalQuery(outcome)]);
  if (!queryVector) return [];

  const gradeFilter = eq(corpusDocuments.grade, outcome.grade);

  const mapped = await selectRankedChunks(
    db,
    queryVector,
    and(gradeFilter, arrayContains(corpusChunks.outcomeCodes, [outcome.code])),
    Math.min(MAPPED_SOURCE_LIMIT, topK),
  );
  const mappedIds = mapped.map((chunk) => chunk.chunkId);
  const neighbours = await selectRankedChunks(
    db,
    queryVector,
    and(
      gradeFilter,
      mappedIds.length > 0 ? notInArray(corpusChunks.id, mappedIds) : undefined,
    ),
    topK - mapped.length,
  );

  return [...mapped, ...neighbours].map((row) => ({
    ...row,
    similarity: Number(Number(row.similarity).toFixed(4)),
  }));
}

export async function loadChunks(db: Executor, sources: SourceScore[]): Promise<RetrievedChunk[]> {
  if (sources.length === 0) return [];
  const rows = await db
    .select(chunkColumns)
    .from(corpusChunks)
    .innerJoin(corpusDocuments, eq(corpusChunks.documentId, corpusDocuments.id))
    .where(
      inArray(
        corpusChunks.id,
        sources.map((source) => source.chunkId),
      ),
    );
  const byId = new Map(rows.map((row) => [row.chunkId, row]));
  return sources.flatMap((source) => {
    const row = byId.get(source.chunkId);
    return row ? [{ ...row, similarity: source.similarity }] : [];
  });
}
