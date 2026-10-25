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

const COMPACT_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: 'Draft',
  submitted: 'In review',
  returned: 'Returned',
  published: 'Published',
};

const COMPACT_GROUNDING_LABEL: Record<GroundingStatus, string> = {
  grounded: 'Grounded',
  weak: 'Weak evidence',
  ungrounded: 'No evidence',
};

export function StatusBadge({
  status,
  compact = false,
}: {
  status: PlanStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={`badge status-${status}`}
      title={compact ? STATUS_LABEL[status] : undefined}
      aria-label={compact ? STATUS_LABEL[status] : undefined}
    >
      {compact ? COMPACT_STATUS_LABEL[status] : STATUS_LABEL[status]}
    </span>
  );
}

export function GroundingBadge({
  status,
  compact = false,
}: {
  status: GroundingStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={`badge grounding-${status}`}
      title={compact ? GROUNDING_LABEL[status] : undefined}
      aria-label={compact ? GROUNDING_LABEL[status] : undefined}
    >
      {compact ? COMPACT_GROUNDING_LABEL[status] : GROUNDING_LABEL[status]}
    </span>
  );
}
