import { z } from 'zod';
import {
  LessonPlanContentSchema,
  MAX_LESSON_MINUTES,
  MIN_LESSON_MINUTES,
  SUPPORTED_GRADES,
  type SupportedGrade,
} from './lessonPlan';
import type { LessonPlanContent } from './lessonPlan';
import type { DocumentType, GroundingStatus, PlanStatus, Role, WorkflowAction } from './workflow';

export const MOCK_SCENARIOS = [
  'ok',
  'invalid_then_ok',
  'invalid_json',
  'schema_violation',
  'uncited',
  'fabricated_citation',
  'timeout',
  'provider_error',
] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export const MIN_RETURN_COMMENT_LENGTH = 5;

export const LoginRequestSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const GeneratePlanRequestSchema = z.strictObject({
  grade: z
    .number()
    .int()
    .refine(
      (value): value is SupportedGrade => (SUPPORTED_GRADES as readonly number[]).includes(value),
      'Select a supported grade.',
    )
    .default(8),
  learningOutcomeCode: z.string().trim().min(1).max(40),
  durationMinutes: z.number().int().min(MIN_LESSON_MINUTES).max(MAX_LESSON_MINUTES),
  simulate: z.enum(MOCK_SCENARIOS).optional(),
});

export const SavePlanRequestSchema = z.strictObject({
  content: LessonPlanContentSchema,
  expectedVersion: z.number().int().min(1),
  changeNote: z.string().trim().max(200).optional(),
});

export const ReturnPlanRequestSchema = z.strictObject({
  comment: z
    .string()
    .trim()
    .min(MIN_RETURN_COMMENT_LENGTH, 'Explain what the teacher should change')
    .max(1000),
});

export const SearchQuerySchema = z.strictObject({
  q: z.string().trim().min(2).max(80),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;
export type SavePlanRequest = z.infer<typeof SavePlanRequestSchema>;
export type ReturnPlanRequest = z.infer<typeof ReturnPlanRequestSchema>;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TeacherOverviewDto {
  id: string;
  name: string;
  email: string;
  totalPlans: number;
  draftPlans: number;
  submittedPlans: number;
  publishedPlans: number;
  lastActivityAt: string | null;
}

export interface SearchResultDto {
  kind: 'plan' | 'outcome';
  id: string;
  title: string;
  description: string;
  meta: string;
  grade: SupportedGrade;
  status?: PlanStatus;
}

export interface LearningOutcomeDto {
  code: string;
  description: string;
  grade: SupportedGrade;
  strand: string;
  subStrand: string;
  publishedPlanCount: number;
}

export interface SourceScore {
  chunkId: string;
  similarity: number;
}

export interface RetrievedChunk extends SourceScore {
  documentId: string;
  documentTitle: string;
  documentType: DocumentType;
  heading: string;
  text: string;
}

export interface SourceDto extends RetrievedChunk {
  cited: boolean;
}

export interface MetaDto {
  llmProvider: string;
  llmModel: string;
  embeddingModel: string;
  mockScenarios: MockScenario[];
}

export interface GroundingReport {
  status: GroundingStatus;
  validCitationCount: number;
  removedCitationIds: string[];
  bestSimilarity: number;
  notes: string[];
}

export interface GenerationStats {
  provider: string;
  model: string;
  attempts: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface PlanSummaryDto {
  id: string;
  title: string;
  status: PlanStatus;
  groundingStatus: GroundingStatus;
  learningOutcome: { code: string; description: string; grade: SupportedGrade };
  durationMinutes: number;
  owner: { id: string; name: string };
  currentVersion: number;
  updatedAt: string;
}

export interface PlanVersionDto {
  version: number;
  authorName: string;
  changeNote: string | null;
  groundingStatus: GroundingStatus;
  createdAt: string;
}

export interface ReviewEventDto {
  action: WorkflowAction;
  fromStatus: PlanStatus;
  toStatus: PlanStatus;
  comment: string | null;
  actorName: string;
  createdAt: string;
}

export interface PlanDetailDto extends PlanSummaryDto {
  content: LessonPlanContent;
  grounding: GroundingReport;
  sources: SourceDto[];
  versions: PlanVersionDto[];
  reviews: ReviewEventDto[];
  generation: GenerationStats;
}

export interface PlanVersionDetailDto extends PlanVersionDto {
  content: LessonPlanContent;
}

export type ApiErrorCode =
  | 'validation_failed'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'invalid_transition'
  | 'version_conflict'
  | 'not_editable'
  | 'ungrounded_submission'
  | 'generation_invalid_output'
  | 'generation_timeout'
  | 'generation_unavailable'
  | 'generation_refused'
  | 'no_curriculum_match'
  | 'rate_limited'
  | 'internal_error';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}
