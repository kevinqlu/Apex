import { randomBytes } from 'node:crypto';
import { toProfile, type DriverProfile, type DriverRow } from './drivers.js';
import type { Db } from './index.js';

export function createSession(
  db: Db,
  driverId: string,
  hours: number,
  now = Date.now(),
): { id: string; expiresAt: Date } {
  // Unguessable session id.
  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(now + hours * 3_600_000);
  db.prepare('INSERT INTO sessions (id, driver_id, expires_at) VALUES (?, ?, ?)').run(
    id,
    driverId,
    expiresAt.toISOString(),
  );
  return { id, expiresAt };
}

// The driver comes only from this lookup, never from the client.
export function findDriverBySession(
  db: Db,
  sessionId: string,
  now = Date.now(),
): DriverProfile | undefined {
  const row = db
    .prepare(
      `SELECT d.*, s.expires_at FROM sessions s
       JOIN drivers d ON d.id = s.driver_id
       WHERE s.id = ?`,
    )
    .get(sessionId) as (DriverRow & { expires_at: string }) | undefined;
  if (!row) return undefined;
  if (Date.parse(row.expires_at) <= now) {
    deleteSession(db, sessionId);
    return undefined;
  }
  return toProfile(row);
}

export function deleteSession(db: Db, sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}
