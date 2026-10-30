import express from 'express';
import type { Db } from './db/index.js';

export function createApp(db: Db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    // A real query proves the database is reachable, not just that Express is up.
    db.prepare('SELECT 1').get();
    res.json({ ok: true });
  });

  return app;
}
