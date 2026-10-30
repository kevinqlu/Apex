import { Icon } from './Icon';
import { useNotifications } from './NotificationsProvider';

// Solid and impossible to miss. Each banner stays until the driver marks it as read.
export function UrgentBanners() {
  const { state, markRead } = useNotifications();
  if (state.status !== 'ready') return null;
  const urgent = state.notifications.filter((n) => n.kind === 'urgent' && !n.read);
  if (urgent.length === 0) return null;

  return (
    <section className="stack" aria-label="Urgent alerts">
      {urgent.map((n) => (
        <div key={n.id} className="banner" role="alert">
          <p className="banner-kind">
            <Icon name="error" />
            Urgent alert
          </p>
          <h2 className="banner-title">{n.title}</h2>
          <p className="banner-body">{n.body}</p>
          <button
            type="button"
            className="button banner-button"
            onClick={() => void markRead([n.id])}
          >
            Mark as read
          </button>
        </div>
      ))}
    </section>
  );
}
