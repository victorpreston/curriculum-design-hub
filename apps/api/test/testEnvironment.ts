import { loadConfig, type Config } from '../src/config';

export const DEFAULT_TEST_DATABASE_URL =
  'postgres://hub:hub_local_only@localhost:5433/curriculum_hub_test';

export function testDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
}

export function testConfig(overrides: Record<string, string> = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: testDatabaseUrl(),
    JWT_SECRET: 'test-only-secret-that-is-long-enough-123',
    LLM_PROVIDER: 'mock',
    MOCK_LLM_SCENARIO: 'ok',
    EMBEDDING_PROVIDER: 'hash',
    LLM_TIMEOUT_MS: '1000',
    GENERATIONS_PER_HOUR: '1000',
    ...overrides,
  });
}
