import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

// The standard error shape from SPEC section 5. The web app shows `message` as written.
export function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

export const notFound: RequestHandler = (_req, res) => {
  sendError(res, 404, 'not_found', 'We could not find that.');
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  // Body parser failures carry a 4xx status. Everything else is ours to fix.
  const status = typeof err?.status === 'number' && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  sendError(
    res,
    status,
    status === 500 ? 'server_error' : 'bad_request',
    status === 500
      ? 'Something went wrong on our end. Try again in a moment.'
      : 'That request could not be read. Reload the page and try again.',
  );
};
