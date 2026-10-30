import { request } from './client';

export type LoadStatus = 'pending' | 'in_transit' | 'delivered' | 'delayed';

export interface Place {
  city: string;
  state: string;
  facility: string;
}

export interface Load {
  id: string;
  status: LoadStatus;
  origin: Place;
  destination: Place;
  cargoDescription: string;
  weightLb: number;
  equipment: string;
  pickupAt: string;
  deliveryAt: string;
  delayNote: string | null;
  reference: string | null;
  progress: number;
}

export const getLoads = () => request<{ loads: Load[] }>('GET', '/loads');
