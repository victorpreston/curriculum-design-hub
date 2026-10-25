import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { SUPPORTED_GRADES, type PlanSummaryDto, type SupportedGrade } from '@hub/shared';
import { ErrorNotice } from './ErrorNotice';
import { PlanActivityList } from './PlanActivityList';

interface ReviewQueueCardProps {
  plans: PlanSummaryDto[];
  loading: boolean;
  error: Error | null;
  onReload: () => void;
  limit?: number | null;
}

export function ReviewQueueCard({
  plans,
  loading,
  error,
  onReload,
  limit = 5,
}: ReviewQueueCardProps) {
  const headingId = useId();
  const [grade, setGrade] = useState<SupportedGrade | 'all'>('all');
  const submittedPlans = plans
    .filter((plan) => plan.status === 'submitted')
    .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
  const matchingPlans = submittedPlans.filter(
    (plan) => grade === 'all' || plan.learningOutcome.grade === grade,
  );
  const visiblePlans = limit === null ? matchingPlans : matchingPlans.slice(0, limit);
  const firstPlan = matchingPlans[0];
  const gradeFilters = ['all', ...SUPPORTED_GRADES] as const;

  return (
    <section className="recent-plans review-queue-card" aria-labelledby={headingId}>
      <header className="recent-plans-heading">
        <div>
          <h2 id={headingId}>{limit === null ? 'Submitted lessons' : 'Review queue'}</h2>
          <p>Review teacher submissions, oldest first.</p>
        </div>
        <div className="review-queue-header-actions">
          <button
            className="review-queue-refresh"
            type="button"
            onClick={onReload}
            disabled={loading}
            aria-label="Refresh review queue"
          >
            <RefreshCw size={15} aria-hidden="true" />
          </button>
          {limit !== null && (
            <Link className="recent-plans-view-all" to="/review">
              View queue
            </Link>
          )}
        </div>
      </header>

      <div className="recent-plans-filters" role="group" aria-label="Filter review queue by grade">
        {gradeFilters.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={grade === item}
            onClick={() => setGrade(item)}
            disabled={loading}
          >
            {item === 'all' ? 'All grades' : `Grade ${item}`}
            <span>
              {
                submittedPlans.filter(
                  (plan) => item === 'all' || plan.learningOutcome.grade === item,
                ).length
              }
            </span>
          </button>
        ))}
      </div>

      <div className="review-queue-results" aria-busy={loading}>
        <p className="visually-hidden" role="status">
          {loading
            ? 'Loading review queue.'
            : error
              ? 'Review queue could not be refreshed.'
              : `${matchingPlans.length} plans awaiting review. Showing ${visiblePlans.length}, oldest first.`}
        </p>
        {error && (
          <div className="review-queue-error">
            <ErrorNotice error={error} onRetry={onReload} />
          </div>
        )}
        {loading && !plans.length ? (
          <p className="review-queue-loading">Loading submitted lessons…</p>
        ) : visiblePlans.length ? (
          <PlanActivityList plans={visiblePlans} forReview />
        ) : !error ? (
          <div className="recent-plans-empty">
            <span className="recent-plans-empty-icon">
              <ClipboardCheck size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <strong>
              {grade === 'all' ? 'You’re all caught up' : `No Grade ${grade} plans awaiting review`}
            </strong>
            <p>
              {grade === 'all'
                ? 'New teacher submissions will appear here when they are ready for your review.'
                : 'Choose another grade to see the rest of the queue.'}
            </p>
            {grade === 'all' ? (
              <Link className="button" to="/bank">
                Browse published lessons
              </Link>
            ) : (
              <button className="link-button" type="button" onClick={() => setGrade('all')}>
                Show all grades
              </button>
            )}
          </div>
        ) : null}
      </div>

      {firstPlan && (
        <footer className="recent-plans-footer review-queue-footer">
          <span>
            Showing {visiblePlans.length} of {matchingPlans.length} awaiting review
          </span>
          <Link to={`/plans/${firstPlan.id}`}>Review oldest plan</Link>
        </footer>
      )}
    </section>
  );
}
