import express from 'express';
import { config } from './config/env.js';
import type { Db } from './db/index.js';
import { requireSession } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { createLoginLimiter } from './middleware/loginLimiter.js';
import { originCheck } from './middleware/originCheck.js';
import { authRouter } from './routes/auth.js';
import { loadsRouter } from './routes/loads.js';
import { meRouter } from './routes/me.js';
import { notificationsRouter } from './routes/notifications.js';

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

  // Every data route sits behind requireSession, which sets the driver for the request.
  const session = requireSession(db);
  app.use('/api/me', session, meRouter(db));
  app.use('/api/loads', session, loadsRouter(db));
  app.use('/api/notifications', session, notificationsRouter(db));

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
