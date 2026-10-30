import { Link } from 'react-router';
import { formatWhen } from '../lib/format';
import { Icon } from './Icon';
import { useNotifications } from './NotificationsProvider';

const SHOWN = 3;

// Unread announcements only. Unread urgent alerts already have their own banner above.
export function RecentAlerts() {
  const { state, unreadCount } = useNotifications();
  if (state.status !== 'ready') return null;
  const unread = state.notifications.filter((n) => n.kind === 'announcement' && !n.read);

  return (
    <section className="stack" aria-labelledby="recent-alerts-title">
      <h2 id="recent-alerts-title">New announcements</h2>
      {unreadCount === 0 && (
        <p className="message message-ok">
          <Icon name="checkCircle" />
          <span>You are all caught up. No unread alerts.</span>
        </p>
      )}
      {unread.slice(0, SHOWN).map((n) => (
        <Link key={n.id} to="/alerts" className="card recent">
          <span className="new-label">New</span>
          <strong>{n.title}</strong>
          <span>{formatWhen(n.createdAt)}</span>
        </Link>
      ))}
      <Link to="/alerts" className="button">
        See all alerts
      </Link>
    </section>
  );
}
