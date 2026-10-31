import type { Db } from './index.js';

export type DutyStatus = 'driving' | 'on_duty' | 'sleeper' | 'off_duty';

// Never includes the password hash.
export interface DriverProfile {
  id: string;
  name: string;
  terminal: string;
  dispatcherName: string;
  dispatcherPhone: string;
  dutyStatus: DutyStatus;
}

export interface DriverRow {
  id: string;
  name: string;
  password_hash: string;
  terminal: string;
  dispatcher_name: string;
  dispatcher_phone: string;
  duty_status: DutyStatus;
}

export function toProfile(row: DriverRow): DriverProfile {
  return {
    id: row.id,
    name: row.name,
    terminal: row.terminal,
    dispatcherName: row.dispatcher_name,
    dispatcherPhone: row.dispatcher_phone,
    dutyStatus: row.duty_status,
  };
}

export function findDriverById(db: Db, id: string): DriverRow | undefined {
  return db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) as DriverRow | undefined;
}
