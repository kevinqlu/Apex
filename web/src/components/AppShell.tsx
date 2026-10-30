import { NavLink, Outlet } from 'react-router';
import { useAuth } from './AuthProvider';
import { Icon, type IconName } from './Icon';

const sections: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/loads', label: 'Loads', icon: 'loads' },
  { to: '/alerts', label: 'Alerts', icon: 'alerts' },
  { to: '/onboarding', label: 'Onboarding', icon: 'onboarding' },
  { to: '/documents', label: 'Documents', icon: 'documents' },
  { to: '/help', label: 'Help', icon: 'help' },
];

export function AppShell() {
  const { signOut } = useAuth();

  return (
    <div className="shell">
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
          </NavLink>
        ))}
      </nav>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
