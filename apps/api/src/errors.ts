import type { ApiErrorCode } from '@hub/shared';

export class DomainError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly httpStatus: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationFailedError extends DomainError {
  constructor(message: string, details?: unknown) {
    super('validation_failed', 400, message, details);
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = 'Please sign in to continue.') {
    super('unauthenticated', 401, message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Your role does not allow this action.') {
    super('forbidden', 403, message);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Not found.') {
    super('not_found', 404, message);
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(message: string) {
    super('invalid_transition', 409, message);
  }
}

export class NotEditableError extends DomainError {
  constructor(message: string) {
    super('not_editable', 409, message);
  }
}

export class VersionConflictError extends DomainError {
  constructor(currentVersion: number) {
    super(
      'version_conflict',
      409,
      `This plan was changed elsewhere and is now at version ${currentVersion}. Reload it before saving.`,
      { currentVersion },
    );
  }
}

export class UngroundedSubmissionError extends DomainError {
  constructor() {
    super(
      'ungrounded_submission',
      409,
      'This plan does not cite any curriculum source. Link at least one source before submitting it for review.',
    );
  }
}

export class NoCurriculumMatchError extends DomainError {
  constructor() {
    super(
      'no_curriculum_match',
      422,
      'No curriculum material matched this learning outcome, so a grounded plan cannot be drafted.',
    );
  }
}

export class GenerationInvalidOutputError extends DomainError {
  constructor(attempts: number, problems: string[]) {
    super(
      'generation_invalid_output',
      502,
      `The AI returned an unusable lesson plan ${attempts} times, so nothing was saved. Please try again.`,
      { attempts, problems },
    );
  }
}

export class GenerationTimeoutError extends DomainError {
  constructor(timeoutMs: number) {
    super(
      'generation_timeout',
      504,
      `The AI did not respond within ${Math.round(timeoutMs / 1000)} seconds, so nothing was saved. Please try again.`,
    );
  }
}

export class GenerationUnavailableError extends DomainError {
  constructor(reason: string) {
    super(
      'generation_unavailable',
      503,
      `The AI service is unavailable right now (${reason}). Nothing was saved. Please try again shortly.`,
    );
  }
}

export class GenerationRefusedError extends DomainError {
  constructor() {
    super(
      'generation_refused',
      422,
      'The AI declined to draft this plan. Try a different outcome or contact the curriculum team.',
    );
  }
}

export class RateLimitedError extends DomainError {
  constructor(limitPerHour: number) {
    super(
      'rate_limited',
      429,
      `You have reached the limit of ${limitPerHour} AI drafts per hour. Edit an existing draft or try again later.`,
    );
  }
}
