import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Same-origin in dev, so the cookie and Origin check match production.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
