import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardCheck, FilePenLine, CircleCheck } from 'lucide-react';
import type { PlanSummaryDto } from '@hub/shared';
import { formatDateTime } from '../lib/format';
import { GroundingBadge, StatusBadge } from './Badges';

export function PlanActivityList({
  plans,
  forReview = false,
}: {
  plans: PlanSummaryDto[];
  forReview?: boolean;
}) {
  return (
    <ul className="recent-plans-list">
      {plans.map((plan) => {
        const Icon =
          plan.status === 'published'
            ? CircleCheck
            : plan.status === 'submitted'
              ? ClipboardCheck
              : FilePenLine;

        return (
          <li key={plan.id}>
            <Link className="recent-plan" to={`/plans/${plan.id}`}>
              <span
                className={`recent-plan-icon recent-plan-icon-${plan.status}`}
                aria-hidden="true"
              >
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <div className="recent-plan-content">
                <div className="recent-plan-topline">
                  <strong>{plan.title}</strong>
                  {forReview ? (
                    <span className="recent-plan-review-action">
                      Review <ChevronRight size={14} aria-hidden="true" />
                    </span>
                  ) : (
                    <StatusBadge status={plan.status} />
                  )}
                </div>
                {forReview && <span className="recent-plan-teacher">By {plan.owner.name}</span>}
                <div className="recent-plan-meta">
                  <span>Grade {plan.learningOutcome.grade}</span>
                  <span>{plan.durationMinutes} min</span>
                  <span>Version {plan.currentVersion}</span>
                  <span title={plan.learningOutcome.description}>{plan.learningOutcome.code}</span>
                </div>
                <div className="recent-plan-bottomline">
                  <GroundingBadge status={plan.groundingStatus} />
                  <time dateTime={plan.updatedAt}>
                    {forReview && 'Submitted '}
                    {formatDateTime(plan.updatedAt)}
                  </time>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
