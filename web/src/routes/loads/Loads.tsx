import { useState } from 'react';
import { getLoads } from '../../api/loads';
import { LoadCard } from '../../components/LoadCard';
import { LoadError, Loading } from '../../components/ResourceStatus';
import { isDelivered } from '../../lib/loads';
import { useResource } from '../../lib/useResource';

type Tab = 'current' | 'delivered';

export function Loads() {
  const { state, reload } = useResource(getLoads);
  const [tab, setTab] = useState<Tab>('current');

  // The server returns loads in pickup order. Delivered shows the newest first.
  const shown =
    state.status === 'ready'
      ? state.data.loads.filter((l) => isDelivered(l) === (tab === 'delivered'))
      : [];
  if (tab === 'delivered') shown.reverse();

  return (
    <section className="stack">
      <h1>Loads</h1>

      <div className="tabs" role="group" aria-label="Which loads to show">
        {(['current', 'delivered'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className="tab"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t === 'current' ? 'Current' : 'Delivered'}
          </button>
        ))}
      </div>

      {state.status === 'loading' && <Loading what="your loads" />}
      {state.status === 'error' && <LoadError message={state.message} onRetry={reload} />}
      {state.status === 'ready' && shown.length === 0 && (
        <p>
          {tab === 'current'
            ? 'You have no current loads. Your dispatcher will assign your next one.'
            : 'You have no delivered loads yet.'}
        </p>
      )}
      {shown.map((load) => (
        <LoadCard key={load.id} load={load} />
      ))}
    </section>
  );
}
