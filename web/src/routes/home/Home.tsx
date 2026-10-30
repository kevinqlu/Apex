import { useAuth } from '../../components/AuthProvider';
import { DutySelector } from '../../components/DutySelector';
import { LoadCard } from '../../components/LoadCard';
import { LoadsError, LoadsLoading } from '../../components/LoadsStatus';
import { pickActiveLoad, useLoads } from '../../lib/loads';

// Slice 3 adds the urgent banner and recent alerts, and Slice 4 the onboarding card.
export function Home() {
  const { state } = useAuth();
  const { state: loads, reload } = useLoads();
  if (state.status !== 'signed-in') return null;
  const { driver } = state;
  const active = loads.status === 'ready' ? pickActiveLoad(loads.loads) : undefined;

  return (
    <section className="stack">
      <h1>Hi, {driver.name.split(' ')[0]}</h1>
      <DutySelector current={driver.dutyStatus} />

      <h2>Your active load</h2>
      {loads.status === 'loading' && <LoadsLoading />}
      {loads.status === 'error' && <LoadsError message={loads.message} onRetry={reload} />}
      {loads.status === 'ready' && !active && (
        <p>You have no active load. Your dispatcher will assign your next one.</p>
      )}
      {active && <LoadCard load={active} />}
    </section>
  );
}
