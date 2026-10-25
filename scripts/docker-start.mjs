import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

// Container connections use the Compose service, never the host's localhost URL.
const database = new URL('postgres://db:5432');
database.username = process.env.POSTGRES_USER || 'hub';
database.password = process.env.POSTGRES_PASSWORD || 'hub_local_only';
database.pathname = `/${process.env.POSTGRES_DB || 'curriculum_hub'}`;
process.env.DATABASE_URL = database.href;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('replace-with')) {
  const secretFile = '.docker-state/session-secret';
  mkdirSync('.docker-state', { recursive: true });
  if (!existsSync(secretFile)) {
    writeFileSync(secretFile, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
  }
  process.env.JWT_SECRET = readFileSync(secretFile, 'utf8').trim();
}

let active;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => active?.kill(signal));
}

async function run(file) {
  active = spawn(process.execPath, ['--import', 'tsx', file], {
    stdio: 'inherit',
    env: process.env,
  });
  const child = active;
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} stopped (${signal || code}).`));
    });
  });
}

try {
  await run('apps/api/src/db/migrate.ts');
  await run('apps/api/src/seed.ts');
  await run('apps/api/src/server.ts');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
