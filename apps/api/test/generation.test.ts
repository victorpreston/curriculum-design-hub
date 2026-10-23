import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { citedSourceIds, type PlanDetailDto } from '@hub/shared';
import { generations } from '../src/db/schema';
import type { LlmProvider } from '../src/generation/llmProvider';
import { DEFAULT_GENERATION, TEACHER, createTestContext, draftPlan } from './helpers';

const context = createTestContext({ config: { LLM_TIMEOUT_MS: '300' } });

async function planCount(): Promise<number> {
  const result = await context.db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM lesson_plans`,
  );
  return result.rows[0]?.count ?? 0;
}

async function lastGeneration() {
  const [row] = await context.db
    .select()
    .from(generations)
    .orderBy(sql`${generations.createdAt} DESC`)
    .limit(1);
  return row;
}

function expectCitationsWithinSources(plan: PlanDetailDto) {
  const retrieved = new Set(plan.sources.map((source) => source.chunkId));
  for (const id of citedSourceIds(plan.content)) expect(retrieved.has(id)).toBe(true);
}

describe('grounded generation', () => {
  beforeEach(context.resetPlans);

  it('drafts a schema-valid plan that cites only retrieved curriculum chunks', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher);

    expect(plan.status).toBe('draft');
    expect(plan.currentVersion).toBe(1);
    expect(plan.sources.length).toBeGreaterThan(0);
    expect(plan.sources.some((source) => source.cited)).toBe(true);
    expect(plan.grounding.validCitationCount).toBeGreaterThan(0);
    expect(plan.grounding.status).not.toBe('ungrounded');
    expectCitationsWithinSources(plan);
    expect(plan.generation?.attempts).toBe(1);
  });

  it('retrieves the selected outcome itself among the sources', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher, { learningOutcomeCode: 'IS8.2.2.b' });
    expect(plan.sources.map((source) => source.chunkId)).toContain('lo-strand-2#is8-2-2-b');
  });

  it('repairs invalid output by retrying with the validation errors', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher, { simulate: 'invalid_then_ok' });
    expect(plan.generation?.attempts).toBe(2);
  });

  it('gives up with a clear error and saves nothing when output stays invalid JSON', async () => {
    const teacher = await context.signIn(TEACHER);
    const response = await teacher
      .post('/api/plans/generate')
      .send({ ...DEFAULT_GENERATION, simulate: 'invalid_json' });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('generation_invalid_output');
    expect(response.body.error.details.attempts).toBe(2);
    expect(await planCount()).toBe(0);
    const logged = await lastGeneration();
    expect(logged?.succeeded).toBe(false);
    expect(logged?.failureCode).toBe('invalid_output');
  });

  it('reports which schema rules the model broke', async () => {
    const teacher = await context.signIn(TEACHER);
    const response = await teacher
      .post('/api/plans/generate')
      .send({ ...DEFAULT_GENERATION, simulate: 'schema_violation' });

    expect(response.status).toBe(502);
    expect(response.body.error.details.problems.join(' ')).toContain('mainActivities');
    expect(await planCount()).toBe(0);
  });

  it('flags a plan with no citations as ungrounded instead of returning it silently', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher, { simulate: 'uncited' });

    expect(plan.groundingStatus).toBe('ungrounded');
    expect(plan.grounding.validCitationCount).toBe(0);
    expect(plan.grounding.notes.join(' ')).toContain('No section cites');
  });

  it('removes citations to chunks that were never retrieved', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher, { simulate: 'fabricated_citation' });

    expect(plan.groundingStatus).toBe('weak');
    expect(plan.grounding.removedCitationIds).toEqual([
      'sow-imaginary-topic#lesson-9',
      'assess-unknown#item-7',
    ]);
    expect(citedSourceIds(plan.content)).not.toContain('sow-imaginary-topic#lesson-9');
    expectCitationsWithinSources(plan);
  });

  it('times out slow responses with a clear error and saves nothing', async () => {
    const teacher = await context.signIn(TEACHER);
    const response = await teacher
      .post('/api/plans/generate')
      .send({ ...DEFAULT_GENERATION, simulate: 'timeout' });

    expect(response.status).toBe(504);
    expect(response.body.error.code).toBe('generation_timeout');
    expect(await planCount()).toBe(0);
    expect((await lastGeneration())?.failureCode).toBe('timeout');
  });

  it('reports an unavailable provider and saves nothing', async () => {
    const teacher = await context.signIn(TEACHER);
    const response = await teacher
      .post('/api/plans/generate')
      .send({ ...DEFAULT_GENERATION, simulate: 'provider_error' });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('generation_unavailable');
    expect(await planCount()).toBe(0);
  });

  it('rejects an unknown learning outcome', async () => {
    const teacher = await context.signIn(TEACHER);
    const response = await teacher
      .post('/api/plans/generate')
      .send({ learningOutcomeCode: 'IS9.9.9.z', durationMinutes: 40 });
    expect(response.status).toBe(400);
  });

  it('rejects durations outside the allowed range', async () => {
    const teacher = await context.signIn(TEACHER);
    const response = await teacher
      .post('/api/plans/generate')
      .send({ ...DEFAULT_GENERATION, durationMinutes: 5 });
    expect(response.status).toBe(400);
  });
});

describe('generation safeguards', () => {
  const realProvider: LlmProvider = {
    name: 'anthropic',
    model: 'test-double',
    async complete() {
      throw new Error('should not be called');
    },
  };
  const realProviderContext = createTestContext({ llm: realProvider });
  const limitedContext = createTestContext({ config: { GENERATIONS_PER_HOUR: '1' } });

  beforeEach(context.resetPlans);

  it('refuses failure simulation when a real provider is configured', async () => {
    const teacher = await realProviderContext.signIn(TEACHER);
    const response = await teacher
      .post('/api/plans/generate')
      .send({ ...DEFAULT_GENERATION, simulate: 'timeout' });
    expect(response.status).toBe(400);
  });

  it('limits how many drafts a teacher can generate per hour', async () => {
    const teacher = await limitedContext.signIn(TEACHER);
    await draftPlan(teacher);
    const response = await teacher.post('/api/plans/generate').send(DEFAULT_GENERATION);
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('rate_limited');
  });
});
