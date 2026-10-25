import type {
  ApiErrorBody,
  ApiErrorCode,
  GeneratePlanRequest,
  LearningOutcomeDto,
  LessonPlanContent,
  MetaDto,
  PlanDetailDto,
  PlanSummaryDto,
  PlanVersionDetailDto,
  SessionUser,
  TeacherOverviewDto,
} from '@hub/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | 'network_error',
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'error' in value;
}

let onUnauthenticated: () => void = () => undefined;

export function setUnauthenticatedHandler(handler: () => void): void {
  onUnauthenticated = handler;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    });
  } catch {
    throw new ApiError(
      0,
      'network_error',
      'Could not reach the server. Check your connection and try again.',
    );
  }
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) onUnauthenticated();
    if (isApiErrorBody(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message, body.error.details);
    }
    throw new ApiError(response.status, 'internal_error', 'Unexpected response from the server.');
  }
  return body as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  login: (email: string, password: string) =>
    request<{ user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: json({ email, password }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: SessionUser }>('/auth/me'),
  meta: () => request<MetaDto>('/meta'),
  outcomes: () => request<{ outcomes: LearningOutcomeDto[] }>('/learning-outcomes'),
  generate: (input: GeneratePlanRequest) =>
    request<{ plan: PlanDetailDto }>('/plans/generate', { method: 'POST', body: json(input) }),
  myPlans: () => request<{ plans: PlanSummaryDto[] }>('/plans/mine'),
  reviewQueue: () => request<{ plans: PlanSummaryDto[] }>('/plans/review-queue'),
  teachers: () => request<{ teachers: TeacherOverviewDto[] }>('/teachers'),
  lessonBank: (outcome?: string) =>
    request<{ plans: PlanSummaryDto[] }>(
      `/plans/bank${outcome ? `?outcome=${encodeURIComponent(outcome)}` : ''}`,
    ),
  plan: (id: string) => request<{ plan: PlanDetailDto }>(`/plans/${id}`),
  version: (id: string, version: number) =>
    request<{ version: PlanVersionDetailDto }>(`/plans/${id}/versions/${version}`),
  save: (id: string, content: LessonPlanContent, expectedVersion: number, changeNote?: string) =>
    request<{ plan: PlanDetailDto }>(`/plans/${id}`, {
      method: 'PUT',
      body: json({ content, expectedVersion, changeNote }),
    }),
  submit: (id: string) =>
    request<{ plan: PlanDetailDto }>(`/plans/${id}/submit`, { method: 'POST' }),
  approve: (id: string) =>
    request<{ plan: PlanDetailDto }>(`/plans/${id}/approve`, { method: 'POST' }),
  returnPlan: (id: string, comment: string) =>
    request<{ plan: PlanDetailDto }>(`/plans/${id}/return`, {
      method: 'POST',
      body: json({ comment }),
    }),
};
