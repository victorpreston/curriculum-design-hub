import { LessonPlanContentSchema, type LessonPlanContent } from '@hub/shared';

function storageKey(planId: string, baseVersion: number): string {
  return `hub:unsaved-plan:${planId}:v${baseVersion}`;
}

export function readLocalDraft(planId: string, baseVersion: number): LessonPlanContent | null {
  try {
    const raw = window.localStorage.getItem(storageKey(planId, baseVersion));
    if (!raw) return null;
    const parsed = LessonPlanContentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(
  planId: string,
  baseVersion: number,
  content: LessonPlanContent,
): void {
  try {
    window.localStorage.setItem(storageKey(planId, baseVersion), JSON.stringify(content));
  } catch {
    return;
  }
}

export function clearLocalDraft(planId: string, baseVersion: number): void {
  try {
    window.localStorage.removeItem(storageKey(planId, baseVersion));
  } catch {
    return;
  }
}
