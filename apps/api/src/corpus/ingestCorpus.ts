import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, notInArray } from 'drizzle-orm';
import type { Database } from '../db/client';
import { corpusChunks, corpusDocuments, learningOutcomes } from '../db/schema';
import type { EmbeddingProvider } from './embeddings';
import { extractOutcomes, parseCorpusDocument, type ParsedDocument } from './parseCorpus';

export const corpusDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../corpus',
);

export interface IngestSummary {
  documents: number;
  reembedded: number;
  chunks: number;
  outcomes: number;
}

async function readCorpus(directory: string): Promise<ParsedDocument[]> {
  const fileNames = (await readdir(directory))
    .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
    .sort();
  const documents = await Promise.all(
    fileNames.map(async (name) =>
      parseCorpusDocument(await readFile(path.join(directory, name), 'utf8'), name),
    ),
  );
  const ids = documents.map((document) => document.meta.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) throw new Error(`Duplicate document id in corpus: ${duplicate}`);
  return documents;
}

async function isUpToDate(
  db: Database,
  document: ParsedDocument,
  embeddingModel: string,
): Promise<boolean> {
  const [existing] = await db
    .select({
      contentHash: corpusDocuments.contentHash,
      embeddingModel: corpusDocuments.embeddingModel,
    })
    .from(corpusDocuments)
    .where(eq(corpusDocuments.id, document.meta.id));
  return (
    existing?.contentHash === document.contentHash && existing.embeddingModel === embeddingModel
  );
}

async function storeDocument(
  db: Database,
  document: ParsedDocument,
  embeddings: number[][],
  embeddingModel: string,
): Promise<void> {
  const { meta } = document;
  await db.transaction(async (tx) => {
    const documentRow = {
      type: meta.type,
      title: meta.title,
      subject: meta.subject,
      grade: meta.grade,
      strand: meta.strand,
      contentHash: document.contentHash,
      embeddingModel,
      ingestedAt: new Date(),
    };
    await tx
      .insert(corpusDocuments)
      .values({ id: meta.id, ...documentRow })
      .onConflictDoUpdate({ target: corpusDocuments.id, set: documentRow });

    for (const [index, section] of document.sections.entries()) {
      const chunkRow = {
        documentId: meta.id,
        position: section.position,
        heading: section.heading,
        text: section.text,
        outcomeCodes: section.outcomeCodes,
        embedding: embeddings[index] ?? [],
      };
      await tx
        .insert(corpusChunks)
        .values({ id: section.id, ...chunkRow })
        .onConflictDoUpdate({ target: corpusChunks.id, set: chunkRow });
    }

    await tx.delete(corpusChunks).where(
      and(
        eq(corpusChunks.documentId, meta.id),
        notInArray(
          corpusChunks.id,
          document.sections.map((section) => section.id),
        ),
      ),
    );

    for (const outcome of extractOutcomes(document)) {
      await tx
        .insert(learningOutcomes)
        .values(outcome)
        .onConflictDoUpdate({
          target: learningOutcomes.code,
          set: {
            description: outcome.description,
            grade: outcome.grade,
            strand: outcome.strand,
            subStrand: outcome.subStrand,
            chunkId: outcome.chunkId,
          },
        });
    }
  });
}

export async function ingestCorpus(
  db: Database,
  embedder: EmbeddingProvider,
  directory: string,
): Promise<IngestSummary> {
  const documents = await readCorpus(directory);
  let reembedded = 0;

  for (const document of documents) {
    if (await isUpToDate(db, document, embedder.model)) continue;
    const vectors = await embedder.embed(document.sections.map((section) => section.text));
    await storeDocument(db, document, vectors, embedder.model);
    reembedded += 1;
  }

  return {
    documents: documents.length,
    reembedded,
    chunks: documents.reduce((total, document) => total + document.sections.length, 0),
    outcomes: documents.flatMap(extractOutcomes).length,
  };
}
