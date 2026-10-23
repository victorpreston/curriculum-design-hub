import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config';
import { createDatabase, type Database } from '../db/client';
import { createEmbeddingProvider, type EmbeddingProvider } from './embeddings';
import type { SourceScore } from '@hub/shared';
import { listOutcomesWithSourceChunk } from './outcomeRepository';
import { retrieveForOutcome } from './retrieval';

export interface OutcomeRetrievalCheck {
  code: string;
  foundOutcomeChunk: boolean;
  foundTaggedLesson: boolean;
  topSources: SourceScore[];
}

export async function evaluateRetrieval(
  db: Database,
  embedder: EmbeddingProvider,
): Promise<OutcomeRetrievalCheck[]> {
  const outcomes = await listOutcomesWithSourceChunk(db);
  const checks: OutcomeRetrievalCheck[] = [];
  for (const outcome of outcomes) {
    const retrieved = await retrieveForOutcome(db, embedder, outcome);
    checks.push({
      code: outcome.code,
      foundOutcomeChunk: retrieved.some((chunk) => chunk.chunkId === outcome.chunkId),
      foundTaggedLesson: retrieved.some(
        (chunk) => chunk.documentType === 'scheme_of_work' && chunk.text.includes(outcome.code),
      ),
      topSources: retrieved.map(({ chunkId, similarity }) => ({ chunkId, similarity })),
    });
  }
  return checks;
}

const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  const config = loadConfig();
  const { db, close } = createDatabase(config.DATABASE_URL);
  const embedder = createEmbeddingProvider(config.EMBEDDING_PROVIDER);
  try {
    const checks = await evaluateRetrieval(db, embedder);
    for (const check of checks) {
      const top = check.topSources
        .map((source) => `${source.chunkId}(${source.similarity.toFixed(2)})`)
        .join(', ');
      process.stdout.write(
        `${check.code} outcome:${check.foundOutcomeChunk ? 'yes' : 'NO'} lesson:${check.foundTaggedLesson ? 'yes' : 'NO'} | ${top}\n`,
      );
    }
    const passed = checks.filter(
      (check) => check.foundOutcomeChunk && check.foundTaggedLesson,
    ).length;
    process.stdout.write(
      `\n${passed}/${checks.length} outcomes retrieved their own outcome and a matching lesson (${embedder.model})\n`,
    );
  } finally {
    await close();
  }
}
