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
import { trackingRouter } from './routes/tracking.js';
import { createTrackingProvider } from './tracking/index.js';
import type { TrackingProvider } from './tracking/provider.js';

interface AppOptions {
  template?: OnboardingTemplate;
  demoMode?: boolean;
  uploadsDir?: string;
  webDist?: string;
  trackingProvider?: TrackingProvider;
}

export function createApp(
  db: Db,
  {
    template = loadTemplate(),
    demoMode = config.demoMode,
    uploadsDir = config.uploadsDir,
    webDist = config.isProduction ? config.webDist : undefined,
    trackingProvider = createTrackingProvider(),
  }: AppOptions = {},
) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);
  app.use((_req, res, next) => {
    res.set({
      // Stop type sniffing and framing by other sites.
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
    });
    next();
  });
  app.use(express.json());
  app.use('/api', originCheck(config.appOrigins));

  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter(db, createLoginLimiter()));

  // Every data route sits behind requireSession, which sets the driver for the request.
  const session = requireSession(db);
  app.use('/api/me', session, meRouter(db));
  app.use('/api/loads', session, loadsRouter(db));
  app.use('/api/notifications', session, notificationsRouter(db));
  app.use('/api/documents', session, documentsRouter(db, template, uploadsDir));
  app.use('/api/support', session, supportRouter());
  app.use('/api/tickets', session, ticketsRouter(db));
  app.use('/api/tracking', session, trackingRouter(db, trackingProvider));
  app.use('/api/onboarding', session, onboardingRouter(db, template, demoMode));

  app.use('/api', notFound);

  // Same-origin serving keeps the session cookie same-site.
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
