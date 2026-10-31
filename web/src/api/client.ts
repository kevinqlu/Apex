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

export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  onUnauthorized = handler;
}

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
    // JSON on every change doubles as a CSRF check.
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

// The browser sets the multipart boundary itself.
export function upload<T>(path: string, form: FormData): Promise<T> {
  return call<T>(path, { method: 'POST', body: form });
}
