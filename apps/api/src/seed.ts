import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type GeneratePlanRequest } from '@hub/shared';
import { hashPassword } from './auth/session';
import { upsertUser } from './auth/userRepository';
import { loadConfig } from './config';
import { createEmbeddingProvider, type EmbeddingProvider } from './corpus/embeddings';
import { corpusDir, ingestCorpus } from './corpus/ingestCorpus';
import { createDatabase, type Database } from './db/client';
import { lessonPlans } from './db/schema';
import { generateLessonPlan, type GenerationDeps } from './generation/generationService';
import { createMockProvider } from './generation/mockProvider';
import { createLogger } from './logger';
import type { Actor } from './plans/access';
import { applyWorkflowAction } from './plans/planService';

const EXAMPLE_PLAN_AUTHOR = 'kevin@hub.test';
const EXAMPLE_PLAN_REVIEWER = 'grace@hub.test';
const PUBLISHED_EXAMPLE: GeneratePlanRequest = {
  grade: 8,
  learningOutcomeCode: 'IS8.2.2.b',
  durationMinutes: 80,
};
const SUBMITTED_EXAMPLE: GeneratePlanRequest = {
  grade: 8,
  learningOutcomeCode: 'IS8.3.1.a',
  durationMinutes: 40,
};
const SEED_TIMEOUT_MS = 10_000;
const SEED_GENERATION_LIMIT = 100;

export async function seedUsers(db: Database): Promise<Map<string, Actor>> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const actors = new Map<string, Actor>();
  for (const account of DEMO_ACCOUNTS) {
    const id = await upsertUser(db, { ...account, passwordHash });
    actors.set(account.email, { id, name: account.name, role: account.role });
  }
  return actors;
}

async function hasAnyPlans(db: Database): Promise<boolean> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(lessonPlans);
  return (row?.count ?? 0) > 0;
}

async function seedExamplePlans(
  db: Database,
  embedder: EmbeddingProvider,
  actors: Map<string, Actor>,
): Promise<void> {
  const author = actors.get(EXAMPLE_PLAN_AUTHOR);
  const reviewer = actors.get(EXAMPLE_PLAN_REVIEWER);
  if (!author || !reviewer || (await hasAnyPlans(db))) return;

  const deps: GenerationDeps = {
    db,
    embedder,
    llm: createMockProvider('ok'),
    logger: createLogger('silent'),
    timeoutMs: SEED_TIMEOUT_MS,
    generationsPerHour: SEED_GENERATION_LIMIT,
  };
  const publishedId = await generateLessonPlan(deps, author, PUBLISHED_EXAMPLE);
  await applyWorkflowAction(db, author, publishedId, 'submit');
  await applyWorkflowAction(db, reviewer, publishedId, 'approve');

  const submittedId = await generateLessonPlan(deps, author, SUBMITTED_EXAMPLE);
  await applyWorkflowAction(db, author, submittedId, 'submit');
}

async function main(): Promise<void> {
  const config = loadConfig();
  const { db, close } = createDatabase(config.DATABASE_URL);
  const embedder = createEmbeddingProvider(config.EMBEDDING_PROVIDER);
  try {
    process.stdout.write(`Ingesting corpus with ${embedder.model}...\n`);
    const summary = await ingestCorpus(db, embedder, corpusDir);
    process.stdout.write(
      `Corpus: ${summary.documents} documents, ${summary.chunks} chunks, ${summary.outcomes} outcomes (${summary.reembedded} re-embedded)\n`,
    );
    const actors = await seedUsers(db);
    await seedExamplePlans(db, embedder, actors);
    process.stdout.write(`${actors.size} demo users ready. Password: ${DEMO_PASSWORD}\n`);
  } finally {
    await close();
  }
}

const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntryPoint) await main();
