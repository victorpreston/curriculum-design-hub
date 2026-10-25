import { useState } from 'react';
import { CheckCheck, CornerUpLeft, RotateCcw, Save, Send } from 'lucide-react';
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
    <section
      className="actions card stack plan-teacher-actions"
      aria-label="Save and submit lesson"
      aria-busy={busy}
    >
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
      <label className="change-note">
        Version note <span className="muted small">Optional</span>
        <input
          value={changeNote}
          maxLength={200}
          placeholder="Briefly describe your changes"
          onChange={(e) => setChangeNote(e.target.value)}
        />
      </label>
      <div className="row plan-save-buttons">
        <button
          type="button"
          className="primary"
          disabled={busy || !dirty || problems.length > 0}
          onClick={save}
        >
          <Save size={14} aria-hidden="true" />
          Save version
        </button>
        <button type="button" disabled={busy || !dirty} onClick={onDiscard}>
          <RotateCcw size={14} aria-hidden="true" />
          Discard changes
        </button>
        <button
          type="button"
          disabled={busy || dirty || plan.groundingStatus === 'ungrounded'}
          onClick={submit}
        >
          <Send size={14} aria-hidden="true" />
          Submit for review
        </button>
      </div>
      {dirty && (
        <p className="muted small">
          Save to recheck curriculum evidence and enable submission. Unsaved work is kept on this
          device.
        </p>
      )}
      {!dirty && plan.groundingStatus === 'ungrounded' && (
        <p className="muted small">
          Link at least one curriculum source to an activity before submitting.
        </p>
      )}
      <ErrorNotice error={error} />
    </section>
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
    <section
      className="actions card stack plan-lead-actions"
      aria-labelledby="review-decision-heading"
      aria-busy={busy}
    >
      <h2 id="review-decision-heading">Review decision</h2>
      <p className="plan-panel-description">Check the lesson and evidence before publishing.</p>
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
          <CheckCheck size={15} aria-hidden="true" />
          Approve and publish
        </button>
        <button
          type="button"
          disabled={busy || trimmedComment.length < MIN_RETURN_COMMENT_LENGTH}
          onClick={returnToTeacher}
        >
          <CornerUpLeft size={15} aria-hidden="true" />
          Return with comment
        </button>
      </div>
      <ErrorNotice error={error} />
    </section>
  );
}
