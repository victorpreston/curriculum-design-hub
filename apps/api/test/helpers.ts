import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll } from 'vitest';
import { DEMO_PASSWORD, type GeneratePlanRequest, type PlanDetailDto } from '@hub/shared';
import { createApp } from '../src/app';
import { createHashEmbeddingProvider } from '../src/corpus/embeddings';
import { createDatabase } from '../src/db/client';
import type { LlmProvider } from '../src/generation/llmProvider';
import { createLogger } from '../src/logger';
import { createLlmProvider } from '../src/providers';
import { testConfig } from './testEnvironment';

export const TEACHER = 'amina@hub.test';
export const OTHER_TEACHER = 'kevin@hub.test';
export const LEAD = 'grace@hub.test';

export const DEFAULT_GENERATION: GeneratePlanRequest = {
  grade: 8,
  learningOutcomeCode: 'IS8.1.2.b',
  durationMinutes: 40,
};

export function createTestContext(
  options: { config?: Record<string, string>; llm?: LlmProvider } = {},
) {
  const config = testConfig(options.config);
  const { db, close } = createDatabase(config.DATABASE_URL);
  const app = createApp({
    db,
    config,
    llm: options.llm ?? createLlmProvider(config),
    embedder: createHashEmbeddingProvider(),
    logger: createLogger('silent'),
  });

  afterAll(close);

  async function signIn(email: string) {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email, password: DEMO_PASSWORD }).expect(200);
    return agent;
  }

  async function resetPlans() {
    await db.execute(sql`TRUNCATE review_events, lesson_plan_versions, lesson_plans, generations`);
  }

  return { app, db, config, signIn, resetPlans };
}

export type Agent = Awaited<ReturnType<ReturnType<typeof createTestContext>['signIn']>>;

export async function draftPlan(
  agent: Agent,
  overrides: Partial<GeneratePlanRequest> = {},
): Promise<PlanDetailDto> {
  const response = await agent
    .post('/api/plans/generate')
    .send({ ...DEFAULT_GENERATION, ...overrides })
    .expect(201);
  return response.body.plan as PlanDetailDto;
}

export async function submitAndApprove(teacher: Agent, lead: Agent, planId: string): Promise<void> {
  await teacher.post(`/api/plans/${planId}/submit`).expect(200);
  await lead.post(`/api/plans/${planId}/approve`).expect(200);
}
