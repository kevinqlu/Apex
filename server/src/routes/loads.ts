import { Router } from 'express';
import type { Db } from '../db/index.js';
import { findLoad, listLoads } from '../db/loads.js';
import { currentDriver } from '../middleware/auth.js';
import { sendError } from '../middleware/errors.js';

// Mounted behind requireSession. The driver comes from the session, never from the request.
export function loadsRouter(db: Db): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ loads: listLoads(db, currentDriver(res).id) });
  });

  router.get('/:id', (req, res) => {
    const load = findLoad(db, currentDriver(res).id, req.params.id);
    if (!load) {
      sendError(res, 404, 'not_found', 'We could not find that load.');
      return;
    }
    res.json({ load });
  });

  return router;
}
