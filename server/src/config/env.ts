import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Read once at startup so the rest of the server never touches process.env.
export const config = {
  // The built web app. The server only serves it in production, where one address does both.
  webDist: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../web/dist'),
  // How many proxies sit in front of the server. Needed for the real client address, which the
  // sign-in rate limit counts by.
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  port: Number(process.env.PORT ?? 3001),
  databasePath: process.env.DATABASE_PATH ?? './data/apex.db',
  // Where uploaded files live. Never committed, and never served directly.
  uploadsDir: process.env.UPLOADS_DIR ?? './uploads',
  demoMode: process.env.DEMO_MODE === 'true',
  appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:5173',
  // Marks the session cookie Secure so it is never sent over plain http.
  isProduction: process.env.NODE_ENV === 'production',
  sessionHours: 12,
};
