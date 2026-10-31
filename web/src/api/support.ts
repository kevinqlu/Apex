import { request } from './client';

export interface Support {
  roadside: { label: string; phone: string; hours: string };
  terminal: { name: string; phone: string; hours: string };
  dispatcher: { name: string; phone: string };
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

export interface TicketList {
  tickets: Ticket[];
  categories: { id: string; label: string }[];
}

export const getSupport = () => request<Support>('GET', '/support');

export const getTickets = () => request<TicketList>('GET', '/tickets');

export const createTicket = (ticket: { category: string; loadId?: string; message: string }) =>
  request<TicketList>('POST', '/tickets', ticket);
