import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../api/client';
import { getNotifications, markNotificationsRead, type Notification } from '../api/notifications';

type NotificationsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; notifications: Notification[] };

interface NotificationsContextValue {
  state: NotificationsState;
  unreadCount: number;
  // Set when marking as read fails, so the screen can say so.
  markError: string | null;
  markRead: (ids: string[]) => Promise<void>;
  reload: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const messageFor = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Something went wrong. Try again.';

// One copy of the list, shared by the nav badge, the dashboard, and the Alerts screen,
// so they always agree about what is unread.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NotificationsState>({ status: 'loading' });
  const [markError, setMarkError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    getNotifications().then(
      ({ notifications }) => setState({ status: 'ready', notifications }),
      (err) => setState({ status: 'error', message: messageFor(err) }),
    );
  }, []);

  useEffect(reload, [reload]);

  const markRead = useCallback(async (ids: string[]) => {
    try {
      const { notifications } = await markNotificationsRead(ids);
      setState({ status: 'ready', notifications });
      setMarkError(null);
    } catch (err) {
      setMarkError(messageFor(err));
    }
  }, []);

  const unreadCount =
    state.status === 'ready' ? state.notifications.filter((n) => !n.read).length : 0;

  const value = useMemo(
    () => ({ state, unreadCount, markError, markRead, reload }),
    [state, unreadCount, markError, markRead, reload],
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationsProvider');
  return value;
}
