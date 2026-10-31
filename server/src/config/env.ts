import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Render sets RENDER_EXTERNAL_URL to the public address; other devices need their own entry.
const appOrigins = (
  process.env.APP_ORIGIN ??
  process.env.RENDER_EXTERNAL_URL ??
  'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  webDist: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../web/dist'),
  // Proxy count, so the sign-in rate limit sees the real client address.
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  port: Number(process.env.PORT ?? 3001),
  databasePath: process.env.DATABASE_PATH ?? './data/apex.db',
  uploadsDir: process.env.UPLOADS_DIR ?? './uploads',
  demoMode: process.env.DEMO_MODE === 'true',
  appOrigins,
  appOrigin: appOrigins[0] ?? 'http://localhost:5173',
  // Secure cookie: never sent over plain http.
  isProduction: process.env.NODE_ENV === 'production',
  sessionHours: 12,
};
