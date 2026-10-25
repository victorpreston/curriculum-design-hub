import { Link } from 'react-router-dom';
import { DashboardStats, type DashboardStat } from '../components/DashboardStats';
import { ErrorNotice } from '../components/ErrorNotice';
import { PlanTable } from '../components/PlanTable';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';

function TeacherDashboard() {
  const plans = useResource(() => api.myPlans(), 'dashboard-teacher-plans');
  const list = plans.data?.plans ?? [];
  const drafts = list.filter((plan) => plan.status === 'draft' || plan.status === 'returned').length;
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
      icon: '◫',
    },
    {
      label: 'Needs your attention',
      value: drafts,
      detail: 'Drafts or returned plans',
      ratio: list.length ? drafts / list.length : 0,
      tone: 'gold',
      icon: '↗',
    },
    {
      label: 'In review',
      value: submitted,
      detail: 'Waiting for a lead decision',
      ratio: list.length ? submitted / list.length : 0,
      tone: 'purple',
      icon: '✓',
    },
    {
      label: 'Published',
      value: published,
      detail: `${grounded} grounded plan${grounded === 1 ? '' : 's'} in your workspace`,
      ratio: list.length ? published / list.length : 0,
      tone: 'green',
      icon: '★',
    },
  ];

  return (
    <div className="dashboard stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Teacher workspace</span>
          <h1>Plan with confidence</h1>
          <p className="muted">
            Start with the right Grade 5–8 outcome, draft from curriculum evidence, and keep your
            best lessons reusable.
          </p>
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
            <div className="card stack">
              <div className="section-heading">
                <div>
                  <h2>Recent planning activity</h2>
                  <p className="muted small">Your latest drafts, submissions, and published lessons.</p>
                </div>
                <Link to="/plans">View all</Link>
              </div>
              <PlanTable
                plans={list.slice(0, 5)}
                caption="Recent planning activity"
                emptyMessage="Your lesson planning activity will appear here."
              />
            </div>
            <section className="card quick-actions" aria-labelledby="teacher-actions-heading">
              <h2 id="teacher-actions-heading">Keep moving</h2>
              <Link to="/plans" className="quick-action">
                <span className="quick-action-icon">+</span>
                <span>
                  <strong>Create a new plan</strong>
                  <small>Choose a grade, outcome, and lesson length.</small>
                </span>
              </Link>
              <Link to="/bank" className="quick-action">
                <span className="quick-action-icon">▤</span>
                <span>
                  <strong>Browse the lesson bank</strong>
                  <small>Reuse approved plans from your curriculum team.</small>
                </span>
              </Link>
              <Link to="/guide" className="quick-action">
                <span className="quick-action-icon">?</span>
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
  const groundedPublished = publishedPlans.filter((plan) => plan.groundingStatus === 'grounded').length;
  const stats: DashboardStat[] = [
    {
      label: 'Awaiting review',
      value: reviewPlans.length,
      detail: 'Submitted by teachers',
      ratio: Math.min(reviewPlans.length / 6, 1),
      tone: 'gold',
      icon: '✓',
    },
    {
      label: 'Published lessons',
      value: publishedPlans.length,
      detail: 'Available in the shared bank',
      ratio: Math.min(publishedPlans.length / 10, 1),
      tone: 'green',
      icon: '★',
    },
    {
      label: 'Grounded library',
      value: groundedPublished,
      detail: 'Published plans with evidence',
      ratio: publishedPlans.length ? groundedPublished / publishedPlans.length : 0,
      tone: 'purple',
      icon: '⌁',
    },
    {
      label: 'Curriculum coverage',
      value: 4,
      detail: 'Supported grades: 5 to 8',
      ratio: 1,
      tone: 'navy',
      icon: '▦',
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
      <ErrorNotice error={queue.error ?? bank.error} onRetry={() => { queue.reload(); bank.reload(); }} />
      {queue.loading && !queue.data ? (
        <p className="muted">Loading your workspace…</p>
      ) : (
        <>
          <DashboardStats stats={stats} />
          <section className="dashboard-lower-grid">
            <div className="card stack">
              <div className="section-heading">
                <div>
                  <h2>Review queue</h2>
                  <p className="muted small">Oldest submitted plans are shown first.</p>
                </div>
                <Link to="/review">View queue</Link>
              </div>
              <PlanTable
                plans={reviewPlans.slice(0, 5)}
                caption="Review queue preview"
                emptyMessage="Nothing is waiting for review."
                showOwner
              />
            </div>
            <section className="card quick-actions" aria-labelledby="lead-actions-heading">
              <h2 id="lead-actions-heading">Lead actions</h2>
              <Link to="/review" className="quick-action">
                <span className="quick-action-icon">✓</span>
                <span>
                  <strong>Review submitted work</strong>
                  <small>Approve aligned plans or return them with a clear comment.</small>
                </span>
              </Link>
              <Link to="/team" className="quick-action">
                <span className="quick-action-icon">◎</span>
                <span>
                  <strong>View the teaching team</strong>
                  <small>Monitor planning activity without opening private drafts.</small>
                </span>
              </Link>
              <Link to="/bank" className="quick-action">
                <span className="quick-action-icon">▤</span>
                <span>
                  <strong>Inspect the shared bank</strong>
                  <small>Check what teachers can already reuse.</small>
                </span>
              </Link>
              <Link to="/guide" className="quick-action">
                <span className="quick-action-icon">?</span>
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
