import { Link } from 'react-router';
import type { Onboarding } from '../api/onboarding';
import { dueLabel } from '../lib/dates';

export function OnboardingCard({ onboarding }: { onboarding: Onboarding }) {
  const { done, total } = onboarding.progress;
  const percent = total === 0 ? 100 : Math.round((done / total) * 100);
  const tasks = onboarding.phases.flatMap((p) => p.tasks);
  const next = tasks.find((t) => t.status === 'todo');
  const waiting = tasks.some((t) => t.status === 'waiting_on_company');

  return (
    <Link to="/onboarding" className="card onboarding-card">
      <h2>Onboarding</h2>
      <p className="progress-text">
        {done} of {total} steps done
      </p>
      <div
        className="progress"
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      {next && (
        <p className="onboarding-next">
          <strong>Next: {next.title}</strong>
          <br />
          {dueLabel(next.dueAt).text}
        </p>
      )}
      {!next && waiting && (
        <p className="onboarding-next">
          Everything on your side is done. The rest is waiting on the company.
        </p>
      )}
      {!next && !waiting && <p className="onboarding-next">All steps are done.</p>}
    </Link>
  );
}
