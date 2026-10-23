import { useState } from 'react';
import {
  MIN_RETURN_COMMENT_LENGTH,
  validateLessonPlan,
  type LessonPlanContent,
  type PlanDetailDto,
} from '@hub/shared';
import { api } from '../lib/api';
import { clearLocalDraft } from '../lib/localDraft';
import { useAsyncAction } from '../lib/useAsyncAction';
import { ErrorNotice } from './ErrorNotice';

export type PlanUpdateHandler = (plan: PlanDetailDto, notice: string) => void;

export function TeacherActions({
  plan,
  draft,
  dirty,
  onPlanChange,
  onDiscard,
}: {
  plan: PlanDetailDto;
  draft: LessonPlanContent;
  dirty: boolean;
  onPlanChange: PlanUpdateHandler;
  onDiscard: () => void;
}) {
  const [changeNote, setChangeNote] = useState('');
  const { busy, error, run } = useAsyncAction();
  const validation = validateLessonPlan(draft, plan.durationMinutes);
  const problems = validation.ok ? [] : validation.problems;

  async function save() {
    const result = await run(() =>
      api.save(plan.id, draft, plan.currentVersion, changeNote || undefined),
    );
    if (!result) return;
    clearLocalDraft(plan.id, plan.currentVersion);
    onPlanChange(result.plan, 'Saved as a new version.');
  }

  async function submit() {
    const result = await run(() => api.submit(plan.id));
    if (result) onPlanChange(result.plan, 'Submitted for review.');
  }

  return (
    <div className="actions card stack" aria-busy={busy}>
      {problems.length > 0 && (
        <div className="banner banner-warning" role="status">
          <strong>Fix these before saving:</strong>
          <ul>
            {problems.map((problem, index) => (
              <li key={index}>{problem}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="row">
        <label className="change-note">
          <span className="visually-hidden">What did you change?</span>
          <input
            value={changeNote}
            maxLength={200}
            placeholder="What did you change? (optional)"
            onChange={(e) => setChangeNote(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="primary"
          disabled={busy || !dirty || problems.length > 0}
          onClick={save}
        >
          Save version
        </button>
        <button type="button" disabled={busy || !dirty} onClick={onDiscard}>
          Discard changes
        </button>
        <button
          type="button"
          disabled={busy || dirty || plan.groundingStatus === 'ungrounded'}
          onClick={submit}
        >
          Submit for review
        </button>
      </div>
      {dirty && (
        <p className="muted small">Unsaved changes are kept on this device until you save.</p>
      )}
      {!dirty && plan.groundingStatus === 'ungrounded' && (
        <p className="muted small">
          Link at least one curriculum source to an activity before submitting.
        </p>
      )}
      <ErrorNotice error={error} />
    </div>
  );
}

export function LeadActions({
  plan,
  onPlanChange,
}: {
  plan: PlanDetailDto;
  onPlanChange: PlanUpdateHandler;
}) {
  const [comment, setComment] = useState('');
  const { busy, error, run } = useAsyncAction();
  const trimmedComment = comment.trim();

  async function approve() {
    const result = await run(() => api.approve(plan.id));
    if (result) onPlanChange(result.plan, 'Approved. The plan is now in the lesson bank.');
  }

  async function returnToTeacher() {
    const result = await run(() => api.returnPlan(plan.id, trimmedComment));
    if (result) onPlanChange(result.plan, 'Returned to the teacher with your comment.');
  }

  return (
    <div className="actions card stack" aria-busy={busy}>
      <h2>Review decision</h2>
      <label>
        Comment for the teacher <span className="muted small">(required to return)</span>
        <textarea
          rows={3}
          value={comment}
          maxLength={1000}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <div className="row">
        <button type="button" className="primary" disabled={busy} onClick={approve}>
          Approve and publish
        </button>
        <button
          type="button"
          disabled={busy || trimmedComment.length < MIN_RETURN_COMMENT_LENGTH}
          onClick={returnToTeacher}
        >
          Return with comment
        </button>
      </div>
      <ErrorNotice error={error} />
    </div>
  );
}
