import { Router } from 'express';
import type { Db } from '../db/index.js';
import { listLoads, pickActiveLoad } from '../db/loads.js';
import { currentDriver } from '../middleware/auth.js';
import { sendError } from '../middleware/errors.js';
import { cityCoordinates, distanceMiles } from '../tracking/cities.js';
import type { TrackingProvider } from '../tracking/provider.js';

// Mounted behind requireSession. The load comes from the session's driver. The request carries
// no driver or load ID, so there is nothing to tamper with.
export function trackingRouter(db: Db, provider: TrackingProvider): Router {
  const router = Router();

  router.get('/active-load', (_req, res) => {
    const now = Date.now();
    const load = pickActiveLoad(listLoads(db, currentDriver(res).id, now));
    if (!load) {
      res.json({ simulated: provider.simulated, load: null, position: null });
      return;
    }

    let position;
    try {
      position = provider.getPosition(load, now);
    } catch {
      sendError(
        res,
        503,
        'tracking_unavailable',
        'Live tracking is not available right now. Your load details are still on the Loads screen.',
      );
      return;
    }

    const origin = cityCoordinates(load.origin);
    const destination = cityCoordinates(load.destination);
    // Progress follows the truck's reported position, so the numbers agree with the map.
    const progress = position
      ? Math.min(1, distanceMiles(origin, position) / distanceMiles(origin, destination))
      : load.progress;

    res.json({
      simulated: provider.simulated,
      load: {
        id: load.id,
        status: load.status,
        origin: { ...load.origin, ...origin },
        destination: { ...load.destination, ...destination },
        pickupAt: load.pickupAt,
        deliveryAt: load.deliveryAt,
        delayNote: load.delayNote,
        progress,
      },
      position,
    });
  });

  return router;
}
