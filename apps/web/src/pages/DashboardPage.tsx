import { Link } from 'react-router-dom';
import { BookOpenCheck, FilePenLine, LibraryBig } from 'lucide-react';
import { DashboardStats, type DashboardStat } from '../components/DashboardStats';
import { ErrorNotice } from '../components/ErrorNotice';
import { MetricIcon } from '../components/MetricIcons';
import { RecentPlanningActivity } from '../components/RecentPlanningActivity';
import { ReviewQueueCard } from '../components/ReviewQueueCard';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';

function TeacherDashboard() {
  const plans = useResource(() => api.myPlans(), 'dashboard-teacher-plans');
  const list = plans.data?.plans ?? [];
  const drafts = list.filter(
    (plan) => plan.status === 'draft' || plan.status === 'returned',
  ).length;
  const submitted = list.filter((plan) => plan.status === 'submitted').length;
  const published = list.filter((plan) => plan.status === 'published').length;
  const grounded = list.filter((plan) => plan.groundingStatus === 'grounded').length;
  const stats: DashboardStat[] = [
    {
      label: 'My lesson plans',
      value: list.length,
      detail: 'Across all workflow stages',
      ratio: Math.min(list.length / 8, 1),
      tone: 'navy',
      icon: <MetricIcon name="plans" />,
    },
    {
      label: 'Needs your attention',
      value: drafts,
      detail: 'Drafts or returned plans',
      ratio: list.length ? drafts / list.length : 0,
      tone: 'gold',
      icon: <MetricIcon name="attention" />,
    },
    {
      label: 'In review',
      value: submitted,
      detail: 'Waiting for a lead decision',
      ratio: list.length ? submitted / list.length : 0,
      tone: 'purple',
      icon: <MetricIcon name="review" />,
    },
    {
      label: 'Published',
      value: published,
      detail: `${grounded} grounded plan${grounded === 1 ? '' : 's'} in your workspace`,
      ratio: list.length ? published / list.length : 0,
      tone: 'green',
      icon: <MetricIcon name="published" />,
    },
  ];

  return (
    <div className="dashboard stack">
      <div className="page-heading">
        <div>
          <h1>Plan with confidence</h1>
        </div>
        <Link className="button primary" to="/plans">
          Draft a lesson plan
        </Link>
      </div>
      <ErrorNotice error={plans.error} onRetry={plans.reload} />
      {plans.loading && !plans.data ? (
        <p className="muted">Loading your workspace…</p>
      ) : (
        <>
          <DashboardStats stats={stats} />
          <section className="dashboard-lower-grid">
            <RecentPlanningActivity plans={list} />
            <section className="card quick-actions" aria-labelledby="teacher-actions-heading">
              <h2 id="teacher-actions-heading">Keep moving</h2>
              <Link to="/plans" className="quick-action">
                <span className="quick-action-icon" aria-hidden="true">
                  <FilePenLine size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <strong>Create a new plan</strong>
                  <small>Choose a grade, outcome, and lesson length.</small>
                </span>
              </Link>
              <Link to="/bank" className="quick-action">
                <span className="quick-action-icon" aria-hidden="true">
                  <LibraryBig size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <strong>Browse the lesson bank</strong>
                  <small>Reuse approved plans from your curriculum team.</small>
                </span>
              </Link>
              <Link to="/guide" className="quick-action">
                <span className="quick-action-icon" aria-hidden="true">
                  <BookOpenCheck size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <strong>Understand the evidence</strong>
                  <small>See how retrieval and grounding protect quality.</small>
                </span>
              </Link>
            </section>
          </section>
        </>
      )}
    </div>
  );
}

function LeadDashboard() {
  const queue = useResource(() => api.reviewQueue(), 'dashboard-review-queue');
  const bank = useResource(() => api.lessonBank(), 'dashboard-lesson-bank');
  const reviewPlans = queue.data?.plans ?? [];
  const publishedPlans = bank.data?.plans ?? [];
  const groundedPublished = publishedPlans.filter(
    (plan) => plan.groundingStatus === 'grounded',
  ).length;
  const stats: DashboardStat[] = [
    {
      label: 'Awaiting review',
      value: reviewPlans.length,
      detail: 'Submitted by teachers',
      ratio: Math.min(reviewPlans.length / 6, 1),
      tone: 'gold',
      icon: <MetricIcon name="review" />,
    },
    {
      label: 'Published lessons',
      value: publishedPlans.length,
      detail: 'Available in the shared bank',
      ratio: Math.min(publishedPlans.length / 10, 1),
      tone: 'green',
      icon: <MetricIcon name="published" />,
    },
    {
      label: 'Grounded library',
      value: groundedPublished,
      detail: 'Published plans with evidence',
      ratio: publishedPlans.length ? groundedPublished / publishedPlans.length : 0,
      tone: 'purple',
      icon: <MetricIcon name="grounded" />,
    },
    {
      label: 'Curriculum coverage',
      value: 4,
      detail: 'Supported grades: 5 to 8',
      ratio: 1,
      tone: 'navy',
      icon: <MetricIcon name="coverage" />,
    },
  ];

  return (
    <div className="dashboard stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Curriculum lead workspace</span>
          <h1>Keep quality moving</h1>
          <p className="muted">
            Review teacher drafts, protect curriculum alignment, and grow a reusable lesson bank.
          </p>
        </div>
        <Link className="button primary" to="/review">
          Open review queue
        </Link>
      </div>
      <ErrorNotice error={bank.error} onRetry={bank.reload} />
      {queue.loading && !queue.data ? (
        <p className="muted">Loading your workspace…</p>
      ) : (
        <>
          <DashboardStats stats={stats} />
          <section className="dashboard-lower-grid">
            <ReviewQueueCard
              plans={reviewPlans}
              loading={queue.loading}
              error={queue.error}
              onReload={queue.reload}
            />
            <section className="card quick-actions" aria-labelledby="lead-actions-heading">
              <h2 id="lead-actions-heading">Lead actions</h2>
              <Link to="/review" className="quick-action">
                <span className="quick-action-icon">
                  <MetricIcon name="review" />
                </span>
                <span>
                  <strong>Review submitted work</strong>
                  <small>Approve aligned plans or return them with a clear comment.</small>
                </span>
              </Link>
              <Link to="/team" className="quick-action">
                <span className="quick-action-icon">
                  <MetricIcon name="team" />
                </span>
                <span>
                  <strong>View the teaching team</strong>
                  <small>Monitor planning activity without opening private drafts.</small>
                </span>
              </Link>
              <Link to="/bank" className="quick-action">
                <span className="quick-action-icon">
                  <MetricIcon name="library" />
                </span>
                <span>
                  <strong>Inspect the shared bank</strong>
                  <small>Check what teachers can already reuse.</small>
                </span>
              </Link>
              <Link to="/guide" className="quick-action">
                <span className="quick-action-icon">
                  <MetricIcon name="help" />
                </span>
                <span>
                  <strong>Review the quality model</strong>
                  <small>See how source evidence and workflow work together.</small>
                </span>
              </Link>
            </section>
          </section>
        </>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  return user?.role === 'curriculum_lead' ? <LeadDashboard /> : <TeacherDashboard />;
}
