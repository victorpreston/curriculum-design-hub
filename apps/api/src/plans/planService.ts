import {
  WORKFLOW_RULES,
  citedSourceIds,
  isEditable,
  validateLessonPlan,
  type GroundingReport,
  type LessonPlanContent,
  type PlanDetailDto,
  type PlanSummaryDto,
  type PlanVersionDetailDto,
  type SavePlanRequest,
  type WorkflowAction,
} from '@hub/shared';
import type { Database, Executor, Transaction } from '../db/client';
import { loadChunks } from '../corpus/retrieval';
import {
  ForbiddenError,
  InvalidTransitionError,
  NotEditableError,
  NotFoundError,
  UngroundedSubmissionError,
  ValidationFailedError,
  VersionConflictError,
} from '../errors';
import { assessGrounding } from '../generation/grounding';
import { canViewPlan, isOwner, type Actor } from './access';
import * as plans from './planRepository';

const PLAN_NOT_FOUND = 'Lesson plan not found.';

function assertViewable(actor: Actor, plan: plans.PlanRow | null): plans.PlanRow {
  if (!plan || !canViewPlan(actor, plan)) throw new NotFoundError(PLAN_NOT_FOUND);
  return plan;
}

async function requireViewablePlan(db: Executor, actor: Actor, planId: string) {
  return assertViewable(actor, await plans.findPlanRow(db, planId));
}

async function lockViewablePlan(tx: Transaction, actor: Actor, planId: string) {
  return assertViewable(actor, await plans.lockPlanRow(tx, planId));
}

export interface NewDraft {
  owner: Actor;
  learningOutcomeCode: string;
  durationMinutes: number;
  generationId: string;
  content: LessonPlanContent;
  grounding: GroundingReport;
  changeNote: string;
}

export async function createDraftFromGeneration(tx: Transaction, draft: NewDraft): Promise<string> {
  const planId = await plans.insertPlan(tx, {
    ownerId: draft.owner.id,
    learningOutcomeCode: draft.learningOutcomeCode,
    generationId: draft.generationId,
    durationMinutes: draft.durationMinutes,
    title: draft.content.title,
    status: 'draft',
    groundingStatus: draft.grounding.status,
    currentVersion: 1,
  });
  await plans.insertPlanVersion(tx, {
    planId,
    version: 1,
    content: draft.content,
    grounding: draft.grounding,
    authorId: draft.owner.id,
    changeNote: draft.changeNote,
  });
  return planId;
}

export async function getPlanDetail(
  db: Database,
  actor: Actor,
  planId: string,
): Promise<PlanDetailDto> {
  const plan = await requireViewablePlan(db, actor, planId);
  const [summary, current, versions, reviews, generation] = await Promise.all([
    plans.findPlanSummary(db, planId),
    plans.findPlanVersion(db, planId, plan.currentVersion),
    plans.listPlanVersions(db, planId),
    plans.listReviewEvents(db, planId),
    plans.findGeneration(db, plan.generationId),
  ]);
  if (!summary || !current || !generation) throw new NotFoundError(PLAN_NOT_FOUND);

  const cited = new Set(citedSourceIds(current.content));
  const sources = await loadChunks(db, generation.retrievedSources);

  return {
    ...summary,
    content: current.content,
    grounding: current.grounding,
    sources: sources.map((source) => ({ ...source, cited: cited.has(source.chunkId) })),
    versions: versions.map((version) => ({
      version: version.version,
      authorName: version.authorName,
      changeNote: version.changeNote,
      groundingStatus: version.grounding.status,
      createdAt: version.createdAt.toISOString(),
    })),
    reviews: reviews.map((review) => ({ ...review, createdAt: review.createdAt.toISOString() })),
    generation: {
      provider: generation.provider,
      model: generation.model,
      attempts: generation.attempts,
      latencyMs: generation.latencyMs,
      inputTokens: generation.inputTokens,
      outputTokens: generation.outputTokens,
      estimatedCostUsd: generation.estimatedCostUsd,
    },
  };
}

export async function getPlanVersion(
  db: Database,
  actor: Actor,
  planId: string,
  version: number,
): Promise<PlanVersionDetailDto> {
  await requireViewablePlan(db, actor, planId);
  const row = await plans.findPlanVersion(db, planId, version);
  if (!row) throw new NotFoundError('Version not found.');
  return {
    version: row.version,
    authorName: row.authorName,
    changeNote: row.changeNote,
    groundingStatus: row.grounding.status,
    createdAt: row.createdAt.toISOString(),
    content: row.content,
  };
}

export function listOwnPlans(db: Database, actor: Actor): Promise<PlanSummaryDto[]> {
  return plans.listPlanSummaries(db, plans.planFilters.ownedBy(actor.id), 'newest');
}

export function listReviewQueue(db: Database): Promise<PlanSummaryDto[]> {
  return plans.listPlanSummaries(db, plans.planFilters.inStatus('submitted'), 'oldest');
}

export function listLessonBank(db: Database, outcomeCode?: string): Promise<PlanSummaryDto[]> {
  return plans.listPlanSummaries(db, plans.planFilters.publishedFor(outcomeCode), 'newest');
}

export async function savePlanVersion(
  db: Database,
  actor: Actor,
  planId: string,
  request: SavePlanRequest,
  weakSimilarityThreshold: number,
): Promise<number> {
  return db.transaction(async (tx) => {
    const plan = await lockViewablePlan(tx, actor, planId);
    if (!isOwner(actor, plan))
      throw new ForbiddenError('Only the teacher who owns this plan can edit it.');
    if (!isEditable(plan.status)) {
      throw new NotEditableError(`A ${plan.status} plan cannot be edited.`);
    }
    if (request.expectedVersion !== plan.currentVersion)
      throw new VersionConflictError(plan.currentVersion);

    const validation = validateLessonPlan(request.content, plan.durationMinutes);
    if (!validation.ok) throw new ValidationFailedError(validation.problems.join(' '));

    const generation = await plans.findGeneration(tx, plan.generationId);
    if (!generation) throw new NotFoundError(PLAN_NOT_FOUND);
    const grounding = assessGrounding(
      validation.content,
      generation.retrievedSources,
      weakSimilarityThreshold,
    );

    const nextVersion = plan.currentVersion + 1;
    await plans.insertPlanVersion(tx, {
      planId,
      version: nextVersion,
      content: grounding.content,
      grounding: grounding.report,
      authorId: actor.id,
      changeNote: request.changeNote || null,
    });
    await plans.updatePlan(tx, planId, {
      title: grounding.content.title,
      groundingStatus: grounding.report.status,
      currentVersion: nextVersion,
    });
    return nextVersion;
  });
}

export async function applyWorkflowAction(
  db: Database,
  actor: Actor,
  planId: string,
  action: WorkflowAction,
  comment?: string,
): Promise<void> {
  const rule = WORKFLOW_RULES[action];
  await db.transaction(async (tx) => {
    const plan = await lockViewablePlan(tx, actor, planId);
    if (actor.role !== rule.role) throw new ForbiddenError();
    if (rule.ownerOnly && !isOwner(actor, plan)) {
      throw new ForbiddenError('Only the teacher who owns this plan can do that.');
    }
    if (!rule.from.includes(plan.status)) {
      throw new InvalidTransitionError(`Cannot ${action} a plan that is ${plan.status}.`);
    }
    if (rule.commentRequired && !comment) {
      throw new ValidationFailedError(`A comment is required to ${action} a plan.`);
    }
    if (rule.requiresGrounding && plan.groundingStatus === 'ungrounded') {
      throw new UngroundedSubmissionError();
    }

    await plans.updatePlan(tx, planId, {
      status: rule.to,
      publishedAt: rule.to === 'published' ? new Date() : plan.publishedAt,
    });
    await plans.insertReviewEvent(tx, {
      planId,
      actorId: actor.id,
      action,
      fromStatus: plan.status,
      toStatus: rule.to,
      comment: comment ?? null,
    });
  });
}
