import { validateLessonPlan, type LessonPlanValidation } from '@hub/shared';

function extractJsonObject(text: string): string | null {
  const withoutFences = text.replace(/```(?:json)?/gi, '');
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return withoutFences.slice(start, end + 1);
}

export function parseLessonPlan(text: string, lessonMinutes: number): LessonPlanValidation {
  const candidate = extractJsonObject(text);
  if (!candidate) return { ok: false, problems: ['Response did not contain a JSON object.'] };

  try {
    return validateLessonPlan(JSON.parse(candidate), lessonMinutes);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown parse error';
    return { ok: false, problems: [`Response was not valid JSON (${reason}).`] };
  }
}
