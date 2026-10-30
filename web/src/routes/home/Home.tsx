import { useAuth } from '../../components/AuthProvider';
import { DutySelector } from '../../components/DutySelector';
import { LoadCard } from '../../components/LoadCard';
import { LoadsError, LoadsLoading } from '../../components/LoadsStatus';
import { RecentAlerts } from '../../components/RecentAlerts';
import { UrgentBanners } from '../../components/UrgentBanner';
import { pickActiveLoad, useLoads } from '../../lib/loads';

// Slice 4 adds the onboarding progress card.
export function Home() {
  const { state } = useAuth();
  const { state: loads, reload } = useLoads();
  if (state.status !== 'signed-in') return null;
  const { driver } = state;
  const active = loads.status === 'ready' ? pickActiveLoad(loads.loads) : undefined;

  return (
    <section className="stack">
      <h1>Hi, {driver.name.split(' ')[0]}</h1>
      <UrgentBanners />
      <DutySelector current={driver.dutyStatus} />

      <h2>Your active load</h2>
      {loads.status === 'loading' && <LoadsLoading />}
      {loads.status === 'error' && <LoadsError message={loads.message} onRetry={reload} />}
      {loads.status === 'ready' && !active && (
        <p>You have no active load. Your dispatcher will assign your next one.</p>
      )}
      {active && <LoadCard load={active} />}

      <RecentAlerts />
    </section>
  );
}
