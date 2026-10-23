import { ErrorNotice } from '../components/ErrorNotice';
import { PlanTable } from '../components/PlanTable';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';

export function ReviewQueuePage() {
  const queue = useResource(() => api.reviewQueue(), 'review-queue');
  return (
    <section aria-labelledby="queue-heading">
      <h1 id="queue-heading">Review queue</h1>
      <p className="muted">
        Submitted plans, oldest first. Open a plan to approve it or return it with comments.
      </p>
      <ErrorNotice error={queue.error} onRetry={queue.reload} />
      {queue.loading && !queue.data ? (
        <p className="muted">Loading…</p>
      ) : (
        <PlanTable
          plans={queue.data?.plans ?? []}
          caption="Plans waiting for review"
          emptyMessage="Nothing is waiting for review."
          showOwner
        />
      )}
    </section>
  );
}
