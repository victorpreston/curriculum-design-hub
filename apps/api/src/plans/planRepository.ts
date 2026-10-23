import { and, asc, desc, eq, gte, sql, type SQL } from 'drizzle-orm';
import type { PlanStatus, PlanSummaryDto } from '@hub/shared';
import type { Executor } from '../db/client';
import {
  generations,
  learningOutcomes,
  lessonPlans,
  lessonPlanVersions,
  reviewEvents,
  users,
} from '../db/schema';

export type PlanRow = typeof lessonPlans.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type NewPlan = typeof lessonPlans.$inferInsert;
export type NewPlanVersion = typeof lessonPlanVersions.$inferInsert;
export type NewReviewEvent = typeof reviewEvents.$inferInsert;

const summaryColumns = {
  id: lessonPlans.id,
  title: lessonPlans.title,
  status: lessonPlans.status,
  groundingStatus: lessonPlans.groundingStatus,
  durationMinutes: lessonPlans.durationMinutes,
  currentVersion: lessonPlans.currentVersion,
  updatedAt: lessonPlans.updatedAt,
  ownerId: lessonPlans.ownerId,
  ownerName: users.name,
  outcomeCode: learningOutcomes.code,
  outcomeDescription: learningOutcomes.description,
  outcomeGrade: learningOutcomes.grade,
};

type SummaryRow = Awaited<ReturnType<typeof selectSummaries>>[number];

function toSummary(row: SummaryRow): PlanSummaryDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    groundingStatus: row.groundingStatus,
    durationMinutes: row.durationMinutes,
    currentVersion: row.currentVersion,
    updatedAt: row.updatedAt.toISOString(),
    owner: { id: row.ownerId, name: row.ownerName },
    learningOutcome: {
      code: row.outcomeCode,
      description: row.outcomeDescription,
      grade: row.outcomeGrade as PlanSummaryDto['learningOutcome']['grade'],
    },
  };
}

function selectSummaries(db: Executor) {
  return db
    .select(summaryColumns)
    .from(lessonPlans)
    .innerJoin(users, eq(lessonPlans.ownerId, users.id))
    .innerJoin(learningOutcomes, eq(lessonPlans.learningOutcomeCode, learningOutcomes.code));
}

export async function findPlanSummary(
  db: Executor,
  planId: string,
): Promise<PlanSummaryDto | null> {
  const [row] = await selectSummaries(db).where(eq(lessonPlans.id, planId));
  return row ? toSummary(row) : null;
}

export async function listPlanSummaries(
  db: Executor,
  where: SQL | undefined,
  order: 'newest' | 'oldest',
): Promise<PlanSummaryDto[]> {
  const rows = await selectSummaries(db)
    .where(where)
    .orderBy(order === 'newest' ? desc(lessonPlans.updatedAt) : asc(lessonPlans.updatedAt));
  return rows.map(toSummary);
}

export const planFilters = {
  ownedBy: (ownerId: string) => eq(lessonPlans.ownerId, ownerId),
  inStatus: (status: PlanStatus) => eq(lessonPlans.status, status),
  publishedFor: (outcomeCode: string | undefined) =>
    outcomeCode
      ? and(eq(lessonPlans.status, 'published'), eq(lessonPlans.learningOutcomeCode, outcomeCode))
      : eq(lessonPlans.status, 'published'),
};

export async function findPlanRow(db: Executor, planId: string): Promise<PlanRow | null> {
  const [row] = await db.select().from(lessonPlans).where(eq(lessonPlans.id, planId));
  return row ?? null;
}

export async function lockPlanRow(db: Executor, planId: string): Promise<PlanRow | null> {
  const [row] = await db.select().from(lessonPlans).where(eq(lessonPlans.id, planId)).for('update');
  return row ?? null;
}

export async function insertGeneration(db: Executor, generation: NewGeneration): Promise<string> {
  const [row] = await db.insert(generations).values(generation).returning({ id: generations.id });
  if (!row) throw new Error('Generation insert returned no row');
  return row.id;
}

export async function findGeneration(db: Executor, generationId: string) {
  const [row] = await db.select().from(generations).where(eq(generations.id, generationId));
  return row ?? null;
}

export async function countRecentGenerations(
  db: Executor,
  userId: string,
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generations)
    .where(and(eq(generations.userId, userId), gte(generations.createdAt, since)));
  return row?.count ?? 0;
}

export async function insertPlan(db: Executor, plan: NewPlan): Promise<string> {
  const [row] = await db.insert(lessonPlans).values(plan).returning({ id: lessonPlans.id });
  if (!row) throw new Error('Plan insert returned no row');
  return row.id;
}

export async function updatePlan(
  db: Executor,
  planId: string,
  changes: Partial<NewPlan>,
): Promise<void> {
  await db
    .update(lessonPlans)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(lessonPlans.id, planId));
}

export async function insertPlanVersion(db: Executor, version: NewPlanVersion): Promise<void> {
  await db.insert(lessonPlanVersions).values(version);
}

export async function findPlanVersion(db: Executor, planId: string, version: number) {
  const [row] = await db
    .select({
      version: lessonPlanVersions.version,
      content: lessonPlanVersions.content,
      grounding: lessonPlanVersions.grounding,
      changeNote: lessonPlanVersions.changeNote,
      createdAt: lessonPlanVersions.createdAt,
      authorName: users.name,
    })
    .from(lessonPlanVersions)
    .innerJoin(users, eq(lessonPlanVersions.authorId, users.id))
    .where(and(eq(lessonPlanVersions.planId, planId), eq(lessonPlanVersions.version, version)));
  return row ?? null;
}

export async function listPlanVersions(db: Executor, planId: string) {
  return db
    .select({
      version: lessonPlanVersions.version,
      grounding: lessonPlanVersions.grounding,
      changeNote: lessonPlanVersions.changeNote,
      createdAt: lessonPlanVersions.createdAt,
      authorName: users.name,
    })
    .from(lessonPlanVersions)
    .innerJoin(users, eq(lessonPlanVersions.authorId, users.id))
    .where(eq(lessonPlanVersions.planId, planId))
    .orderBy(desc(lessonPlanVersions.version));
}

export async function insertReviewEvent(db: Executor, event: NewReviewEvent): Promise<void> {
  await db.insert(reviewEvents).values(event);
}

export async function listReviewEvents(db: Executor, planId: string) {
  return db
    .select({
      action: reviewEvents.action,
      fromStatus: reviewEvents.fromStatus,
      toStatus: reviewEvents.toStatus,
      comment: reviewEvents.comment,
      createdAt: reviewEvents.createdAt,
      actorName: users.name,
    })
    .from(reviewEvents)
    .innerJoin(users, eq(reviewEvents.actorId, users.id))
    .where(eq(reviewEvents.planId, planId))
    .orderBy(asc(reviewEvents.createdAt));
}
