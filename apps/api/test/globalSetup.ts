import { sql } from 'drizzle-orm';
import { createHashEmbeddingProvider } from '../src/corpus/embeddings';
import { createDatabase } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { corpusDir, ingestCorpus } from '../src/corpus/ingestCorpus';
import { seedUsers } from '../src/seed';
import { testDatabaseUrl } from './testEnvironment';

export default async function setup(): Promise<void> {
  const databaseUrl = testDatabaseUrl();
  const { db, close } = createDatabase(databaseUrl);
  try {
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
  } finally {
    await close();
  }

  await runMigrations(databaseUrl);

  const seeded = createDatabase(databaseUrl);
  try {
    await ingestCorpus(seeded.db, createHashEmbeddingProvider(), corpusDir);
    await seedUsers(seeded.db);
  } finally {
    await seeded.close();
  }
}
