import type { Load } from '../api/loads';
import { Icon } from './Icon';

// The one memorable element: where the truck is between the two cities.
export function RouteStrip({ load }: { load: Load }) {
  const percent = Math.round(load.progress * 100);
  const from = `${load.origin.city}, ${load.origin.state}`;
  const to = `${load.destination.city}, ${load.destination.state}`;
  const where =
    load.status === 'delivered'
      ? 'delivered'
      : load.status === 'in_transit'
        ? `${percent} percent of the way`
        : 'not picked up yet';

  return (
    <div className="route" role="img" aria-label={`${from} to ${to}, ${where}`}>
      <span className="route-city">{load.origin.city}</span>
      <span className="route-line">
        <span className="route-done" style={{ width: `${percent}%` }} />
        <span className="route-truck" style={{ left: `${percent}%` }}>
          <Icon name="loads" />
        </span>
      </span>
      <span className="route-city route-city-end">{load.destination.city}</span>
    </div>
  );
}
