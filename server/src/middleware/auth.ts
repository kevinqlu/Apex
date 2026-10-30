import type { Request, RequestHandler, Response } from 'express';
import type { DriverProfile } from '../db/drivers.js';
import type { Db } from '../db/index.js';
import { findDriverBySession } from '../db/sessions.js';
import { sendError } from './errors.js';

export const SESSION_COOKIE = 'sid';

export function readSessionId(req: Request): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=');
  }
  return undefined;
}

// Every data route sits behind this. It is the only place a driver identity is set.
export function requireSession(db: Db): RequestHandler {
  return (req, res, next) => {
    const sessionId = readSessionId(req);
    const driver = sessionId ? findDriverBySession(db, sessionId) : undefined;
    if (!driver) {
      sendError(res, 401, 'unauthenticated', 'Your session expired. Sign in again.');
      return;
    }
    res.locals.driver = driver;
    next();
  };
}

// Route handlers call this, so they never read a driver ID from the request.
export function currentDriver(res: Response): DriverProfile {
  return res.locals.driver as DriverProfile;
}
