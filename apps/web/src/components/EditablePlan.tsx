import { useState } from 'react';
import type { LessonPlanContent, PlanDetailDto } from '@hub/shared';
import { clearLocalDraft, readLocalDraft, writeLocalDraft } from '../lib/localDraft';
import { TeacherActions, type PlanUpdateHandler } from './PlanActions';
import { PlanEditor } from './PlanEditor';

function sameContent(a: LessonPlanContent, b: LessonPlanContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function unsavedDraftFor(plan: PlanDetailDto): LessonPlanContent | null {
  const saved = readLocalDraft(plan.id, plan.currentVersion);
  return saved && !sameContent(saved, plan.content) ? saved : null;
}

export function EditablePlan({
  plan,
  onPlanChange,
}: {
  plan: PlanDetailDto;
  onPlanChange: PlanUpdateHandler;
}) {
  const [draft, setDraft] = useState(plan.content);
  const [restorable, setRestorable] = useState(() => unsavedDraftFor(plan));
  const [editorGeneration, setEditorGeneration] = useState(0);
  const dirty = !sameContent(draft, plan.content);

  function updateDraft(next: LessonPlanContent) {
    setDraft(next);
    if (sameContent(next, plan.content)) clearLocalDraft(plan.id, plan.currentVersion);
    else writeLocalDraft(plan.id, plan.currentVersion, next);
  }

  function replaceDraft(next: LessonPlanContent) {
    updateDraft(next);
    setEditorGeneration((generation) => generation + 1);
  }

  return (
    <>
      {restorable && (
        <div className="banner banner-info" role="status">
          You have unsaved changes to this plan from an earlier session on this device.{' '}
          <button
            type="button"
            onClick={() => {
              replaceDraft(restorable);
              setRestorable(null);
            }}
          >
            Restore them
          </button>{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              clearLocalDraft(plan.id, plan.currentVersion);
              setRestorable(null);
            }}
          >
            Discard
          </button>
        </div>
      )}
      <PlanEditor
        key={editorGeneration}
        content={draft}
        sources={plan.sources}
        lessonMinutes={plan.durationMinutes}
        onChange={updateDraft}
      />
      <TeacherActions
        plan={plan}
        draft={draft}
        dirty={dirty}
        onPlanChange={onPlanChange}
        onDiscard={() => replaceDraft(plan.content)}
      />
    </>
  );
}
