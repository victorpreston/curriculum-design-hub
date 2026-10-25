import { DashboardStats, type DashboardStat } from '../components/DashboardStats';
import { ErrorNotice } from '../components/ErrorNotice';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useResource } from '../lib/useResource';

export function TeamPage() {
  const teachers = useResource(() => api.teachers(), 'teaching-team');
  const roster = teachers.data?.teachers ?? [];
  const totalPlans = roster.reduce((sum, teacher) => sum + teacher.totalPlans, 0);
  const submittedPlans = roster.reduce((sum, teacher) => sum + teacher.submittedPlans, 0);
  const publishedPlans = roster.reduce((sum, teacher) => sum + teacher.publishedPlans, 0);
  const activeTeachers = roster.filter((teacher) => teacher.totalPlans > 0).length;
  const stats: DashboardStat[] = [
    {
      label: 'Teachers',
      value: roster.length,
      detail: `${activeTeachers} active in this workspace`,
      ratio: roster.length ? activeTeachers / roster.length : 0,
      tone: 'navy',
      icon: '◎',
    },
    {
      label: 'Plans created',
      value: totalPlans,
      detail: 'Across the teaching team',
      ratio: Math.min(totalPlans / 12, 1),
      tone: 'purple',
      icon: '◫',
    },
    {
      label: 'Waiting for review',
      value: submittedPlans,
      detail: 'Submitted plans requiring a decision',
      ratio: Math.min(submittedPlans / 6, 1),
      tone: 'gold',
      icon: '✓',
    },
    {
      label: 'Published lessons',
      value: publishedPlans,
      detail: 'Reusable curriculum-aligned plans',
      ratio: Math.min(publishedPlans / 10, 1),
      tone: 'green',
      icon: '★',
    },
  ];

  return (
    <section className="team-page stack" aria-labelledby="team-heading">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Lead workspace</span>
          <h1 id="team-heading">Teaching team</h1>
          <p className="muted">
            See who is planning, what needs review, and how the shared lesson bank is growing.
            Private draft content remains protected.
          </p>
        </div>
      </div>
      <ErrorNotice error={teachers.error} onRetry={teachers.reload} />
      {teachers.loading && !teachers.data ? (
        <p className="muted">Loading teaching team…</p>
      ) : (
        <>
          <DashboardStats stats={stats} />
          <div className="card team-table-wrap">
            <div className="section-heading">
              <div>
                <h2>Teacher activity</h2>
                <p className="muted small">
                  Summary counts only. Open submitted plans from the review queue when you need to
                  assess curriculum alignment.
                </p>
              </div>
            </div>
            {roster.length === 0 ? (
              <p className="empty">No teacher accounts are available.</p>
            ) : (
              <div className="team-table-scroll">
                <table className="plan-table team-table">
                  <caption className="visually-hidden">Teacher activity summary</caption>
                  <thead>
                    <tr>
                      <th scope="col">Teacher</th>
                      <th scope="col">Plans</th>
                      <th scope="col">Needs review</th>
                      <th scope="col">Published</th>
                      <th scope="col">Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((teacher) => (
                      <tr key={teacher.id}>
                        <td>
                          <strong>{teacher.name}</strong>
                          <div className="muted small">{teacher.email}</div>
                        </td>
                        <td>{teacher.totalPlans}</td>
                        <td>
                          {teacher.submittedPlans > 0 ? (
                            <span className="badge status-submitted">{teacher.submittedPlans} submitted</span>
                          ) : (
                            <span className="muted small">None</span>
                          )}
                        </td>
                        <td>{teacher.publishedPlans}</td>
                        <td>
                          {teacher.lastActivityAt ? formatDateTime(teacher.lastActivityAt) : 'No activity yet'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
