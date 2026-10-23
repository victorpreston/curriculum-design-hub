import { z } from 'zod';

export const LESSON_DURATION_OPTIONS = [40, 80] as const;
export const SUPPORTED_GRADES = [5, 6, 7, 8] as const;
export type SupportedGrade = (typeof SUPPORTED_GRADES)[number];
export const MIN_LESSON_MINUTES = 20;
export const MAX_LESSON_MINUTES = 120;
export const SHORT_TEXT_MAX = 200;
export const LONG_TEXT_MAX = 1500;
export const MAX_MAIN_ACTIVITIES = 5;
export const MAX_SOURCES_PER_SECTION = 8;

export const ChunkIdSchema = z
  .string()
  .regex(/^[a-z0-9-]+#[a-z0-9-]+$/, 'Source ids look like "document-id#section-id"');

const SourceIdsSchema = z.array(ChunkIdSchema).max(MAX_SOURCES_PER_SECTION);

const ShortText = z.string().trim().min(3).max(SHORT_TEXT_MAX);
const LongText = z.string().trim().min(10).max(LONG_TEXT_MAX);
const Minutes = z.number().int().min(1).max(MAX_LESSON_MINUTES);

export const LessonActivitySchema = z.object({
  title: ShortText,
  durationMinutes: Minutes,
  teacherActions: LongText,
  learnerActions: LongText,
  sourceIds: SourceIdsSchema,
});

export const CheckForUnderstandingSchema = z.object({
  durationMinutes: Minutes,
  questions: z.array(ShortText).min(1).max(6),
  sourceIds: SourceIdsSchema,
});

export const LessonPlanContentSchema = z.object({
  title: ShortText,
  keyInquiryQuestion: ShortText,
  objectives: z.array(ShortText).min(1).max(5),
  materials: z.array(ShortText).min(1).max(12),
  coreCompetencies: z.array(ShortText).max(4),
  starter: LessonActivitySchema,
  mainActivities: z.array(LessonActivitySchema).min(1).max(MAX_MAIN_ACTIVITIES),
  checkForUnderstanding: CheckForUnderstandingSchema,
});

export type LessonActivity = z.infer<typeof LessonActivitySchema>;
export type LessonPlanContent = z.infer<typeof LessonPlanContentSchema>;

export function scheduledMinutes(content: LessonPlanContent): number {
  const mainMinutes = content.mainActivities.reduce(
    (total, activity) => total + activity.durationMinutes,
    0,
  );
  return (
    content.starter.durationMinutes + mainMinutes + content.checkForUnderstanding.durationMinutes
  );
}

export function timingProblem(content: LessonPlanContent, lessonMinutes: number): string | null {
  const scheduled = scheduledMinutes(content);
  if (scheduled === lessonMinutes) return null;
  return `Activity timings add up to ${scheduled} minutes but the lesson is ${lessonMinutes} minutes.`;
}

export type LessonPlanValidation =
  { ok: true; content: LessonPlanContent } | { ok: false; problems: string[] };

const MAX_REPORTED_PROBLEMS = 10;

export function validateLessonPlan(
  candidate: unknown,
  lessonMinutes: number,
): LessonPlanValidation {
  const parsed = LessonPlanContentSchema.safeParse(candidate);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .slice(0, MAX_REPORTED_PROBLEMS)
      .map((issue) => `${issue.path.join('.') || 'plan'}: ${issue.message}`);
    return { ok: false, problems };
  }
  const timing = timingProblem(parsed.data, lessonMinutes);
  if (timing) return { ok: false, problems: [timing] };
  return { ok: true, content: parsed.data };
}

export function lessonSections(content: LessonPlanContent): { sourceIds: string[] }[] {
  return [content.starter, ...content.mainActivities, content.checkForUnderstanding];
}

export function citedSourceIds(content: LessonPlanContent): string[] {
  return [...new Set(lessonSections(content).flatMap((section) => section.sourceIds))];
}
