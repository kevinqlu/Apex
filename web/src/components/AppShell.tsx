import { useEffect, useRef, type RefObject } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';
import { Icon, type IconName } from './Icon';
import { NotificationsProvider, useNotifications } from './NotificationsProvider';

const sections: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/loads', label: 'Loads', icon: 'loads' },
  { to: '/alerts', label: 'Alerts', icon: 'alerts' },
  { to: '/onboarding', label: 'Onboarding', icon: 'onboarding' },
  { to: '/documents', label: 'Documents', icon: 'documents' },
  { to: '/help', label: 'Help', icon: 'help' },
];

export function AppShell() {
  return (
    <NotificationsProvider>
      <Shell />
    </NotificationsProvider>
  );
}

function useAnnouncePageChange(main: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const firstPage = useRef(true);

  useEffect(() => {
    const section = sections.find((s) => s.to === pathname);
    document.title = section ? `${section.label} | Apex` : 'Apex driver portal';
    if (firstPage.current) firstPage.current = false;
    else main.current?.focus();
  }, [pathname, main]);
}

function Shell() {
  const { signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const main = useRef<HTMLElement>(null);
  useAnnouncePageChange(main);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="shell-header">
        <span className="brand">Apex</span>
        <button type="button" className="button button-quiet" onClick={() => void signOut()}>
          <Icon name="signOut" />
          Sign out
        </button>
      </header>
      <nav className="shell-nav" aria-label="Main">
        {sections.map((s) => (
          <NavLink key={s.to} to={s.to} end={s.to === '/'} className="nav-link">
            <Icon name={s.icon} />
            <span>{s.label}</span>
            {s.to === '/alerts' && unreadCount > 0 && (
              <span className="badge">
                {unreadCount}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <main id="main" className="shell-main" tabIndex={-1} ref={main}>
        <Outlet />
      </main>
    </div>
  );
}
