import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ENV_FILE = '.env';
const TEMPLATE_FILE = '.env.example';

if (existsSync(ENV_FILE)) {
  process.stdout.write('.env already exists, leaving it unchanged\n');
} else {
  const secret = randomBytes(32).toString('hex');
  const contents = readFileSync(TEMPLATE_FILE, 'utf8').replace(
    /^JWT_SECRET=.*$/m,
    `JWT_SECRET=${secret}`,
  );
  writeFileSync(ENV_FILE, contents);
  process.stdout.write('Created .env from .env.example with a fresh JWT_SECRET\n');
}
