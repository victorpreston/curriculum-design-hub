import { ReviewQueueCard } from '../components/ReviewQueueCard';
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
      <ReviewQueueCard
        plans={queue.data?.plans ?? []}
        loading={queue.loading}
        error={queue.error}
        onReload={queue.reload}
        limit={null}
      />
    </section>
  );
}
