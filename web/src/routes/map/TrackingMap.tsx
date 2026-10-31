import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../../api/client';
import { getActiveLoadTracking, type Tracking } from '../../api/tracking';
import { Icon, type IconName } from '../../components/Icon';
import { LoadError, Loading } from '../../components/ResourceStatus';
import { StatusChip } from '../../components/StatusChip';
import { compassWord, formatClock, formatWhen } from '../../lib/format';
import { MapView } from './MapView';

const POLL_MS = 10_000;

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Tracking; updatedAt: number; refreshFailed: boolean };

type ReadyState = Extract<State, { status: 'ready' }>;

export function TrackingMap() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      getActiveLoadTracking().then(
        (data) => {
          if (!cancelled) {
            setState({ status: 'ready', data, updatedAt: Date.now(), refreshFailed: false });
          }
        },
        (err) => {
          if (cancelled) return;
          const message =
            err instanceof ApiError ? err.message : 'Something went wrong. Try again in a moment.';
          // A failed refresh keeps the last position on screen instead of blanking the map.
          setState((prev) =>
            prev.status === 'ready'
              ? { ...prev, refreshFailed: true }
              : { status: 'error', message },
          );
        },
      );
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [attempt]);

  return (
    <section className="stack">
      <h1>Live map</h1>

      {state.status === 'loading' && <Loading what="the map" />}
      {state.status === 'error' && (
        <LoadError message={state.message} onRetry={() => setAttempt((n) => n + 1)} />
      )}
      {state.status === 'ready' && (
        <Ready state={state} tilesFailed={tilesFailed} onTilesFailed={() => setTilesFailed(true)} />
      )}
    </section>
  );
}

function Ready({
  state,
  tilesFailed,
  onTilesFailed,
}: {
  state: ReadyState;
  tilesFailed: boolean;
  onTilesFailed: () => void;
}) {
  const { data, updatedAt, refreshFailed } = state;
  const { load, position } = data;

  if (!load) {
    return <p>You have no active load. Your dispatcher will assign your next one.</p>;
  }

  const percent = Math.round(load.progress * 100);
  const route = `${load.origin.city}, ${load.origin.state} to ${load.destination.city}, ${load.destination.state}`;

  return (
    <>
      {data.simulated && (
        <p className="message message-info">
          <Icon name="help" />
          <span>Simulated positions. This truck is not really being tracked.</span>
        </p>
      )}
      {refreshFailed && (
        <p className="message message-caution" role="status">
          <Icon name="warning" />
          <span>Could not refresh. Showing the last position we had.</span>
        </p>
      )}
      {tilesFailed && (
        <p className="message message-caution" role="status">
          <Icon name="warning" />
          <span>The map pictures could not load. Your route and timeline still work.</span>
        </p>
      )}

      <article className="card stack-tight">
        <header className="load-head">
          <h2 className="load-id">{load.id}</h2>
          <StatusChip status={load.status} />
        </header>
        <p className="map-route">{route}</p>

        <MapView
          origin={load.origin}
          destination={load.destination}
          position={position}
          progress={load.progress}
          onTilesFailed={onTilesFailed}
        />

        {position ? (
          <p aria-live="polite">
            About {percent} percent of the way, heading {compassWord(position.headingDeg)} at{' '}
            {position.speedMph} mph. Updated {formatClock(updatedAt)}.
          </p>
        ) : (
          <p className="message message-info">
            <Icon name="clock" />
            <span>Not picked up yet. Your truck shows on the map once you are on the road.</span>
          </p>
        )}
        {load.delayNote && (
          <p className="message message-caution">
            <Icon name="warning" />
            <span>{load.delayNote}</span>
          </p>
        )}
      </article>

      <Timeline load={load} />

      <Link className="button" to="/loads">
        Back to loads
      </Link>
    </>
  );
}

type StepState = 'done' | 'current' | 'upcoming';

const STEP_LOOK: Record<StepState, { icon: IconName; text: string }> = {
  done: { icon: 'checkCircle', text: 'Done' },
  current: { icon: 'loads', text: 'Now' },
  upcoming: { icon: 'clock', text: 'Coming up' },
};

function Timeline({ load }: { load: NonNullable<Tracking['load']> }) {
  const onRoad = load.status === 'in_transit';
  const steps: { label: string; when: string; state: StepState }[] = [
    {
      label: `Pickup in ${load.origin.city}`,
      when: formatWhen(load.pickupAt),
      state: onRoad ? 'done' : 'upcoming',
    },
    {
      label: 'On the road',
      when: onRoad ? 'In progress' : 'Starts at pickup',
      state: onRoad ? 'current' : 'upcoming',
    },
    {
      label: `Delivery in ${load.destination.city}`,
      when: formatWhen(load.deliveryAt),
      state: 'upcoming',
    },
  ];

  return (
    <section className="card" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">Timeline</h2>
      <ol className="timeline">
        {steps.map((step) => {
          const look = STEP_LOOK[step.state];
          return (
            <li key={step.label} className={`timeline-step timeline-${step.state}`}>
              <span className="timeline-state">
                <Icon name={look.icon} />
                {look.text}
              </span>
              <span className="timeline-label">{step.label}</span>
              <span className="timeline-when">{step.when}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
