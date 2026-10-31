import { Router } from 'express';
import {
  SUPPORT,
  TICKET_CATEGORIES,
  TICKET_MESSAGE_MAX,
  TICKET_MESSAGE_MIN,
} from '../config/support.js';
import type { Db } from '../db/index.js';
import { findLoad } from '../db/loads.js';
import { createTicket, listTickets } from '../db/tickets.js';
import { currentDriver } from '../middleware/auth.js';
import { sendError } from '../middleware/errors.js';

// Contacts for the Help screen. Mounted behind requireSession.
export function supportRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const { terminal, dispatcherName, dispatcherPhone } = currentDriver(res);
    res.json({
      roadside: SUPPORT.roadside,
      terminal: { name: terminal, ...SUPPORT.terminal },
      dispatcher: { name: dispatcherName, phone: dispatcherPhone },
    });
  });

  return router;
}

// Mounted behind requireSession. The driver comes from the session, never from the request.
export function ticketsRouter(db: Db): Router {
  const router = Router();

  const respond = (driverId: string) => ({
    tickets: listTickets(db, driverId),
    categories: TICKET_CATEGORIES,
  });

  router.get('/', (_req, res) => {
    res.json(respond(currentDriver(res).id));
  });

  router.post('/', (req, res) => {
    const driver = currentDriver(res);
    const { category, loadId, message } = (req.body ?? {}) as Record<string, unknown>;

    if (typeof category !== 'string' || !TICKET_CATEGORIES.some((c) => c.id === category)) {
      sendError(res, 400, 'bad_category', 'Choose what your message is about.');
      return;
    }
    const text = typeof message === 'string' ? message.trim() : '';
    if (text.length < TICKET_MESSAGE_MIN) {
      sendError(
        res,
        400,
        'message_too_short',
        `Tell us what is going on, in at least ${TICKET_MESSAGE_MIN} characters.`,
      );
      return;
    }
    if (text.length > TICKET_MESSAGE_MAX) {
      sendError(
        res,
        400,
        'message_too_long',
        `Keep your message under ${TICKET_MESSAGE_MAX.toLocaleString('en-US')} characters.`,
      );
      return;
    }

    // A ticket may name a load, but only one of this driver's own.
    let forLoad: string | null = null;
    if (typeof loadId === 'string' && loadId !== '') {
      const load = findLoad(db, driver.id, loadId);
      if (!load) {
        sendError(res, 404, 'not_found', 'We could not find that load.');
        return;
      }
      forLoad = load.id;
    }

    createTicket(db, driver.id, { category, loadId: forLoad, message: text });
    res.status(201).json(respond(driver.id));
  });

  return router;
}
