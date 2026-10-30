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

// The server answers with the full list, so the app never guesses what changed.
export const markNotificationsRead = (ids: string[]) =>
  request<{ notifications: Notification[] }>('POST', '/notifications/read', { ids });
