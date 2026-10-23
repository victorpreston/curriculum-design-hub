import { useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '../components/ErrorNotice';
import { PlanTable } from '../components/PlanTable';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';

export function LessonBankPage() {
  const [params, setParams] = useSearchParams();
  const outcome = params.get('outcome') ?? '';
  const outcomes = useResource(() => api.outcomes(), 'outcomes');
  const bank = useResource(() => api.lessonBank(outcome || undefined), `bank:${outcome}`);

  return (
    <section aria-labelledby="bank-heading">
      <h1 id="bank-heading">Lesson bank</h1>
      <p className="muted">
        Lesson plans approved by a curriculum lead. Every teacher can read and reuse them.
      </p>
      <label className="filter">
        Filter by outcome
        <select
          value={outcome}
          onChange={(e) => setParams(e.target.value ? { outcome: e.target.value } : {})}
        >
          <option value="">All outcomes</option>
          {(outcomes.data?.outcomes ?? []).map((item) => (
            <option key={item.code} value={item.code}>
              {item.code}: {item.description}
            </option>
          ))}
        </select>
      </label>
      <ErrorNotice error={bank.error} onRetry={bank.reload} />
      {bank.loading && !bank.data ? (
        <p className="muted">Loading…</p>
      ) : (
        <PlanTable
          plans={bank.data?.plans ?? []}
          caption="Published lesson plans"
          emptyMessage="No approved plans yet for this selection."
          showOwner
        />
      )}
    </section>
  );
}
