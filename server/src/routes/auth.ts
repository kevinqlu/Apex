import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { config } from '../config/env.js';
import { findDriverById, toProfile } from '../db/drivers.js';
import type { Db } from '../db/index.js';
import { DEMO_PASSWORD } from '../db/seed.js';
import { createSession, deleteSession } from '../db/sessions.js';
import {
  currentDriver,
  readSessionId,
  requireSession,
  SESSION_COOKIE,
} from '../middleware/auth.js';
import { sendError } from '../middleware/errors.js';
import type { LoginLimiter } from '../middleware/loginLimiter.js';

// Compared against when the driver ID does not exist, so a wrong ID and a wrong password
// take the same time and cannot be told apart.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const WRONG_LOGIN = 'Driver ID or password is incorrect.';
const MIN_PASSWORD_LENGTH = 8;
const MAX_FIELD_LENGTH = 200;

export function authRouter(db: Db, limiter: LoginLimiter): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { driverId, password } = (req.body ?? {}) as Record<string, unknown>;
    if (
      typeof driverId !== 'string' ||
      typeof password !== 'string' ||
      !driverId.trim() ||
      !password ||
      driverId.length > MAX_FIELD_LENGTH ||
      password.length > MAX_FIELD_LENGTH
    ) {
      sendError(res, 400, 'missing_fields', 'Enter your driver ID and password.');
      return;
    }

    const id = driverId.trim().toUpperCase();
    const key = `${id}|${req.ip}`;
    const wait = limiter.minutesUntilAllowed(key);
    if (wait > 0) {
      sendError(
        res,
        429,
        'too_many_attempts',
        `Too many sign-in attempts. Try again in ${wait} ${wait === 1 ? 'minute' : 'minutes'}.`,
      );
      return;
    }

    const driver = findDriverById(db, id);
    const matches = await bcrypt.compare(password, driver?.password_hash ?? DUMMY_HASH);
    if (!driver || !matches || password.length < MIN_PASSWORD_LENGTH) {
      limiter.recordFailure(key);
      sendError(res, 401, 'bad_login', WRONG_LOGIN);
      return;
    }

    limiter.clear(key);
    const session = createSession(db, driver.id, config.sessionHours);
    res.cookie(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      expires: session.expiresAt,
      path: '/',
    });
    res.json({ driver: toProfile(driver) });
  });

  // Works without a valid session on purpose, so signing out never fails.
  router.post('/logout', (req, res) => {
    const sessionId = readSessionId(req);
    if (sessionId) deleteSession(db, sessionId);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  router.get('/me', requireSession(db), (_req, res) => {
    res.json({ driver: currentDriver(res) });
  });

  // Demo credentials for the login screen. Off unless DEMO_MODE=true.
  router.get('/demo', (_req, res) => {
    if (!config.demoMode) {
      sendError(res, 404, 'not_found', 'We could not find that.');
      return;
    }
    const drivers = db.prepare('SELECT id, name FROM drivers ORDER BY id').all();
    res.json({ drivers, password: DEMO_PASSWORD });
  });

  return router;
}
