import { request, upload } from './client';

export type DocumentStatus = 'missing' | 'review' | 'approved';

export interface DocumentFile {
  id: string;
  originalName: string;
  size: number;
  mime: string;
  status: 'review' | 'approved';
  uploadedAt: string;
}

export interface DocumentCenter {
  required: { type: string; label: string; status: DocumentStatus; document?: DocumentFile }[];
  proofOfDelivery: {
    load: { id: string; from: string; to: string; deliveredAt: string };
    status: DocumentStatus;
    document?: DocumentFile;
  }[];
}

export const getDocuments = () => request<DocumentCenter>('GET', '/documents');

export function uploadDocument(type: string, file: File, loadId?: string) {
  const form = new FormData();
  form.append('type', type);
  if (loadId) form.append('loadId', loadId);
  form.append('file', file);
  return upload<DocumentCenter>('/documents', form);
}

export const documentFileUrl = (id: string) => `/api/documents/${id}/file`;
