import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { getDemoInfo, type DemoInfo } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../components/AuthProvider';
import { Icon } from '../../components/Icon';

export function Login() {
  const { state, signIn } = useAuth();
  const [driverId, setDriverId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<DemoInfo | null>(null);

  useEffect(() => {
    document.title = 'Sign in | Apex';
    getDemoInfo().then(setDemo, () => setDemo(null));
  }, []);

  if (state.status === 'signed-in') return <Navigate to="/" replace />;

  const notice = state.status === 'signed-out' ? state.notice : undefined;
  const message = error ?? notice;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(driverId, password);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Something went wrong. Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <h1 className="brand brand-large">Apex</h1>
      <p className="login-sub">Driver portal</p>

      <form className="card" onSubmit={onSubmit} noValidate>
        {message && (
          <p className="message message-error" role="alert">
            <Icon name="error" />
            <span>{message}</span>
          </p>
        )}

        <label htmlFor="driver-id">Driver ID</label>
        <input
          id="driver-id"
          name="username"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <div className="password-row">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="button button-quiet"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {demo && (
        <section className="card demo" aria-label="Demo drivers">
          <h2>Demo drivers</h2>
          <p>Demo mode is on. Pick a driver to fill in the form.</p>
          {demo.drivers.map((d) => (
            <button
              key={d.id}
              type="button"
              className="button"
              onClick={() => {
                setDriverId(d.id);
                setPassword(demo.password);
                setError(null);
              }}
            >
              Fill in {d.name} ({d.id})
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
