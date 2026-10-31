import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on the network too, so a phone on the same Wi-Fi can open the dev server.
    host: true,
    // Same-origin in dev, so the session cookie and the Origin check behave like production.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
