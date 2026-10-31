import { Icon } from '../../components/Icon';
import { useOnboarding } from '../../lib/onboarding';
import { TaskCard } from './TaskCard';

export function Onboarding() {
  const { state, reload, replace } = useOnboarding();

  return (
    <section className="stack">
      <h1>Onboarding</h1>

      {state.status === 'loading' && (
        <p className="page-status" role="status">
          Loading your checklist…
        </p>
      )}
      {state.status === 'error' && (
        <div role="alert">
          <p className="message message-error">
            <Icon name="error" />
            <span>{state.message}</span>
          </p>
          <button type="button" className="button" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <p>
            {state.onboarding.progress.done} of {state.onboarding.progress.total} steps done
          </p>
          {state.onboarding.phases.map((phase) => (
            <section key={phase.id} className="stack" aria-labelledby={`phase-${phase.id}`}>
              <h2 id={`phase-${phase.id}`}>{phase.title}</h2>
              {phase.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  demoActions={state.onboarding.demoActions}
                  onChange={replace}
                />
              ))}
            </section>
          ))}
        </>
      )}
    </section>
  );
}
