import { Router, type Response } from 'express';
import { z } from 'zod';
import {
  GeneratePlanRequestSchema,
  LoginRequestSchema,
  MOCK_SCENARIOS,
  ReturnPlanRequestSchema,
  SavePlanRequestSchema,
  SearchQuerySchema,
  type MetaDto,
} from '@hub/shared';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, authenticate, signSession } from '../auth/session';
import { findSessionUser, listTeacherOverviews } from '../auth/userRepository';
import { listLearningOutcomes } from '../corpus/outcomeRepository';
import { UnauthenticatedError } from '../errors';
import { generateLessonPlan } from '../generation/generationService';
import { searchWorkspace } from '../plans/planRepository';
import * as planService from '../plans/planService';
import type { AppDeps } from '../app';
import { actorOf, parseInput, planIdOf, requireAuth, requireRole } from './middleware';

const BankQuerySchema = z.object({ outcome: z.string().max(40).optional() });
const VersionParamSchema = z.coerce.number().int().min(1);

function setSessionCookie(response: Response, token: string, secure: boolean): void {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function createRouter(deps: AppDeps): Router {
  const { db, config, llm, embedder, logger } = deps;
  const router = Router();
  const authenticated = requireAuth(db, config.JWT_SECRET);
  const teacherOnly = requireRole('teacher');
  const leadOnly = requireRole('curriculum_lead');

  router.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  router.post('/auth/login', async (request, response) => {
    const { email, password } = parseInput(LoginRequestSchema, request.body);
    const user = await authenticate(db, email, password);
    if (!user) throw new UnauthenticatedError('Email or password is incorrect.');
    setSessionCookie(
      response,
      signSession(user.id, config.JWT_SECRET),
      config.NODE_ENV === 'production',
    );
    response.json({ user });
  });

  router.post('/auth/logout', (_request, response) => {
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    response.status(204).end();
  });

  router.use(authenticated);

  router.get('/auth/me', async (request, response) => {
    const user = await findSessionUser(db, actorOf(request).id);
    if (!user) throw new UnauthenticatedError();
    response.json({ user });
  });

  router.get('/meta', (_request, response) => {
    const meta: MetaDto = {
      llmProvider: llm.name,
      llmModel: llm.model,
      embeddingModel: embedder.model,
      mockScenarios: llm.name === 'mock' ? [...MOCK_SCENARIOS] : [],
    };
    response.json(meta);
  });

  router.get('/search', async (request, response) => {
    const { q } = parseInput(SearchQuerySchema, request.query);
    response.json({ results: await searchWorkspace(db, actorOf(request), q) });
  });

  router.get('/learning-outcomes', async (_request, response) => {
    response.json({ outcomes: await listLearningOutcomes(db) });
  });

  router.post('/plans/generate', teacherOnly, async (request, response) => {
    const input = parseInput(GeneratePlanRequestSchema, request.body);
    const planId = await generateLessonPlan(
      {
        db,
        llm,
        embedder,
        logger,
        timeoutMs: config.LLM_TIMEOUT_MS,
        generationsPerHour: config.GENERATIONS_PER_HOUR,
      },
      actorOf(request),
      input,
    );
    response
      .status(201)
      .json({ plan: await planService.getPlanDetail(db, actorOf(request), planId) });
  });

  router.get('/plans/mine', teacherOnly, async (request, response) => {
    response.json({ plans: await planService.listOwnPlans(db, actorOf(request)) });
  });

  router.get('/plans/review-queue', leadOnly, async (_request, response) => {
    response.json({ plans: await planService.listReviewQueue(db) });
  });

  router.get('/teachers', leadOnly, async (_request, response) => {
    response.json({ teachers: await listTeacherOverviews(db) });
  });

  router.get('/plans/bank', async (request, response) => {
    const { outcome } = parseInput(BankQuerySchema, request.query);
    response.json({ plans: await planService.listLessonBank(db, outcome) });
  });

  router.get('/plans/:planId', async (request, response) => {
    response.json({
      plan: await planService.getPlanDetail(db, actorOf(request), planIdOf(request)),
    });
  });

  router.get('/plans/:planId/versions/:version', async (request, response) => {
    const version = parseInput(VersionParamSchema, request.params.version);
    response.json({
      version: await planService.getPlanVersion(db, actorOf(request), planIdOf(request), version),
    });
  });

  router.put('/plans/:planId', teacherOnly, async (request, response) => {
    const input = parseInput(SavePlanRequestSchema, request.body);
    const planId = planIdOf(request);
    await planService.savePlanVersion(
      db,
      actorOf(request),
      planId,
      input,
      embedder.weakSimilarityThreshold,
    );
    response.json({ plan: await planService.getPlanDetail(db, actorOf(request), planId) });
  });

  router.post('/plans/:planId/submit', teacherOnly, async (request, response) => {
    const planId = planIdOf(request);
    await planService.applyWorkflowAction(db, actorOf(request), planId, 'submit');
    response.json({ plan: await planService.getPlanDetail(db, actorOf(request), planId) });
  });

  router.post('/plans/:planId/approve', leadOnly, async (request, response) => {
    const planId = planIdOf(request);
    await planService.applyWorkflowAction(db, actorOf(request), planId, 'approve');
    response.json({ plan: await planService.getPlanDetail(db, actorOf(request), planId) });
  });

  router.post('/plans/:planId/return', leadOnly, async (request, response) => {
    const planId = planIdOf(request);
    const { comment } = parseInput(ReturnPlanRequestSchema, request.body);
    await planService.applyWorkflowAction(db, actorOf(request), planId, 'return', comment);
    response.json({ plan: await planService.getPlanDetail(db, actorOf(request), planId) });
  });

  return router;
}
