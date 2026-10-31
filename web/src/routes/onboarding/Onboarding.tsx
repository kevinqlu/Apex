import { getOnboarding } from '../../api/onboarding';
import { LoadError, Loading } from '../../components/ResourceStatus';
import { useResource } from '../../lib/useResource';
import { TaskCard } from './TaskCard';

export function Onboarding() {
  const { state, reload, replace } = useResource(getOnboarding);

  return (
    <section className="stack">
      <h1>Onboarding</h1>

      {state.status === 'loading' && <Loading what="your checklist" />}
      {state.status === 'error' && <LoadError message={state.message} onRetry={reload} />}

      {state.status === 'ready' && (
        <>
          <p>
            {state.data.progress.done} of {state.data.progress.total} steps done
          </p>
          {state.data.phases.map((phase) => (
            <section key={phase.id} className="stack" aria-labelledby={`phase-${phase.id}`}>
              <h2 id={`phase-${phase.id}`}>{phase.title}</h2>
              {phase.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  demoActions={state.data.demoActions}
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
