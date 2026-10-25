import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, ChevronRight, FileText } from 'lucide-react';
import type { PlanSummaryDto } from '@hub/shared';
import { formatDateTime } from '../lib/format';
import { GroundingBadge, StatusBadge } from './Badges';
import { DataTableFrame } from './DataTableFrame';

interface PlanTableProps {
  plans: PlanSummaryDto[];
  caption: string;
  emptyMessage: string;
  showOwner?: boolean;
}

export function PlanTable({ plans, caption, emptyMessage, showOwner = false }: PlanTableProps) {
  const [sort, setSort] = useState('updated');
  const visiblePlans = [...plans].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'grade')
      return a.learningOutcome.grade - b.learningOutcome.grade || a.title.localeCompare(b.title);
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });

  return (
    <DataTableFrame
      title={caption}
      countLabel={`${plans.length} ${plans.length === 1 ? 'lesson' : 'lessons'}`}
      tools={
        <label className="data-sort-control">
          <span className="visually-hidden">Sort lesson plans</span>
          <ArrowUpDown size={14} aria-hidden="true" />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="updated">Recently updated</option>
            <option value="title">Lesson A–Z</option>
            <option value="grade">Grade, low to high</option>
          </select>
        </label>
      }
      footer={
        <span role="status">
          {plans.length} {plans.length === 1 ? 'lesson' : 'lessons'}
        </span>
      }
    >
      {visiblePlans.length ? (
        <table
          className={`plan-table data-table lesson-table${showOwner ? ' lesson-table-with-owner' : ''}`}
          role="table"
        >
          <caption className="visually-hidden">{caption}</caption>
          <colgroup>
            <col className="lesson-col-title" />
            <col className="lesson-col-curriculum" />
            {showOwner && <col className="lesson-col-owner" />}
            <col className="lesson-col-status" />
            <col className="lesson-col-updated" />
            <col className="lesson-col-action" />
          </colgroup>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col">Lesson</th>
              <th scope="col">Curriculum</th>
              {showOwner && <th scope="col">Teacher</th>}
              <th scope="col">Status</th>
              <th scope="col">Updated</th>
              <th scope="col">
                <span className="visually-hidden">Open lesson</span>
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {visiblePlans.map((plan) => (
              <tr key={plan.id} role="row">
                <td data-label="Lesson" role="cell">
                  <div className="table-identity">
                    <span className="table-document-icon" aria-hidden="true">
                      <FileText size={17} strokeWidth={1.75} />
                    </span>
                    <div>
                      <Link className="table-primary-link" to={`/plans/${plan.id}`}>
                        {plan.title}
                      </Link>
                      <span className="table-secondary">
                        {plan.durationMinutes} min · Version {plan.currentVersion}
                      </span>
                    </div>
                  </div>
                </td>
                <td data-label="Curriculum" role="cell">
                  <div className="table-curriculum">
                    <div className="table-curriculum-tags">
                      <span className="table-grade">Grade {plan.learningOutcome.grade}</span>
                      <span className="table-outcome-code">{plan.learningOutcome.code}</span>
                    </div>
                    <span
                      className="table-secondary table-outcome-description"
                      title={plan.learningOutcome.description}
                    >
                      {plan.learningOutcome.description}
                    </span>
                  </div>
                </td>
                {showOwner && (
                  <td data-label="Teacher" role="cell">
                    <span className="table-owner">{plan.owner.name}</span>
                  </td>
                )}
                <td data-label="Status" role="cell">
                  <div className="table-statuses">
                    <StatusBadge status={plan.status} compact />
                    <GroundingBadge status={plan.groundingStatus} compact />
                  </div>
                </td>
                <td data-label="Updated" role="cell">
                  <time className="table-timestamp" dateTime={plan.updatedAt}>
                    {formatDateTime(plan.updatedAt)}
                  </time>
                </td>
                <td className="table-action-cell" role="cell">
                  <Link
                    className="table-open"
                    to={`/plans/${plan.id}`}
                    aria-label={`Open ${plan.title}`}
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="data-table-empty">
          <FileText size={24} strokeWidth={1.5} aria-hidden="true" />
          <strong>No lessons yet</strong>
          <p>{emptyMessage}</p>
        </div>
      )}
    </DataTableFrame>
  );
}
