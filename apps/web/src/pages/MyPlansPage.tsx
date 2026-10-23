import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LESSON_DURATION_OPTIONS,
  MOCK_SCENARIOS,
  SUPPORTED_GRADES,
  type SupportedGrade,
  type LearningOutcomeDto,
  type MockScenario,
} from '@hub/shared';
import { ErrorNotice } from '../components/ErrorNotice';
import { PlanTable } from '../components/PlanTable';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';

const SCENARIO_LABEL: Record<MockScenario, string> = {
  ok: 'Normal response',
  invalid_then_ok: 'Invalid first, valid on retry',
  invalid_json: 'Always invalid JSON',
  schema_violation: 'Breaks the lesson plan schema',
  uncited: 'Cites no sources',
  fabricated_citation: 'Invents source ids',
  timeout: 'Too slow (timeout)',
  provider_error: 'Provider outage',
};

function toScenario(value: string): MockScenario {
  return MOCK_SCENARIOS.find((scenario) => scenario === value) ?? 'ok';
}

function groupByStrand(outcomes: LearningOutcomeDto[]): [string, LearningOutcomeDto[]][] {
  const groups = new Map<string, LearningOutcomeDto[]>();
  for (const outcome of outcomes)
    groups.set(outcome.subStrand, [...(groups.get(outcome.subStrand) ?? []), outcome]);
  return [...groups.entries()];
}

function gradeLabel(grade: SupportedGrade): string {
  return `Grade ${grade} · Integrated Science`;
}

function NewPlanForm() {
  const navigate = useNavigate();
  const outcomes = useResource(() => api.outcomes(), 'outcomes');
  const meta = useResource(() => api.meta(), 'meta');
  const [grade, setGrade] = useState<SupportedGrade>(8);
  const [outcomeCode, setOutcomeCode] = useState('');
  const [duration, setDuration] = useState<number>(LESSON_DURATION_OPTIONS[0]);
  const [scenario, setScenario] = useState<MockScenario>('ok');
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => outcomes.data?.outcomes.find((outcome) => outcome.code === outcomeCode),
    [outcomes.data, outcomeCode],
  );
  const gradeOutcomes = useMemo(
    () => outcomes.data?.outcomes.filter((outcome) => outcome.grade === grade) ?? [],
    [outcomes.data, grade],
  );
  const mockScenarios = meta.data?.mockScenarios ?? [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { plan } = await api.generate({
        grade,
        learningOutcomeCode: outcomeCode,
        durationMinutes: duration,
        ...(mockScenarios.length > 0 && scenario !== 'ok' ? { simulate: scenario } : {}),
      });
      navigate(`/plans/${plan.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Generation failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card stack"
      onSubmit={handleSubmit}
      aria-labelledby="new-plan-heading"
      aria-busy={busy}
    >
      <h2 id="new-plan-heading">Draft a new lesson plan</h2>
      <ErrorNotice error={outcomes.error} onRetry={outcomes.reload} />
      <fieldset className="context-fieldset">
        <legend>Class context</legend>
        <label>
          Grade
          <select
            value={grade}
            onChange={(event) => {
              setGrade(Number(event.target.value) as SupportedGrade);
              setOutcomeCode('');
            }}
          >
            {SUPPORTED_GRADES.map((option) => (
              <option key={option} value={option}>
                {gradeLabel(option)}
              </option>
            ))}
          </select>
          <span className="field-hint">Retrieval is limited to curriculum evidence for this grade.</span>
        </label>
      </fieldset>
      <label>
        Learning outcome
        <select value={outcomeCode} onChange={(e) => setOutcomeCode(e.target.value)} required>
          <option value="">Choose an outcome…</option>
          {groupByStrand(gradeOutcomes).map(([subStrand, group]) => (
            <optgroup key={subStrand} label={subStrand}>
              {group.map((outcome) => (
                <option key={outcome.code} value={outcome.code}>
                  {outcome.code}: {outcome.description}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {selected && selected.publishedPlanCount > 0 && (
        <p className="banner banner-info" role="status">
          {selected.publishedPlanCount} approved plan{selected.publishedPlanCount === 1 ? '' : 's'}{' '}
          already exist for this outcome.{' '}
          <Link to={`/bank?outcome=${encodeURIComponent(selected.code)}`}>
            Check the lesson bank
          </Link>{' '}
          before drafting a new one.
        </p>
      )}
      <fieldset>
        <legend>Lesson duration</legend>
        {LESSON_DURATION_OPTIONS.map((minutes) => (
          <label key={minutes} className="inline">
            <input
              type="radio"
              name="duration"
              value={minutes}
              checked={duration === minutes}
              onChange={() => setDuration(minutes)}
            />
            {minutes} minutes{minutes === 80 ? ' (double lesson)' : ''}
          </label>
        ))}
      </fieldset>
      {mockScenarios.length > 0 && (
        <label>
          Mock AI behaviour <span className="muted">(demo mode only)</span>
          <select value={scenario} onChange={(e) => setScenario(toScenario(e.target.value))}>
            {mockScenarios.map((option) => (
              <option key={option} value={option}>
                {SCENARIO_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
      )}
      <ErrorNotice error={error} />
      <button type="submit" className="primary" disabled={busy || !outcomeCode}>
        {busy ? 'Drafting from the curriculum…' : 'Draft lesson plan'}
      </button>
      {busy && (
        <p className="muted" role="status">
          Retrieving curriculum sources and drafting. This can take up to a minute with a real AI
          model.
        </p>
      )}
      {meta.data && (
        <p className="muted small">
          AI: {meta.data.llmProvider} ({meta.data.llmModel}). Only the outcome and curriculum
          excerpts are sent; no names or emails.
        </p>
      )}
    </form>
  );
}

export function MyPlansPage() {
  const plans = useResource(() => api.myPlans(), 'my-plans');
  return (
    <div className="two-column">
      <NewPlanForm />
      <section aria-labelledby="my-plans-heading">
        <h1 id="my-plans-heading">My lesson plans</h1>
        <ErrorNotice error={plans.error} onRetry={plans.reload} />
        {plans.loading && !plans.data ? (
          <p className="muted">Loading…</p>
        ) : (
          <PlanTable
            plans={plans.data?.plans ?? []}
            caption="My lesson plans"
            emptyMessage="You have no lesson plans yet. Draft one from a learning outcome."
          />
        )}
      </section>
    </div>
  );
}
