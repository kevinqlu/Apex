import type { RequestHandler } from 'express';
import { sendError } from './errors.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// CSRF defense for cookie sessions. A page on another site can make the browser send our
// cookie, but it cannot set a matching Origin header or send JSON without a preflight.
export function originCheck(appOrigin: string): RequestHandler {
  return (req, res, next) => {
    if (!MUTATING.has(req.method)) {
      next();
      return;
    }
    if (req.headers.origin !== appOrigin) {
      sendError(
        res,
        403,
        'bad_origin',
        'That request did not come from the Apex app. Reload the page and try again.',
      );
      return;
    }
    // Uploads are the one exception to JSON, and they still must come from our own origin.
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
