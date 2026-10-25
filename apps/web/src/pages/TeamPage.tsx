import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, RefreshCw, UsersRound } from 'lucide-react';
import { DataTableFrame } from '../components/DataTableFrame';
import { ErrorNotice } from '../components/ErrorNotice';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useResource } from '../lib/useResource';

export function TeamPage() {
  const teachers = useResource(() => api.teachers(), 'teaching-team');
  const roster = teachers.data?.teachers ?? [];
  const [sort, setSort] = useState('name');
  const visibleTeachers = [...roster].sort((a, b) => {
    if (sort === 'review')
      return b.submittedPlans - a.submittedPlans || a.name.localeCompare(b.name);
    if (sort === 'activity')
      return (
        Date.parse(b.lastActivityAt ?? '1970-01-01') - Date.parse(a.lastActivityAt ?? '1970-01-01')
      );
    return a.name.localeCompare(b.name);
  });

  return (
    <section className="team-page stack" aria-labelledby="team-heading">
      <div className="page-heading">
        <div>
          <h1 id="team-heading">Teaching team</h1>
          <p className="muted">Teacher accounts and planning activity, at a glance.</p>
        </div>
        <Link className="button" to="/review">
          Open review queue
        </Link>
      </div>
      <ErrorNotice error={teachers.error} onRetry={teachers.reload} />
      {teachers.loading && !teachers.data ? (
        <p className="muted">Loading teaching team…</p>
      ) : (
        <DataTableFrame
          title="Teacher directory"
          countLabel={`${roster.length} ${roster.length === 1 ? 'teacher' : 'teachers'}`}
          tools={
            <>
              <label className="data-sort-control">
                <span className="visually-hidden">Sort teachers</span>
                <ArrowUpDown size={14} aria-hidden="true" />
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="name">Teacher A–Z</option>
                  <option value="review">Most awaiting review</option>
                  <option value="activity">Latest activity</option>
                </select>
              </label>
              <button
                className="data-panel-refresh"
                type="button"
                onClick={teachers.reload}
                disabled={teachers.loading}
                aria-label="Refresh teaching team"
              >
                <RefreshCw size={15} aria-hidden="true" />
              </button>
            </>
          }
          footer={
            <>
              <span>Activity counts only. Draft lesson content stays private.</span>
            </>
          }
        >
          {visibleTeachers.length ? (
            <table className="plan-table data-table team-table" role="table">
              <caption className="visually-hidden">Teacher activity summary</caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col">Teacher</th>
                  <th scope="col" className="table-number">
                    Plans
                  </th>
                  <th scope="col">Awaiting review</th>
                  <th scope="col" className="table-number">
                    Published
                  </th>
                  <th scope="col">Last activity</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {visibleTeachers.map((teacher) => (
                  <tr key={teacher.id} role="row">
                    <td data-label="Teacher" role="cell">
                      <div className="table-identity">
                        <span className="table-avatar" aria-hidden="true">
                          {teacher.name
                            .trim()
                            .split(/\s+/)
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <div>
                          <strong className="table-teacher-name">{teacher.name}</strong>
                          <span className="table-secondary">{teacher.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="table-number" data-label="Plans" role="cell">
                      {teacher.totalPlans}
                    </td>
                    <td data-label="Awaiting review" role="cell">
                      {teacher.submittedPlans > 0 ? (
                        <span className="badge status-submitted">
                          {teacher.submittedPlans} awaiting review
                        </span>
                      ) : (
                        <span className="table-secondary">Up to date</span>
                      )}
                    </td>
                    <td className="table-number" data-label="Published" role="cell">
                      <span className={teacher.publishedPlans ? 'table-published-count' : 'muted'}>
                        {teacher.publishedPlans}
                      </span>
                    </td>
                    <td data-label="Last activity" role="cell">
                      {teacher.lastActivityAt ? (
                        <time className="table-timestamp" dateTime={teacher.lastActivityAt}>
                          {formatDateTime(teacher.lastActivityAt)}
                        </time>
                      ) : (
                        <span className="table-secondary">No activity yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="data-table-empty">
              <UsersRound size={24} strokeWidth={1.5} aria-hidden="true" />
              <strong>No teachers yet</strong>
              <p>Teacher accounts will appear here once they are available.</p>
            </div>
          )}
        </DataTableFrame>
      )}
    </section>
  );
}
