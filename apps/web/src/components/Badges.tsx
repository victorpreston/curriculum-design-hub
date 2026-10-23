import type { GroundingStatus, PlanStatus } from '@hub/shared';

const STATUS_LABEL: Record<PlanStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted for review',
  returned: 'Returned with comments',
  published: 'Published',
};

const GROUNDING_LABEL: Record<GroundingStatus, string> = {
  grounded: 'Grounded in curriculum',
  weak: 'Weakly grounded',
  ungrounded: 'Not grounded',
};

export function StatusBadge({ status }: { status: PlanStatus }) {
  return <span className={`badge status-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function GroundingBadge({ status }: { status: GroundingStatus }) {
  return <span className={`badge grounding-${status}`}>{GROUNDING_LABEL[status]}</span>;
}
