// Error messages from the server are written for drivers, so they are shown as they are.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | undefined;

// The auth provider registers here so any expired session sends the driver to login.
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  onUnauthorized = handler;
}

// A 401 from these is an answer, not an expired session.
const AUTH_QUESTIONS = new Set(['/auth/login', '/auth/me']);

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, credentials: 'same-origin' });
  } catch {
    throw new ApiError(
      'Cannot reach the server. Check your connection and try again.',
      0,
      'network',
    );
  }

  if (res.ok) return (await res.json()) as T;

  const payload = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
  } | null;
  const message = payload?.error?.message ?? 'Something went wrong. Try again in a moment.';
  if (res.status === 401 && !AUTH_QUESTIONS.has(path)) onUnauthorized?.();
  throw new ApiError(message, res.status, payload?.error?.code ?? 'unknown');
}

export function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<T> {
  if (method === 'GET') return call<T>(path, { method });
  return call<T>(path, {
    method,
    // The server requires JSON on every change, as a CSRF check.
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

// For files. The browser sets the multipart type and boundary itself, so no header here.
export function upload<T>(path: string, form: FormData): Promise<T> {
  return call<T>(path, { method: 'POST', body: form });
}
