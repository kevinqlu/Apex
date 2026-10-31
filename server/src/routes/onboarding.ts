import { Router } from 'express';
import type { OnboardingTemplate } from '../config/onboarding.js';
import type { Db } from '../db/index.js';
import { buildOnboarding, recordCompletion } from '../db/onboarding.js';
import { currentDriver } from '../middleware/auth.js';
import { sendError } from '../middleware/errors.js';

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

// Mounted behind requireSession. The driver comes from the session, never from the request.
export function onboardingRouter(db: Db, template: OnboardingTemplate, demoMode: boolean): Router {
  const router = Router();

  const respond = (driverId: string) => ({
    ...buildOnboarding(db, template, driverId),
    demoActions: demoMode,
  });

  router.get('/', (_req, res) => {
    res.json(respond(currentDriver(res).id));
  });

  router.post('/tasks/:taskId/complete', (req, res) => {
    const driver = currentDriver(res);
    const task = template.tasks.find((t) => t.id === req.params.taskId);
    if (!task) {
      sendError(res, 404, 'not_found', 'We could not find that task.');
      return;
    }

    switch (task.type) {
      case 'company':
        // Company steps are never the driver's to complete.
        sendError(
          res,
          403,
          'company_task',
          `Only ${task.ownerLabel} can finish this step. You do not need to do anything.`,
        );
        return;
      case 'upload':
        sendError(
          res,
          400,
          'upload_required',
          'Upload your document on the Documents screen to finish this step.',
        );
        return;
      case 'esign': {
        const { name } = (req.body ?? {}) as Record<string, unknown>;
        if (typeof name !== 'string' || normalizeName(name) !== normalizeName(driver.name)) {
          sendError(
            res,
            400,
            'name_mismatch',
            'The name you typed does not match your name on file. Type your full name to sign.',
          );
          return;
        }
        recordCompletion(db, driver.id, task.id, { signedName: name.trim() });
        break;
      }
      case 'video':
        recordCompletion(db, driver.id, task.id);
        break;
    }
    res.json(respond(driver.id));
  });

  // Demo only: exists only when DEMO_MODE=true.
  router.post('/tasks/:taskId/demo-complete', (req, res) => {
    const task = template.tasks.find((t) => t.id === req.params.taskId);
    if (!demoMode || !task) {
      sendError(res, 404, 'not_found', 'We could not find that.');
      return;
    }
    if (task.type !== 'company') {
      sendError(res, 400, 'not_company_task', 'Only company steps can be finished this way.');
      return;
    }
    const driver = currentDriver(res);
    recordCompletion(db, driver.id, task.id);
    res.json(respond(driver.id));
  });

  return router;
}
