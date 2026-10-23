import { beforeEach, describe, expect, it } from 'vitest';
import type { LessonPlanContent, PlanDetailDto } from '@hub/shared';
import { LEAD, TEACHER, createTestContext, draftPlan, type Agent } from './helpers';

const context = createTestContext();

function editedContent(plan: PlanDetailDto, title: string): LessonPlanContent {
  return { ...plan.content, title };
}

function save(
  agent: Agent,
  plan: PlanDetailDto,
  content: LessonPlanContent,
  expectedVersion: number,
) {
  return agent
    .put(`/api/plans/${plan.id}`)
    .send({ content, expectedVersion, changeNote: 'Teacher edit' });
}

describe('lesson plan workflow', () => {
  beforeEach(context.resetPlans);

  it('runs draft → submitted → returned → submitted → published and records every step', async () => {
    const teacher = await context.signIn(TEACHER);
    const lead = await context.signIn(LEAD);
    const plan = await draftPlan(teacher);
    expect(plan.status).toBe('draft');

    await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);
    const queue = await lead.get('/api/plans/review-queue').expect(200);
    expect(queue.body.plans.map((queued: { id: string }) => queued.id)).toContain(plan.id);

    const returned = await lead
      .post(`/api/plans/${plan.id}/return`)
      .send({ comment: 'Add a safety note for the wood ash test.' })
      .expect(200);
    expect(returned.body.plan.status).toBe('returned');

    await save(
      teacher,
      plan,
      editedContent(plan, 'Acids and bases at home, with safety notes'),
      1,
    ).expect(200);
    await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);
    const approved = await lead.post(`/api/plans/${plan.id}/approve`).expect(200);

    expect(approved.body.plan.status).toBe('published');
    expect(approved.body.plan.reviews.map((review: { action: string }) => review.action)).toEqual([
      'submit',
      'return',
      'submit',
      'approve',
    ]);
    expect(approved.body.plan.reviews[1].comment).toBe('Add a safety note for the wood ash test.');

    const bank = await teacher.get('/api/plans/bank').expect(200);
    expect(bank.body.plans.map((published: { id: string }) => published.id)).toContain(plan.id);
  });

  it('keeps every previous version when a teacher edits', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher);

    await save(teacher, plan, editedContent(plan, 'Second title'), 1).expect(200);
    const third = await save(teacher, plan, editedContent(plan, 'Third title'), 2).expect(200);

    expect(third.body.plan.currentVersion).toBe(3);
    expect(third.body.plan.versions.map((version: { version: number }) => version.version)).toEqual(
      [3, 2, 1],
    );
    const original = await teacher.get(`/api/plans/${plan.id}/versions/1`).expect(200);
    expect(original.body.version.content.title).toBe(plan.content.title);
  });

  it('rejects a save based on a stale version', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher);
    await save(teacher, plan, editedContent(plan, 'First edit'), 1).expect(200);

    const stale = await save(teacher, plan, editedContent(plan, 'Edit from an old tab'), 1);
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('version_conflict');
  });

  it('rejects edits whose activity timings do not fit the lesson', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher);
    const content = { ...plan.content, starter: { ...plan.content.starter, durationMinutes: 30 } };

    const response = await save(teacher, plan, content, 1);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('the lesson is 40 minutes');
  });

  it('rejects edits that break the lesson plan schema', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher);
    const response = await teacher
      .put(`/api/plans/${plan.id}`)
      .send({ content: { ...plan.content, mainActivities: [] }, expectedVersion: 1 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
  });

  it('strips citations a teacher adds that were not retrieved for the plan', async () => {
    const teacher = await context.signIn(TEACHER);
    const plan = await draftPlan(teacher);
    const content = {
      ...plan.content,
      starter: {
        ...plan.content.starter,
        sourceIds: [...plan.content.starter.sourceIds, 'sow-cells#lesson-4'],
      },
    };

    const response = await save(teacher, plan, content, 1).expect(200);
    expect(response.body.plan.content.starter.sourceIds).not.toContain('sow-cells#lesson-4');
    expect(response.body.plan.grounding.removedCitationIds).toEqual(['sow-cells#lesson-4']);
  });

  describe('invalid transitions are rejected by the server', () => {
    it('cannot submit a plan twice', async () => {
      const teacher = await context.signIn(TEACHER);
      const plan = await draftPlan(teacher);
      await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);

      const again = await teacher.post(`/api/plans/${plan.id}/submit`);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('invalid_transition');
    });

    it('cannot edit a submitted plan', async () => {
      const teacher = await context.signIn(TEACHER);
      const plan = await draftPlan(teacher);
      await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);

      const response = await save(teacher, plan, editedContent(plan, 'Sneaky edit'), 1);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('not_editable');
    });

    it('cannot edit or re-review a published plan', async () => {
      const teacher = await context.signIn(TEACHER);
      const lead = await context.signIn(LEAD);
      const plan = await draftPlan(teacher);
      await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);
      await lead.post(`/api/plans/${plan.id}/approve`).expect(200);

      expect((await save(teacher, plan, editedContent(plan, 'Late edit'), 1)).status).toBe(409);
      expect((await lead.post(`/api/plans/${plan.id}/approve`)).status).toBe(409);
      expect(
        (await lead.post(`/api/plans/${plan.id}/return`).send({ comment: 'Changed my mind' }))
          .status,
      ).toBe(409);
    });

    it('cannot approve a returned plan until it is resubmitted', async () => {
      const teacher = await context.signIn(TEACHER);
      const lead = await context.signIn(LEAD);
      const plan = await draftPlan(teacher);
      await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);
      await lead
        .post(`/api/plans/${plan.id}/return`)
        .send({ comment: 'Needs timings' })
        .expect(200);

      const response = await lead.post(`/api/plans/${plan.id}/approve`);
      expect(response.status).toBe(409);
    });

    it('requires a comment when returning a plan', async () => {
      const teacher = await context.signIn(TEACHER);
      const lead = await context.signIn(LEAD);
      const plan = await draftPlan(teacher);
      await teacher.post(`/api/plans/${plan.id}/submit`).expect(200);

      const response = await lead.post(`/api/plans/${plan.id}/return`).send({ comment: '' });
      expect(response.status).toBe(400);
      const stillSubmitted = await lead.get(`/api/plans/${plan.id}`).expect(200);
      expect(stillSubmitted.body.plan.status).toBe('submitted');
    });

    it('blocks submitting a plan with no curriculum grounding', async () => {
      const teacher = await context.signIn(TEACHER);
      const plan = await draftPlan(teacher, { simulate: 'uncited' });
      expect(plan.groundingStatus).toBe('ungrounded');

      const response = await teacher.post(`/api/plans/${plan.id}/submit`);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('ungrounded_submission');
    });
  });
});
