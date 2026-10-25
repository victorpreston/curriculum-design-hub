import { ErrorNotice } from '../components/ErrorNotice';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useResource } from '../lib/useResource';

export function TeamPage() {
  const teachers = useResource(() => api.teachers(), 'teaching-team');
  const roster = teachers.data?.teachers ?? [];

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
