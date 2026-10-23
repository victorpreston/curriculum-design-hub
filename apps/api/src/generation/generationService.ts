import type { GeneratePlanRequest, LessonPlanContent, SourceScore } from '@hub/shared';
import type { EmbeddingProvider } from '../corpus/embeddings';
import { findLearningOutcome } from '../corpus/outcomeRepository';
import { retrieveForOutcome } from '../corpus/retrieval';
import type { Database } from '../db/client';
import {
  GenerationInvalidOutputError,
  GenerationRefusedError,
  GenerationTimeoutError,
  GenerationUnavailableError,
  NoCurriculumMatchError,
  RateLimitedError,
  ValidationFailedError,
  type DomainError,
} from '../errors';
import type { Logger } from '../logger';
import type { Actor } from '../plans/access';
import * as plans from '../plans/planRepository';
import { createDraftFromGeneration } from '../plans/planService';
import { assessGrounding } from './grounding';
import { LlmCallError, type GenerationContext, type LlmProvider } from './llmProvider';
import { parseLessonPlan } from './parseModelOutput';
import { estimateCostUsd } from './pricing';
import { SYSTEM_PROMPT, conversationForAttempt } from './prompt';

export const MAX_GENERATION_ATTEMPTS = 2;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export interface GenerationDeps {
  db: Database;
  llm: LlmProvider;
  embedder: EmbeddingProvider;
  logger: Logger;
  timeoutMs: number;
  generationsPerHour: number;
}

interface Usage {
  attempts: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

type AttemptsOutcome =
  | { kind: 'valid'; content: LessonPlanContent; usage: Usage }
  | { kind: 'invalid'; problems: string[]; usage: Usage }
  | { kind: 'call_failed'; error: LlmCallError; usage: Usage };

interface GenerationRun {
  actor: Actor;
  request: GeneratePlanRequest;
  retrievedSources: SourceScore[];
  startedAt: number;
}

function toDomainError(error: LlmCallError, timeoutMs: number): DomainError {
  if (error.kind === 'timeout') return new GenerationTimeoutError(timeoutMs);
  if (error.kind === 'refused') return new GenerationRefusedError();
  return new GenerationUnavailableError(error.reason);
}

async function callUntilValid(
  deps: GenerationDeps,
  context: GenerationContext,
  request: GeneratePlanRequest,
): Promise<AttemptsOutcome> {
  let usage: Usage = { attempts: 0, model: deps.llm.model, inputTokens: 0, outputTokens: 0 };
  let previous: { response: string; problems: string[] } | null = null;

  while (usage.attempts < MAX_GENERATION_ATTEMPTS) {
    const attempt = usage.attempts + 1;
    try {
      const completion = await deps.llm.complete({
        system: SYSTEM_PROMPT,
        messages: conversationForAttempt(context, previous),
        context,
        attempt,
        scenario: request.simulate,
        signal: AbortSignal.timeout(deps.timeoutMs),
      });
      usage = {
        attempts: attempt,
        model: completion.model,
        inputTokens: usage.inputTokens + completion.inputTokens,
        outputTokens: usage.outputTokens + completion.outputTokens,
      };
      const parsed = parseLessonPlan(completion.text, context.durationMinutes);
      if (parsed.ok) return { kind: 'valid', content: parsed.content, usage };
      deps.logger.warn({ attempt, problems: parsed.problems }, 'lesson plan output rejected');
      previous = { response: completion.text, problems: parsed.problems };
    } catch (error) {
      if (!(error instanceof LlmCallError)) throw error;
      return { kind: 'call_failed', error, usage: { ...usage, attempts: attempt } };
    }
  }

  return { kind: 'invalid', problems: previous?.problems ?? [], usage };
}

function generationRecord(
  deps: GenerationDeps,
  run: GenerationRun,
  usage: Usage,
  outcome: { succeeded: boolean; failureCode?: string; failureDetail?: string },
) {
  return {
    userId: run.actor.id,
    learningOutcomeCode: run.request.learningOutcomeCode,
    durationMinutes: run.request.durationMinutes,
    provider: deps.llm.name,
    model: usage.model,
    attempts: usage.attempts,
    latencyMs: Date.now() - run.startedAt,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    estimatedCostUsd: estimateCostUsd(usage.model, usage.inputTokens, usage.outputTokens),
    retrievedSources: run.retrievedSources,
    ...outcome,
  };
}

async function recordFailure(
  deps: GenerationDeps,
  run: GenerationRun,
  usage: Usage,
  failureCode: string,
  failureDetail: string,
): Promise<void> {
  await plans.insertGeneration(
    deps.db,
    generationRecord(deps, run, usage, { succeeded: false, failureCode, failureDetail }),
  );
  deps.logger.warn({ failureCode, failureDetail, ...usage }, 'lesson plan generation failed');
}

async function enforceRateLimit(deps: GenerationDeps, actor: Actor): Promise<void> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recent = await plans.countRecentGenerations(deps.db, actor.id, since);
  if (recent >= deps.generationsPerHour) throw new RateLimitedError(deps.generationsPerHour);
}

export async function generateLessonPlan(
  deps: GenerationDeps,
  actor: Actor,
  request: GeneratePlanRequest,
): Promise<string> {
  if (request.simulate && deps.llm.name !== 'mock') {
    throw new ValidationFailedError(
      'Failure simulation is only available when the mock AI provider is enabled.',
    );
  }
  await enforceRateLimit(deps, actor);

  const outcome = await findLearningOutcome(deps.db, request.learningOutcomeCode);
  if (!outcome) {
    throw new ValidationFailedError(`Unknown learning outcome ${request.learningOutcomeCode}.`);
  }
  if (outcome.grade !== request.grade) {
    throw new ValidationFailedError(
      `Learning outcome ${request.learningOutcomeCode} belongs to Grade ${outcome.grade}.`,
    );
  }
  const sources = await retrieveForOutcome(deps.db, deps.embedder, outcome);
  if (sources.length === 0) throw new NoCurriculumMatchError();

  const run: GenerationRun = {
    actor,
    request,
    retrievedSources: sources.map(({ chunkId, similarity }) => ({ chunkId, similarity })),
    startedAt: Date.now(),
  };
  const result = await callUntilValid(
    deps,
    { outcome, durationMinutes: request.durationMinutes, sources },
    request,
  );

  if (result.kind === 'call_failed') {
    await recordFailure(deps, run, result.usage, result.error.kind, result.error.detail);
    throw toDomainError(result.error, deps.timeoutMs);
  }
  if (result.kind === 'invalid') {
    await recordFailure(deps, run, result.usage, 'invalid_output', result.problems.join(' | '));
    throw new GenerationInvalidOutputError(result.usage.attempts, result.problems);
  }

  const grounding = assessGrounding(
    result.content,
    run.retrievedSources,
    deps.embedder.weakSimilarityThreshold,
  );
  const planId = await deps.db.transaction(async (tx) => {
    const generationId = await plans.insertGeneration(
      tx,
      generationRecord(deps, run, result.usage, { succeeded: true }),
    );
    return createDraftFromGeneration(tx, {
      owner: actor,
      learningOutcomeCode: outcome.code,
      durationMinutes: request.durationMinutes,
      generationId,
      content: grounding.content,
      grounding: grounding.report,
      changeNote: `AI draft (${deps.llm.name})`,
    });
  });

  deps.logger.info(
    { planId, grounding: grounding.report.status, ...result.usage },
    'lesson plan drafted',
  );
  return planId;
}
