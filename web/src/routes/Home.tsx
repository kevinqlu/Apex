import { useEffect, useState } from 'react';
import { getHealth } from '../api/health';

export function Home() {
  const [status, setStatus] = useState<'checking' | 'up' | 'down'>('checking');

  useEffect(() => {
    getHealth().then(
      () => setStatus('up'),
      () => setStatus('down'),
    );
  }, []);

  return (
    <main>
      <h1>Apex driver portal</h1>
      <p>
        {status === 'checking' && 'Checking the server…'}
        {status === 'up' && '✓ Server is running.'}
        {status === 'down' && '✕ Cannot reach the server. Start it with npm run dev.'}
      </p>
    </main>
  );
}
