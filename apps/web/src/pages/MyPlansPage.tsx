import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, FlaskConical } from 'lucide-react';
import {
  LESSON_DURATION_OPTIONS,
  MOCK_SCENARIOS,
  SUPPORTED_GRADES,
  type SupportedGrade,
  type MockScenario,
} from '@hub/shared';
import { ErrorNotice } from '../components/ErrorNotice';
import { FormSelect } from '../components/FormSelect';
import { PlanTable } from '../components/PlanTable';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';

const SCENARIO_LABEL: Record<MockScenario, string> = {
  ok: 'Normal response',
  invalid_then_ok: 'Retry after an invalid response',
  invalid_json: 'Invalid JSON',
  schema_violation: 'Invalid lesson structure',
  uncited: 'Missing citations',
  fabricated_citation: 'Invented citations',
  timeout: 'Response timeout',
  provider_error: 'Provider outage',
};

function gradeLabel(grade: SupportedGrade): string {
  return `Grade ${grade} · Integrated Science`;
}

function initialGrade(value: string | null): SupportedGrade {
  const parsed = Number(value);
  return SUPPORTED_GRADES.includes(parsed as SupportedGrade) ? (parsed as SupportedGrade) : 8;
}

function NewPlanForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const outcomes = useResource(() => api.outcomes(), 'outcomes');
  const meta = useResource(() => api.meta(), 'meta');
  const [grade, setGrade] = useState<SupportedGrade>(() => initialGrade(searchParams.get('grade')));
  const [outcomeCode, setOutcomeCode] = useState(() => searchParams.get('outcome') ?? '');
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
  const isDemoMode = meta.data?.llmProvider === 'mock';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { plan } = await api.generate({
        grade,
        learningOutcomeCode: outcomeCode,
        durationMinutes: duration,
        ...(isDemoMode && mockScenarios.includes(scenario) && scenario !== 'ok'
          ? { simulate: scenario }
          : {}),
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
      <div className="draft-form-heading">
        <h2 id="new-plan-heading">Draft a new lesson plan</h2>
        {meta.data && (
          <span
            className={`generation-mode ${isDemoMode ? 'generation-mode-demo' : 'generation-mode-live'}`}
          >
            {isDemoMode ? 'Demo mode' : 'Live AI'}
          </span>
        )}
      </div>
      <ErrorNotice error={outcomes.error} onRetry={outcomes.reload} />
      <ErrorNotice error={meta.error} onRetry={meta.reload} />
      <fieldset className="context-fieldset">
        <legend>Class context</legend>
        <FormSelect
          label="Grade"
          value={String(grade)}
          onValueChange={(value) => {
            setGrade(Number(value) as SupportedGrade);
            setOutcomeCode('');
          }}
          options={SUPPORTED_GRADES.map((option) => ({
            value: String(option),
            label: gradeLabel(option),
          }))}
          hint="Retrieval is limited to curriculum evidence for this grade."
          disabled={busy}
        />
      </fieldset>
      <FormSelect
        label="Learning outcome"
        value={outcomeCode}
        onValueChange={setOutcomeCode}
        options={gradeOutcomes.map((outcome) => ({
          value: outcome.code,
          label: outcome.code,
          description: outcome.description,
          group: outcome.subStrand,
        }))}
        placeholder={
          outcomes.loading
            ? 'Loading outcomes…'
            : gradeOutcomes.length
              ? 'Choose a learning outcome…'
              : 'No outcomes available'
        }
        disabled={busy || outcomes.loading || !gradeOutcomes.length}
        required
      />
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
      {isDemoMode && scenario !== 'ok' && (
        <p className="generation-test-warning" role="status">
          Test active: {SCENARIO_LABEL[scenario]}.{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => setScenario('ok')}
            disabled={busy}
          >
            Use normal response
          </button>
        </p>
      )}
      <ErrorNotice error={error} />
      <button type="submit" className="primary" disabled={busy || !outcomeCode}>
        {busy ? 'Drafting from the curriculum…' : 'Draft lesson plan'}
      </button>
      {busy && (
        <p className="muted" role="status">
          {isDemoMode
            ? 'Retrieving curriculum sources and preparing the demo draft…'
            : 'Retrieving curriculum sources and drafting. This can take up to a minute.'}
        </p>
      )}
      {meta.data && !isDemoMode && (
        <p className="generation-privacy-note">
          Only curriculum context is sent to the AI provider; no names or emails.
        </p>
      )}
      {isDemoMode && mockScenarios.length > 0 && (
        <details className="generation-tests">
          <summary>
            <FlaskConical size={15} aria-hidden="true" />
            <span>Test generation failures</span>
            <span
              className={`generation-test-state${scenario !== 'ok' ? ' generation-test-state-active' : ''}`}
            >
              {scenario === 'ok' ? 'Optional' : 'Test active'}
            </span>
            <ChevronDown className="generation-tests-chevron" size={14} aria-hidden="true" />
          </summary>
          <div className="generation-tests-body">
            <p>Simulate an AI response to demonstrate validation, retries, or failure handling.</p>
            <FormSelect
              label="Response scenario"
              value={scenario}
              onValueChange={(value) =>
                setScenario(MOCK_SCENARIOS.find((option) => option === value) ?? 'ok')
              }
              options={mockScenarios.map((option) => ({
                value: option,
                label: SCENARIO_LABEL[option],
              }))}
              disabled={busy}
            />
            <dl className="generation-provider-details">
              <div>
                <dt>Provider</dt>
                <dd>{meta.data?.llmProvider}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{meta.data?.llmModel}</dd>
              </div>
            </dl>
          </div>
        </details>
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
