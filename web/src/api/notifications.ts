import { request } from './client';

export interface Notification {
  id: string;
  kind: 'urgent' | 'announcement';
  category: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export const getNotifications = () =>
  request<{ notifications: Notification[] }>('GET', '/notifications');

export const markNotificationsRead = (ids: string[]) =>
  request<{ notifications: Notification[] }>('POST', '/notifications/read', { ids });
