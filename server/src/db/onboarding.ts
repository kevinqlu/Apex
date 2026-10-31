import type { OnboardingTemplate, Task } from '../config/onboarding.js';
import type { Db } from './index.js';

// done: finished. todo: the driver has to do it. waiting: the company has to do it.
export type TaskStatus = 'done' | 'todo' | 'waiting';

export interface TaskView {
  id: string;
  title: string;
  description: string;
  type: Task['type'];
  optional: boolean;
  docType?: string;
  ownerLabel?: string;
  minutes?: number;
  dueAt: string;
  status: TaskStatus;
  completedAt?: string;
  // Extra words for the driver, such as "Under review" for an uploaded document.
  note?: string;
}

export interface OnboardingView {
  phases: { id: string; title: string; tasks: TaskView[] }[];
  progress: { done: number; total: number };
}

const DAY = 24 * 3_600_000;

interface ProgressRow {
  task_id: string;
  completed_at: string;
}

interface DocumentRow {
  type: string;
  status: 'review' | 'approved';
  uploaded_at: string;
}

// Everything here comes from the template and this driver's own rows. Phases and tasks
// keep the order of the file, so reordering the template reorders the screen.
export function buildOnboarding(
  db: Db,
  template: OnboardingTemplate,
  driverId: string,
): OnboardingView {
  const hired = db.prepare('SELECT hired_at FROM drivers WHERE id = ?').get(driverId) as
    { hired_at: string } | undefined;
  const hiredAt = Date.parse(hired?.hired_at ?? '');

  const progress = new Map(
    (
      db
        .prepare('SELECT task_id, completed_at FROM onboarding_progress WHERE driver_id = ?')
        .all(driverId) as ProgressRow[]
    ).map((row) => [row.task_id, row.completed_at]),
  );
  // Newest upload per document type wins.
  const documents = new Map(
    (
      db
        .prepare(
          'SELECT type, status, uploaded_at FROM documents WHERE driver_id = ? ORDER BY uploaded_at',
        )
        .all(driverId) as DocumentRow[]
    ).map((row) => [row.type, row]),
  );

  const view = (task: Task): TaskView => {
    const base = {
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      optional: task.optional,
      docType: task.docType,
      ownerLabel: task.ownerLabel,
      minutes: task.minutes,
      dueAt: new Date(hiredAt + task.dueDay * DAY).toISOString(),
    };
    // An upload task is done when the document exists. It is never marked done by hand.
    const document =
      task.type === 'upload' && task.docType ? documents.get(task.docType) : undefined;
    const completedAt = document?.uploaded_at ?? progress.get(task.id);
    if (completedAt) {
      const note = document?.status === 'review' ? 'Under review' : undefined;
      return { ...base, status: 'done', completedAt, note };
    }
    return { ...base, status: task.type === 'company' ? 'waiting' : 'todo' };
  };

  const phases = template.phases.map((phase) => ({
    id: phase.id,
    title: phase.title,
    tasks: template.tasks.filter((t) => t.phase === phase.id).map(view),
  }));

  const counted = phases.flatMap((p) => p.tasks).filter((t) => !t.optional);
  return {
    phases,
    progress: { done: counted.filter((t) => t.status === 'done').length, total: counted.length },
  };
}

// Safe to repeat: the first completion time is kept.
export function recordCompletion(
  db: Db,
  driverId: string,
  taskId: string,
  detail?: unknown,
  now = Date.now(),
): void {
  db.prepare(
    `INSERT OR IGNORE INTO onboarding_progress (driver_id, task_id, completed_at, detail_json)
     VALUES (?, ?, ?, ?)`,
  ).run(
    driverId,
    taskId,
    new Date(now).toISOString(),
    detail === undefined ? null : JSON.stringify(detail),
  );
}
