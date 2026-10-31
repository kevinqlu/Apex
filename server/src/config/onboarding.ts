import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type TaskType = 'video' | 'upload' | 'esign' | 'company';

export interface Phase {
  id: string;
  title: string;
}

export interface Task {
  id: string;
  phase: string;
  title: string;
  description: string;
  type: TaskType;
  dueDay: number;
  optional: boolean;
  docType?: string;
  ownerLabel?: string;
  minutes?: number;
}

export interface OnboardingTemplate {
  phases: Phase[];
  tasks: Task[];
}

// Thrown for any problem with the template. The message is written for the person who
// edits the file, so the server prints it as it is and stops.
export class TemplateError extends Error {}

export const TEMPLATE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../config/onboarding.template.json',
);

const TASK_TYPES: readonly string[] = ['video', 'upload', 'esign', 'company'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fail = (where: string, problem: string): never => {
  throw new TemplateError(`Onboarding template, ${where}: ${problem}`);
};

function text(obj: Record<string, unknown>, key: string, where: string, why?: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || !value.trim()) {
    fail(where, `"${key}" is required and must be text${why ? ` (${why})` : ''}.`);
  }
  return value as string;
}

// Each type has the fields that only make sense for it. A stray field is an error, because
// it usually means the type was changed and the rest of the task was not.
function typeFields(task: Record<string, unknown>, type: TaskType, where: string) {
  const only: Record<string, TaskType> = {
    docType: 'upload',
    ownerLabel: 'company',
    minutes: 'video',
  };
  for (const [field, owner] of Object.entries(only)) {
    if (task[field] !== undefined && type !== owner) {
      fail(where, `"${field}" is only for "${owner}" tasks, but this task is "${type}".`);
    }
  }
  const fields: Pick<Task, 'docType' | 'ownerLabel' | 'minutes'> = {};
  if (type === 'upload') {
    fields.docType = text(
      task,
      'docType',
      where,
      'it says which document finishes this task, such as "cdl"',
    );
  }
  if (type === 'company') {
    fields.ownerLabel = text(
      task,
      'ownerLabel',
      where,
      'it says who the driver is waiting on, such as "Safety Department"',
    );
  }
  if (type === 'video' && task.minutes !== undefined) {
    const minutes = task.minutes;
    if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1) {
      fail(where, `"minutes" must be a whole number, 1 or more.`);
    }
    fields.minutes = minutes as number;
  }
  return fields;
}

export function validateTemplate(raw: unknown): OnboardingTemplate {
  if (!isObject(raw))
    return fail('the file', 'it must be a JSON object with "phases" and "tasks".');
  if (!Array.isArray(raw.phases) || raw.phases.length === 0) {
    fail('the file', '"phases" must be a list with at least one phase.');
  }
  if (!Array.isArray(raw.tasks) || raw.tasks.length === 0) {
    fail('the file', '"tasks" must be a list with at least one task.');
  }

  const phases: Phase[] = [];
  (raw.phases as unknown[]).forEach((item, i) => {
    const where = `phase #${i + 1}`;
    if (!isObject(item)) return fail(where, 'it must be an object with "id" and "title".');
    const id = text(item, 'id', where);
    if (phases.some((p) => p.id === id)) fail(where, `the phase id "${id}" is used twice.`);
    phases.push({ id, title: text(item, 'title', `phase "${id}"`) });
  });

  const tasks: Task[] = [];
  (raw.tasks as unknown[]).forEach((item, i) => {
    const position = `task #${i + 1}`;
    if (!isObject(item)) return fail(position, 'it must be an object.');
    const id = text(item, 'id', position);
    const where = `task "${id}"`;
    if (tasks.some((t) => t.id === id)) fail(where, `the task id "${id}" is used twice.`);

    const phase = text(item, 'phase', where);
    if (!phases.some((p) => p.id === phase)) {
      fail(
        where,
        `"phase" is "${phase}", which is not one of: ${phases.map((p) => p.id).join(', ')}.`,
      );
    }
    const type = text(item, 'type', where);
    if (!TASK_TYPES.includes(type)) {
      fail(where, `"type" is "${type}", but it must be one of: ${TASK_TYPES.join(', ')}.`);
    }
    const dueDay = item.dueDay;
    if (typeof dueDay !== 'number' || !Number.isInteger(dueDay) || dueDay < 0) {
      fail(
        where,
        '"dueDay" is required and must be a whole number of days after the hire date, 0 or more.',
      );
    }
    if (item.optional !== undefined && typeof item.optional !== 'boolean') {
      fail(where, '"optional" must be true or false.');
    }

    tasks.push({
      id,
      phase,
      title: text(item, 'title', where),
      description: text(item, 'description', where),
      type: type as TaskType,
      dueDay: dueDay as number,
      optional: item.optional === true,
      ...typeFields(item, type as TaskType, where),
    });
  });

  return { phases, tasks };
}

// Called once at startup, so a bad edit stops the server with a clear message
// instead of breaking a driver's screen later.
export function loadTemplate(file = TEMPLATE_PATH): OnboardingTemplate {
  let contents: string;
  try {
    contents = fs.readFileSync(file, 'utf8');
  } catch {
    throw new TemplateError(`Onboarding template: could not read the file at ${file}.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'it is not valid JSON';
    throw new TemplateError(`Onboarding template: the file is not valid JSON (${reason}).`);
  }
  return validateTemplate(parsed);
}
