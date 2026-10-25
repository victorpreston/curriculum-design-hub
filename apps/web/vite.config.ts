import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
  const apiPort =
    process.env.PORT ||
    (existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')).PORT : undefined) ||
    '4000';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': `http://127.0.0.1:${apiPort}`,
      },
    },
  };
});
