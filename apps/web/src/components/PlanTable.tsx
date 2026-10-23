import { Link } from 'react-router-dom';
import type { PlanSummaryDto } from '@hub/shared';
import { formatDateTime } from '../lib/format';
import { GroundingBadge, StatusBadge } from './Badges';

interface PlanTableProps {
  plans: PlanSummaryDto[];
  caption: string;
  emptyMessage: string;
  showOwner?: boolean;
}

export function PlanTable({ plans, caption, emptyMessage, showOwner = false }: PlanTableProps) {
  if (plans.length === 0) return <p className="empty">{emptyMessage}</p>;
  return (
    <table className="plan-table">
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Lesson</th>
          <th scope="col">Outcome</th>
          {showOwner && <th scope="col">Teacher</th>}
          <th scope="col">Status</th>
          <th scope="col">Updated</th>
        </tr>
      </thead>
      <tbody>
        {plans.map((plan) => (
          <tr key={plan.id}>
            <td>
              <Link to={`/plans/${plan.id}`}>{plan.title}</Link>
              <div className="muted">
                {plan.durationMinutes} min · v{plan.currentVersion}
              </div>
            </td>
            <td>
              <span className="grade-chip">Grade {plan.learningOutcome.grade}</span>
              <br />
              <span className="code">{plan.learningOutcome.code}</span>{' '}
              {plan.learningOutcome.description}
            </td>
            {showOwner && <td>{plan.owner.name}</td>}
            <td>
              <div className="badges">
                <StatusBadge status={plan.status} />
                <GroundingBadge status={plan.groundingStatus} />
              </div>
            </td>
            <td>{formatDateTime(plan.updatedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
