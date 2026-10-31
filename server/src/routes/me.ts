import { Router } from 'express';
import { findDriverById, toProfile, type DutyStatus } from '../db/drivers.js';
import type { Db } from '../db/index.js';
import { currentDriver } from '../middleware/auth.js';
import { sendError } from '../middleware/errors.js';

const DUTY_STATUSES: DutyStatus[] = ['driving', 'on_duty', 'sleeper', 'off_duty'];

export function meRouter(db: Db): Router {
  const router = Router();

  router.patch('/duty-status', (req, res) => {
    const { dutyStatus } = (req.body ?? {}) as Record<string, unknown>;
    if (!DUTY_STATUSES.some((status) => status === dutyStatus)) {
      sendError(res, 400, 'bad_duty_status', 'Choose Driving, On duty, Sleeper, or Off duty.');
      return;
    }
    const driver = currentDriver(res);
    db.prepare('UPDATE drivers SET duty_status = ? WHERE id = ?').run(dutyStatus, driver.id);
    const updated = findDriverById(db, driver.id);
    res.json({ driver: updated && toProfile(updated) });
  });

  return router;
}
