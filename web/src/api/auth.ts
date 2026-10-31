import { request } from './client';

export interface Driver {
  id: string;
  name: string;
  terminal: string;
  dispatcherName: string;
  dispatcherPhone: string;
  dutyStatus: 'driving' | 'on_duty' | 'sleeper' | 'off_duty';
}

export interface DemoInfo {
  drivers: { id: string; name: string }[];
  password: string;
}

export const login = (driverId: string, password: string) =>
  request<{ driver: Driver }>('POST', '/auth/login', { driverId, password });

export const logout = () => request<{ ok: boolean }>('POST', '/auth/logout');

export const getMe = () => request<{ driver: Driver }>('GET', '/auth/me');

export const getDemoInfo = () => request<DemoInfo>('GET', '/auth/demo');
