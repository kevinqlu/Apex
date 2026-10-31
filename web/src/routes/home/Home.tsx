import { getLoads } from '../../api/loads';
import { getOnboarding } from '../../api/onboarding';
import { useAuth } from '../../components/AuthProvider';
import { DutySelector } from '../../components/DutySelector';
import { LoadCard } from '../../components/LoadCard';
import { OnboardingCard } from '../../components/OnboardingCard';
import { RecentAlerts } from '../../components/RecentAlerts';
import { LoadError, Loading } from '../../components/ResourceStatus';
import { UrgentBanners } from '../../components/UrgentBanner';
import { pickActiveLoad } from '../../lib/loads';
import { useResource } from '../../lib/useResource';

export function Home() {
  const { state } = useAuth();
  const { state: loads, reload } = useResource(getLoads);
  const { state: onboarding } = useResource(getOnboarding);
  if (state.status !== 'signed-in') return null;
  const { driver } = state;
  const active = loads.status === 'ready' ? pickActiveLoad(loads.data.loads) : undefined;

  return (
    <section className="stack">
      <h1>Hi, {driver.name.split(' ')[0]}</h1>
      <UrgentBanners />
      <DutySelector current={driver.dutyStatus} />

      <h2>Your active load</h2>
      {loads.status === 'loading' && <Loading what="your loads" />}
      {loads.status === 'error' && <LoadError message={loads.message} onRetry={reload} />}
      {loads.status === 'ready' && !active && (
        <p>You have no active load. Your dispatcher will assign your next one.</p>
      )}
      {active && <LoadCard load={active} />}

      {onboarding.status === 'ready' && <OnboardingCard onboarding={onboarding.data} />}

      <RecentAlerts />
    </section>
  );
}
