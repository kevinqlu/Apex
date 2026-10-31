import { useAuth } from '../../components/AuthProvider';
import { DutySelector } from '../../components/DutySelector';
import { LoadCard } from '../../components/LoadCard';
import { OnboardingCard } from '../../components/OnboardingCard';
import { LoadsError, LoadsLoading } from '../../components/LoadsStatus';
import { RecentAlerts } from '../../components/RecentAlerts';
import { UrgentBanners } from '../../components/UrgentBanner';
import { pickActiveLoad, useLoads } from '../../lib/loads';
import { useOnboarding } from '../../lib/onboarding';

export function Home() {
  const { state } = useAuth();
  const { state: loads, reload } = useLoads();
  const { state: onboarding } = useOnboarding();
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

      {onboarding.status === 'ready' && <OnboardingCard onboarding={onboarding.onboarding} />}

      <RecentAlerts />
    </section>
  );
}
