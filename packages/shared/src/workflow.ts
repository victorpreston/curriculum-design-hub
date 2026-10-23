export const DOCUMENT_TYPES = [
  'learning_outcomes',
  'scheme_of_work',
  'assessment',
  'teacher_guide',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const ROLES = ['teacher', 'curriculum_lead'] as const;
export type Role = (typeof ROLES)[number];

export const PLAN_STATUSES = ['draft', 'submitted', 'returned', 'published'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const EDITABLE_STATUSES: readonly PlanStatus[] = ['draft', 'returned'];

export const GROUNDING_STATUSES = ['grounded', 'weak', 'ungrounded'] as const;
export type GroundingStatus = (typeof GROUNDING_STATUSES)[number];

export const WORKFLOW_ACTIONS = ['submit', 'approve', 'return'] as const;
export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

export interface WorkflowRule {
  from: readonly PlanStatus[];
  to: PlanStatus;
  role: Role;
  ownerOnly: boolean;
  commentRequired: boolean;
  requiresGrounding: boolean;
}

export const WORKFLOW_RULES: Record<WorkflowAction, WorkflowRule> = {
  submit: {
    from: ['draft', 'returned'],
    to: 'submitted',
    role: 'teacher',
    ownerOnly: true,
    commentRequired: false,
    requiresGrounding: true,
  },
  approve: {
    from: ['submitted'],
    to: 'published',
    role: 'curriculum_lead',
    ownerOnly: false,
    commentRequired: false,
    requiresGrounding: false,
  },
  return: {
    from: ['submitted'],
    to: 'returned',
    role: 'curriculum_lead',
    ownerOnly: false,
    commentRequired: true,
    requiresGrounding: false,
  },
};

export function isEditable(status: PlanStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}
