import path from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(__dirname, '../..');
const fileEnv = loadEnv('test', repoRoot, '');
process.env.TEST_DATABASE_URL ??= fileEnv.TEST_DATABASE_URL;

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: './test/globalSetup.ts',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
