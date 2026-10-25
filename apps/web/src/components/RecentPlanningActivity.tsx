import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlanSummaryDto } from '@hub/shared';
import { MetricIcon } from './MetricIcons';
import { PlanActivityList } from './PlanActivityList';

const filters = [
  { id: 'all', label: 'All plans' },
  { id: 'draft', label: 'Drafts' },
  { id: 'submitted', label: 'In review' },
  { id: 'published', label: 'Published' },
] as const;

type ActivityFilter = (typeof filters)[number]['id'];

function matchesFilter(plan: PlanSummaryDto, filter: ActivityFilter) {
  return (
    filter === 'all' || plan.status === filter || (filter === 'draft' && plan.status === 'returned')
  );
}

export function RecentPlanningActivity({ plans }: { plans: PlanSummaryDto[] }) {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const matchingPlans = plans.filter((plan) => matchesFilter(plan, filter));
  const recentPlans = [...matchingPlans]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 5);

  return (
    <section className="recent-plans" aria-labelledby="recent-plans-heading">
      <header className="recent-plans-heading">
        <div>
          <h2 id="recent-plans-heading">Recent planning activity</h2>
          <p>Your latest drafts, submissions, and published lessons.</p>
        </div>
        <Link className="recent-plans-view-all" to="/plans">
          View all plans
        </Link>
      </header>

      <div className="recent-plans-filters" role="group" aria-label="Filter recent plans">
        {filters.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span>{plans.filter((plan) => matchesFilter(plan, item.id)).length}</span>
          </button>
        ))}
      </div>

      <div id="recent-plans-results" className="recent-plans-results">
        <p className="visually-hidden" role="status">
          {matchingPlans.length}{' '}
          {filter === 'all'
            ? 'plans'
            : filters.find((item) => item.id === filter)?.label.toLowerCase()}
          . Showing {recentPlans.length} most recently updated.
        </p>
        {recentPlans.length ? (
          <PlanActivityList plans={recentPlans} />
        ) : (
          <div className="recent-plans-empty">
            <span className="recent-plans-empty-icon">
              <MetricIcon name="plans" />
            </span>
            <strong>
              {plans.length ? 'No plans in this stage yet' : 'Your next lesson starts here'}
            </strong>
            <p>
              {plans.length
                ? 'Choose another filter to see your lesson plans.'
                : 'Create a curriculum-grounded draft to start your planning history.'}
            </p>
            {plans.length ? (
              <button type="button" className="link-button" onClick={() => setFilter('all')}>
                Show all plans
              </button>
            ) : (
              <Link className="button primary" to="/plans">
                Draft a lesson plan
              </Link>
            )}
          </div>
        )}
      </div>
      {recentPlans.length > 0 && (
        <footer className="recent-plans-footer">
          Showing {recentPlans.length} of {matchingPlans.length} plans · Most recently updated first
        </footer>
      )}
    </section>
  );
}
