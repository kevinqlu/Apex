import type { RequestHandler } from 'express';
import { sendError } from './errors.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// CSRF defense: another site cannot set a matching Origin or send JSON without a preflight.
export function originCheck(appOrigins: string[]): RequestHandler {
  return (req, res, next) => {
    if (!MUTATING.has(req.method)) {
      next();
      return;
    }
    if (!req.headers.origin || !appOrigins.includes(req.headers.origin)) {
      sendError(
        res,
        403,
        'bad_origin',
        'That request did not come from the Apex app. Reload the page and try again.',
      );
      return;
    }
    // Uploads are not JSON but must still come from our origin.
    const isUpload = req.method === 'POST' && req.path === '/documents';
    const contentType = req.headers['content-type'] ?? '';
    const allowed = isUpload
      ? contentType.startsWith('multipart/form-data')
      : contentType.startsWith('application/json');
    if (!allowed) {
      sendError(
        res,
        415,
        'bad_content_type',
        'That request could not be read. Reload the page and try again.',
      );
      return;
    }
    next();
  };
}
