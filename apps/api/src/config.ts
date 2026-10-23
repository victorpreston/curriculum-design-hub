import { z } from 'zod';
import { MOCK_SCENARIOS } from '@hub/shared';

const PLACEHOLDER_SECRET_PREFIX = 'replace-with';

const ConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters')
      .refine((secret) => !secret.startsWith(PLACEHOLDER_SECRET_PREFIX), {
        message:
          'JWT_SECRET still has the .env.example placeholder; run node scripts/ensure-env.mjs',
      }),
    LLM_PROVIDER: z.enum(['mock', 'anthropic']).default('mock'),
    MOCK_LLM_SCENARIO: z.enum(MOCK_SCENARIOS).default('ok'),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
    ANTHROPIC_EFFORT: z.enum(['low', 'medium', 'high']).default('medium'),
    LLM_TIMEOUT_MS: z.coerce.number().int().min(100).default(90_000),
    EMBEDDING_PROVIDER: z.enum(['local', 'hash']).default('local'),
    GENERATIONS_PER_HOUR: z.coerce.number().int().min(1).default(30),
  })
  .refine((config) => config.LLM_PROVIDER !== 'anthropic' || Boolean(config.ANTHROPIC_API_KEY), {
    message: 'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic',
    path: ['ANTHROPIC_API_KEY'],
  });

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid configuration:\n${problems.join('\n')}`);
  }
  return parsed.data;
}
