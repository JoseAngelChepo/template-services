/**
 * Pipeline statuses are a global catalog — every client uses the same set.
 * Clients cannot invent statuses; that keeps reporting, UI, and automations
 * consistent as the number of workspaces grows.
 */
export enum TaskStatus {
  DRAFT = 'draft',
  VALIDATION = 'validation',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum TaskStatusGroup {
  INTAKE = 'intake',
  DELIVERY = 'delivery',
  CLOSED = 'closed',
}

/** Who may fire a transition. `operator` = platform admin (Kolyma). */
export type TaskTransitionActor = 'client' | 'operator' | 'any';

export type TaskTransition = {
  to: TaskStatus;
  actor: TaskTransitionActor;
};

export type TaskStatusDefinition = {
  id: TaskStatus;
  group: TaskStatusGroup;
  terminal: boolean;
};

export const TASK_STATUS_CATALOG: readonly TaskStatusDefinition[] = [
  { id: TaskStatus.DRAFT, group: TaskStatusGroup.INTAKE, terminal: false },
  { id: TaskStatus.VALIDATION, group: TaskStatusGroup.INTAKE, terminal: false },
  { id: TaskStatus.ACCEPTED, group: TaskStatusGroup.DELIVERY, terminal: false },
  { id: TaskStatus.IN_PROGRESS, group: TaskStatusGroup.DELIVERY, terminal: false },
  { id: TaskStatus.DONE, group: TaskStatusGroup.DELIVERY, terminal: true },
  { id: TaskStatus.REJECTED, group: TaskStatusGroup.CLOSED, terminal: true },
  { id: TaskStatus.CANCELLED, group: TaskStatusGroup.CLOSED, terminal: true },
] as const;

export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskTransition[]> = {
  [TaskStatus.DRAFT]: [
    { to: TaskStatus.VALIDATION, actor: 'client' },
    { to: TaskStatus.CANCELLED, actor: 'any' },
  ],
  [TaskStatus.VALIDATION]: [
    { to: TaskStatus.DRAFT, actor: 'client' },
    { to: TaskStatus.ACCEPTED, actor: 'operator' },
    { to: TaskStatus.REJECTED, actor: 'operator' },
  ],
  [TaskStatus.ACCEPTED]: [
    { to: TaskStatus.IN_PROGRESS, actor: 'operator' },
    { to: TaskStatus.CANCELLED, actor: 'any' },
  ],
  [TaskStatus.IN_PROGRESS]: [
    { to: TaskStatus.DONE, actor: 'operator' },
    { to: TaskStatus.VALIDATION, actor: 'operator' },
    { to: TaskStatus.CANCELLED, actor: 'any' },
  ],
  [TaskStatus.DONE]: [],
  [TaskStatus.REJECTED]: [
    { to: TaskStatus.DRAFT, actor: 'client' },
    { to: TaskStatus.CANCELLED, actor: 'any' },
  ],
  [TaskStatus.CANCELLED]: [{ to: TaskStatus.DRAFT, actor: 'client' }],
};

export function allowedTransitionsFor(
  from: TaskStatus,
  actor: TaskTransitionActor,
): TaskStatus[] {
  return TASK_STATUS_TRANSITIONS[from]
    .filter((transition) => {
      if (transition.actor === 'any') return true;
      if (actor === 'operator') return true;
      return transition.actor === actor;
    })
    .map((transition) => transition.to);
}

export function canTransition(
  from: TaskStatus,
  to: TaskStatus,
  actor: TaskTransitionActor,
): boolean {
  return allowedTransitionsFor(from, actor).includes(to);
}
