import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import type { ApiErrorBody, Role } from '@hub/shared';
import { SESSION_COOKIE, verifySession } from '../auth/session';
import { findSessionUser } from '../auth/userRepository';
import type { Database } from '../db/client';
import {
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationFailedError,
} from '../errors';
import type { Logger } from '../logger';
import type { Actor } from '../plans/access';

const actors = new WeakMap<Request, Actor>();

export function actorOf(request: Request): Actor {
  const actor = actors.get(request);
  if (!actor) throw new UnauthenticatedError();
  return actor;
}

export function requireAuth(db: Database, jwtSecret: string): RequestHandler {
  return async (request: Request, _response: Response, next: NextFunction) => {
    const token: unknown = request.cookies?.[SESSION_COOKIE];
    const userId = typeof token === 'string' ? verifySession(token, jwtSecret) : null;
    const user = userId ? await findSessionUser(db, userId) : null;
    if (!user) throw new UnauthenticatedError();
    actors.set(request, { id: user.id, name: user.name, role: user.role });
    next();
  };
}

export function requireRole(role: Role): RequestHandler {
  return (request, _response, next) => {
    if (actorOf(request).role !== role) throw new ForbiddenError();
    next();
  };
}

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationFailedError(
      'Some fields are missing or invalid.',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}

const PlanIdSchema = z.string().uuid();

export function planIdOf(request: Request): string {
  const parsed = PlanIdSchema.safeParse(request.params.planId);
  if (!parsed.success) throw new NotFoundError('Lesson plan not found.');
  return parsed.data;
}

function errorBody(error: DomainError): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
}

function isMalformedJson(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, request, response, _next) => {
    if (error instanceof DomainError) {
      response.status(error.httpStatus).json(errorBody(error));
      return;
    }
    if (isMalformedJson(error)) {
      response
        .status(400)
        .json(errorBody(new ValidationFailedError('Request body is not valid JSON.')));
      return;
    }
    logger.error({ err: error, path: request.path }, 'unhandled error');
    const body: ApiErrorBody = {
      error: { code: 'internal_error', message: 'Something went wrong on our side.' },
    };
    response.status(500).json(body);
  };
}

export function notFoundHandler(): RequestHandler {
  return () => {
    throw new NotFoundError('Route not found.');
  };
}
