import { request } from './client';
import type { Driver } from './auth';

export const setDutyStatus = (dutyStatus: Driver['dutyStatus']) =>
  request<{ driver: Driver }>('PATCH', '/me/duty-status', { dutyStatus });
