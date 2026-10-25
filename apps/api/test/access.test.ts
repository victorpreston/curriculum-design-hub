import { DEMO_PASSWORD } from '@hub/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  LEAD,
  OTHER_TEACHER,
  TEACHER,
  createTestContext,
  draftPlan,
  submitAndApprove,
} from './helpers';

const context = createTestContext();

async function publishedPlanId(): Promise<string> {
  const teacher = await context.signIn(OTHER_TEACHER);
  const lead = await context.signIn(LEAD);
  const plan = await draftPlan(teacher);
  await submitAndApprove(teacher, lead, plan.id);
  return plan.id;
}

describe('authentication', () => {
  const protectedRoutes: [method: 'get' | 'post' | 'put', path: string][] = [
    ['get', '/api/auth/me'],
    ['get', '/api/learning-outcomes'],
    ['post', '/api/plans/generate'],
    ['get', '/api/plans/mine'],
    ['get', '/api/plans/review-queue'],
    ['get', '/api/teachers'],
    ['get', '/api/plans/bank'],
    ['get', '/api/plans/00000000-0000-4000-8000-000000000000'],
    ['put', '/api/plans/00000000-0000-4000-8000-000000000000'],
    ['post', '/api/plans/00000000-0000-4000-8000-000000000000/submit'],
    ['post', '/api/plans/00000000-0000-4000-8000-000000000000/approve'],
    ['post', '/api/plans/00000000-0000-4000-8000-000000000000/return'],
  ];

  it.each(protectedRoutes)('rejects anonymous %s %s with 401', async (method, path) => {
    const response = await request(context.app)[method](path).send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('unauthenticated');
  });

  it('rejects a forged session cookie', async () => {
    const response = await request(context.app)
      .get('/api/auth/me')
      .set('Cookie', 'hub_session=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.');
    expect(response.status).toBe(401);
  });

  it('rejects a wrong password without revealing whether the email exists', async () => {
    const wrongPassword = await request(context.app)
      .post('/api/auth/login')
      .send({ email: TEACHER, password: 'not-the-password' });
    const unknownEmail = await request(context.app)
      .post('/api/auth/login')
      .send({ email: 'nobody@hub.test', password: 'not-the-password' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('returns the full session user from /auth/me', async () => {
    const teacher = await context.signIn(TEACHER);
    const response = await teacher.get('/api/auth/me').expect(200);
    expect(response.body.user).toMatchObject({ email: TEACHER, role: 'teacher' });
  });

  it('rejects request bodies with unexpected fields', async () => {
    const teacher = await context.signIn(TEACHER);
    const response = await teacher.post('/api/plans/generate').send({
      learningOutcomeCode: 'IS8.1.2.b',
      durationMinutes: 40,
      groundingStatus: 'grounded',
    });
    expect(response.status).toBe(400);
  });

  it('issues an httpOnly SameSite=Strict session cookie', async () => {
    const response = await request(context.app)
      .post('/api/auth/login')
      .send({ email: TEACHER, password: DEMO_PASSWORD })
      .expect(200);
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });
});

describe('teacher isolation', () => {
  beforeEach(context.resetPlans);

  it("hides another teacher's draft as if it did not exist", async () => {
    const owner = await context.signIn(TEACHER);
    const other = await context.signIn(OTHER_TEACHER);
    const plan = await draftPlan(owner);

    const attempts = await Promise.all([
      other.get(`/api/plans/${plan.id}`),
      other.get(`/api/plans/${plan.id}/versions/1`),
      other.put(`/api/plans/${plan.id}`).send({ content: plan.content, expectedVersion: 1 }),
      other.post(`/api/plans/${plan.id}/submit`),
    ]);
    for (const response of attempts) {
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('not_found');
    }
  });

  it("does not list another teacher's plans in My plans", async () => {
    const owner = await context.signIn(TEACHER);
    const other = await context.signIn(OTHER_TEACHER);
    await draftPlan(owner);

    const response = await other.get('/api/plans/mine').expect(200);
    expect(response.body.plans).toHaveLength(0);
  });

  it("lets teachers read but not edit another teacher's published plan", async () => {
    const planId = await publishedPlanId();
    const reader = await context.signIn(TEACHER);

    const detail = await reader.get(`/api/plans/${planId}`).expect(200);
    const edit = await reader
      .put(`/api/plans/${planId}`)
      .send({ content: detail.body.plan.content, expectedVersion: 1 });
    expect(edit.status).toBe(403);
  });

  it('treats a malformed plan id as not found', async () => {
    const teacher = await context.signIn(TEACHER);
    await teacher.get('/api/plans/not-a-uuid').expect(404);
  });
});

describe('role checks on the server', () => {
  beforeEach(context.resetPlans);

  it('stops teachers from approving, returning or opening the review queue', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher);
    await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);

    expect((await teacher.post(`/api/plans/${plan.id}/approve`)).status).toBe(403);
    expect(
      (await teacher.post(`/api/plans/${plan.id}/return`).send({ comment: 'Looks fine' })).status,
    ).toBe(403);
    expect((await teacher.get('/api/plans/review-queue')).status).toBe(403);
  });

  it('stops curriculum leads from generating or editing plans', async () => {
    const teacher = await context.signIn(TEACHER);
    const lead = await context.signIn(LEAD);
    const plan = await draftPlan(teacher);
    await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);

    expect(
      (
        await lead
          .post('/api/plans/generate')
          .send({ learningOutcomeCode: 'IS8.1.1.a', durationMinutes: 40 })
      ).status,
    ).toBe(403);
    expect(
      (await lead.put(`/api/plans/${plan.id}`).send({ content: plan.content, expectedVersion: 1 }))
        .status,
    ).toBe(403);
  });

  it('gives curriculum leads a teacher activity summary but not teachers', async () => {
    const teacher = await context.signIn(TEACHER);
    const lead = await context.signIn(LEAD);
    await draftPlan(teacher);

    expect((await teacher.get('/api/teachers')).status).toBe(403);
    const response = await lead.get('/api/teachers').expect(200);
    expect(response.body.teachers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: TEACHER, name: 'Amina Odhiambo' }),
        expect.objectContaining({ email: OTHER_TEACHER, name: 'Kevin Mutua' }),
      ]),
    );
    expect(
      response.body.teachers.find((item: { email: string }) => item.email === TEACHER)
        .lastActivityAt,
    ).toEqual(expect.any(String));
  });

  it('keeps drafts out of sight of curriculum leads until submitted', async () => {
    const teacher = await context.signIn(TEACHER);
    const lead = await context.signIn(LEAD);
    const plan = await draftPlan(teacher);

    expect((await lead.get(`/api/plans/${plan.id}`)).status).toBe(404);
    expect((await lead.post(`/api/plans/${plan.id}/approve`)).status).toBe(404);

    await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);
    await lead.get(`/api/plans/${plan.id}`).expect(200);
  });
});
