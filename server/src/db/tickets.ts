import { randomBytes } from 'node:crypto';
import { TICKET_CATEGORIES } from '../config/support.js';
import type { Db } from './index.js';

interface TicketRow {
  id: string;
  category: string;
  load_id: string | null;
  message: string;
  status: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  category: string;
  categoryLabel: string;
  loadId: string | null;
  message: string;
  status: string;
  createdAt: string;
}

const labelFor = (id: string) => TICKET_CATEGORIES.find((c) => c.id === id)?.label ?? id;

// Only this driver's tickets.
export function listTickets(db: Db, driverId: string): Ticket[] {
  const rows = db
    .prepare('SELECT * FROM tickets WHERE driver_id = ? ORDER BY created_at DESC')
    .all(driverId) as TicketRow[];
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    categoryLabel: labelFor(row.category),
    loadId: row.load_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function createTicket(
  db: Db,
  driverId: string,
  ticket: { category: string; loadId: string | null; message: string },
  now = Date.now(),
): void {
  db.prepare(
    `INSERT INTO tickets (id, driver_id, category, load_id, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?)`,
  ).run(
    `T-${randomBytes(3).toString('hex').toUpperCase()}`,
    driverId,
    ticket.category,
    ticket.loadId,
    ticket.message,
    new Date(now).toISOString(),
  );
}
