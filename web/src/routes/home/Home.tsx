import { useAuth } from '../../components/AuthProvider';

// Slice 2 turns this into the dashboard.
export function Home() {
  const { state } = useAuth();
  if (state.status !== 'signed-in') return null;
  const firstName = state.driver.name.split(' ')[0];

  return (
    <section>
      <h1>Hi, {firstName}</h1>
      <p>Your loads, alerts, and tasks will show up here.</p>
    </section>
  );
}
