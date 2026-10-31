import { Router } from 'express';
import type { Db } from '../db/index.js';
import { listNotifications, markRead } from '../db/notifications.js';
import { currentDriver } from '../middleware/auth.js';
import { sendError } from '../middleware/errors.js';

const MAX_IDS = 100;

// Mounted behind requireSession. The driver comes from the session, never from the request.
export function notificationsRouter(db: Db): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ notifications: listNotifications(db, currentDriver(res).id) });
  });

  router.post('/read', (req, res) => {
    const { ids } = (req.body ?? {}) as Record<string, unknown>;
    if (!Array.isArray(ids) || ids.length > MAX_IDS || !ids.every((id) => typeof id === 'string')) {
      sendError(res, 400, 'bad_ids', 'Choose which alerts to mark as read.');
      return;
    }
    const driverId = currentDriver(res).id;
    markRead(db, driverId, ids);
    res.json({ notifications: listNotifications(db, driverId) });
  });

  return router;
}
