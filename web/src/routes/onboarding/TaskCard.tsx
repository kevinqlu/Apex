import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../../api/client';
import {
  completeTask,
  demoCompleteTask,
  type Onboarding,
  type OnboardingTask,
} from '../../api/onboarding';
import { DrivingNotice } from '../../components/DrivingNotice';
import { Icon, type IconName } from '../../components/Icon';
import { dueLabel } from '../../lib/dates';
import { formatDay, formatWhen } from '../../lib/format';

interface Props {
  task: OnboardingTask;
  demoActions: boolean;
  onChange: (onboarding: Onboarding) => void;
}

const chips: Record<OnboardingTask['status'], { icon: IconName; className: string }> = {
  done: { icon: 'checkCircle', className: 'chip chip-done' },
  todo: { icon: 'circle', className: 'chip' },
  waiting_on_company: { icon: 'hourglass', className: 'chip chip-pending' },
};

export function TaskCard({ task, demoActions, onChange }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<Onboarding>) {
    setError(null);
    setBusy(true);
    try {
      onChange(await action());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const chip = chips[task.status];
  const statusText =
    task.status === 'done'
      ? 'Done'
      : task.status === 'waiting_on_company'
        ? `Waiting on ${task.ownerLabel}`
        : 'To do';
  const due = task.status === 'todo' ? dueLabel(task.dueAt) : null;

  return (
    <article className="card task">
      <header className="task-head">
        <h3 className="task-title">{task.title}</h3>
        <span className={chip.className}>
          <Icon name={chip.icon} />
          {statusText}
        </span>
      </header>

      <p className="task-description">{task.description}</p>

      {due && (
        <p className={due.overdue ? 'task-due task-overdue' : 'task-due'}>
          {due.overdue && <Icon name="warning" />}
          {due.text}
        </p>
      )}
      {task.status === 'waiting_on_company' && (
        <p className="task-due">
          Expected by {formatDay(task.dueAt)}. You do not need to do anything.
        </p>
      )}
      {task.status === 'done' && task.completedAt && (
        <p className="task-due">
          Finished {formatWhen(task.completedAt)}
          {task.note ? `. ${task.note}.` : ''}
        </p>
      )}

      {task.status === 'todo' && task.type === 'video' && (
        <>
          {task.minutes && <p className="task-due">About {task.minutes} minutes</p>}
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={() => void run(() => completeTask(task.id))}
          >
            I watched the video
          </button>
        </>
      )}

      {task.status === 'todo' && task.type === 'upload' && (
        <Link to="/documents" className="button button-primary">
          Go to Documents
        </Link>
      )}

      {task.status === 'todo' && task.type === 'esign' && (
        <form
          className="task-form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void run(() => completeTask(task.id, { name }));
          }}
        >
          <DrivingNotice />
          <label htmlFor={`sign-${task.id}`}>Type your full name to sign</label>
          <input
            id={`sign-${task.id}`}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="button button-primary" disabled={busy}>
            Sign with my name
          </button>
        </form>
      )}

      {task.status === 'waiting_on_company' && demoActions && (
        <button
          type="button"
          className="button demo-button"
          disabled={busy}
          onClick={() => void run(() => demoCompleteTask(task.id))}
        >
          Demo: mark complete as {task.ownerLabel}
        </button>
      )}

      {error && (
        <p className="message message-error" role="alert">
          <Icon name="error" />
          <span>{error}</span>
        </p>
      )}
    </article>
  );
}
