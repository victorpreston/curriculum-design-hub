import type { PlanStatus, Role } from '@hub/shared';

export interface Actor {
  id: string;
  name: string;
  role: Role;
}

export interface PlanOwnership {
  ownerId: string;
  status: PlanStatus;
}

export function canViewPlan(actor: Actor, plan: PlanOwnership): boolean {
  if (plan.ownerId === actor.id) return true;
  if (plan.status === 'published') return true;
  return actor.role === 'curriculum_lead' && plan.status !== 'draft';
}

export function isOwner(actor: Actor, plan: PlanOwnership): boolean {
  return plan.ownerId === actor.id;
}
