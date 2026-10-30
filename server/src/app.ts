import express from 'express';
import { config } from './config/env.js';
import type { Db } from './db/index.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { createLoginLimiter } from './middleware/loginLimiter.js';
import { originCheck } from './middleware/originCheck.js';
import { authRouter } from './routes/auth.js';

export function createApp(db: Db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use('/api', originCheck(config.appOrigin));

  app.get('/api/health', (_req, res) => {
    // A real query proves the database is reachable, not just that Express is up.
    db.prepare('SELECT 1').get();
    res.json({ ok: true });
  });

  // One limiter per app, so tests start with a clean slate.
  app.use('/api/auth', authRouter(db, createLoginLimiter()));

  // Data routes from later slices go here, each behind requireSession(db).

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
