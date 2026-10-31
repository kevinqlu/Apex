import { useState } from 'react';
import type { Notification } from '../../api/notifications';
import { Icon } from '../../components/Icon';
import { KindChip } from '../../components/KindChip';
import { useNotifications } from '../../components/NotificationsProvider';
import { formatWhen } from '../../lib/format';

type Filter = 'all' | 'urgent' | 'announcements' | 'unread';

const filters: { value: Filter; label: string; matches: (n: Notification) => boolean }[] = [
  { value: 'all', label: 'All', matches: () => true },
  { value: 'urgent', label: 'Urgent', matches: (n) => n.kind === 'urgent' },
  { value: 'announcements', label: 'Announcements', matches: (n) => n.kind === 'announcement' },
  { value: 'unread', label: 'Unread', matches: (n) => !n.read },
];

const emptyText: Record<Filter, string> = {
  all: 'No alerts yet. Urgent alerts and announcements from Apex show up here.',
  urgent: 'No urgent alerts.',
  announcements: 'No announcements.',
  unread: 'You are all caught up. No unread alerts.',
};

export function Alerts() {
  const { state, unreadCount, markError, markRead, reload } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(n: Notification) {
    const opening = !openIds.has(n.id);
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (opening) next.add(n.id);
      else next.delete(n.id);
      return next;
    });
    if (opening && !n.read) void markRead([n.id]);
  }

  const active = filters.find((f) => f.value === filter) ?? filters[0]!;
  const shown =
    state.status === 'ready'
      ? state.notifications.filter(
          (n) => active.matches(n) || (filter === 'unread' && openIds.has(n.id)),
        )
      : [];

  return (
    <section className="stack">
      <h1>Alerts</h1>

      <div className="filters" role="group" aria-label="Which alerts to show">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            className="tab"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="button"
        disabled={unreadCount === 0 || state.status !== 'ready'}
        onClick={() => {
          if (state.status !== 'ready') return;
          void markRead(state.notifications.filter((n) => !n.read).map((n) => n.id));
        }}
      >
        Mark all as read
      </button>

      {markError && (
        <p className="message message-error" role="alert">
          <Icon name="error" />
          <span>{markError}</span>
        </p>
      )}

      {state.status === 'loading' && (
        <p className="page-status" role="status">
          Loading your alerts…
        </p>
      )}
      {state.status === 'error' && (
        <div role="alert">
          <p className="message message-error">
            <Icon name="error" />
            <span>{state.message}</span>
          </p>
          <button type="button" className="button" onClick={reload}>
            Try again
          </button>
        </div>
      )}
      {state.status === 'ready' && shown.length === 0 && <p>{emptyText[filter]}</p>}

      {shown.map((n) => {
        const open = openIds.has(n.id);
        const bodyId = `alert-body-${n.id}`;
        return (
          <article key={n.id} className={n.read ? 'card alert' : 'card alert alert-unread'}>
            <div className="alert-meta">
              <KindChip kind={n.kind} />
              {!n.read && <span className="new-label">New</span>}
              <span className="alert-time">{formatWhen(n.createdAt)}</span>
            </div>
            <h2 className="alert-title">
              <button
                type="button"
                className="alert-toggle"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => toggle(n)}
              >
                {n.title}
                <span className={open ? 'chevron chevron-open' : 'chevron'}>
                  <Icon name="chevron" />
                </span>
              </button>
            </h2>
            {open && (
              <p id={bodyId} className="alert-body">
                {n.body}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}
