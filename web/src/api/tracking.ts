import { request } from './client';
import type { LoadStatus, Place } from './loads';

export interface Position {
  lat: number;
  lng: number;
  headingDeg: number;
  speedMph: number;
  updatedAt: string;
}

export type Stop = Place & { lat: number; lng: number };

export interface TrackedLoad {
  id: string;
  status: LoadStatus;
  origin: Stop;
  destination: Stop;
  pickupAt: string;
  deliveryAt: string;
  delayNote: string | null;
  progress: number;
}

export interface Tracking {
  simulated: boolean;
  load: TrackedLoad | null;
  position: Position | null;
}

export const getActiveLoadTracking = () => request<Tracking>('GET', '/tracking/active-load');
