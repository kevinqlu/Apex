import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config } from './config/env.js';
import { loadTemplate, type OnboardingTemplate } from './config/onboarding.js';
import type { Db } from './db/index.js';
import { requireSession } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { createLoginLimiter } from './middleware/loginLimiter.js';
import { originCheck } from './middleware/originCheck.js';
import { authRouter } from './routes/auth.js';
import { loadsRouter } from './routes/loads.js';
import { documentsRouter } from './routes/documents.js';
import { meRouter } from './routes/me.js';
import { notificationsRouter } from './routes/notifications.js';
import { onboardingRouter } from './routes/onboarding.js';
import { supportRouter, ticketsRouter } from './routes/support.js';

interface AppOptions {
  template?: OnboardingTemplate;
  demoMode?: boolean;
  uploadsDir?: string;
  // Folder with the built web app. Served only when it exists and this is set or in production.
  webDist?: string;
}

export function createApp(
  db: Db,
  {
    template = loadTemplate(),
    demoMode = config.demoMode,
    uploadsDir = config.uploadsDir,
    webDist = config.isProduction ? config.webDist : undefined,
  }: AppOptions = {},
) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);
  app.use((_req, res, next) => {
    res.set({
      // The browser must not guess a file's type, and no other site may frame the app.
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
    });
    next();
  });
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
  app.use('/api/documents', session, documentsRouter(db, template, uploadsDir));
  app.use('/api/support', session, supportRouter());
  app.use('/api/tickets', session, ticketsRouter(db));
  app.use('/api/onboarding', session, onboardingRouter(db, template, demoMode));

  app.use('/api', notFound);

  // In production the server also hands out the web app, so one address does everything and
  // the session cookie stays same-site. Any address that is not /api is a screen in the app.
  const indexHtml = webDist && path.join(webDist, 'index.html');
  if (webDist && indexHtml && fs.existsSync(indexHtml)) {
    app.use(express.static(webDist));
    app.use((req, res, next) => {
      if (req.method !== 'GET') {
        next();
        return;
      }
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}
