import api from '@/lib/api';
import { ComplaintItem } from '@/types/complaint';

// Cliente centralizado (a diferencia de `requests`, que llama a la API
// inline en cada componente) — ver plan de implementación, Fase 5.

export interface ComplaintListParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  priority?: string;
  assignedUserId?: string;
  search?: string;
}

export interface ComplaintListResponse {
  data: ComplaintItem[];
  meta: { total: number; page: number; lastPage: number };
}

export async function listComplaints(params: ComplaintListParams): Promise<ComplaintListResponse> {
  const res = await api.get('/complaints', { params });
  return res.data;
}

export async function getComplaint(id: number | string): Promise<ComplaintItem> {
  const res = await api.get(`/complaints/${id}`);
  return res.data;
}

export async function assignComplaint(id: number | string, assignedUserId: string): Promise<ComplaintItem> {
  const res = await api.patch(`/complaints/${id}/assign`, { assignedUserId });
  return res.data;
}

export interface AttachmentInput {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function respondComplaint(
  id: number | string,
  payload: { responseText: string; attachments?: AttachmentInput[] },
): Promise<ComplaintItem> {
  const res = await api.patch(`/complaints/${id}/respond`, payload);
  return res.data;
}

export async function closeComplaint(id: number | string, resolutionNotes?: string): Promise<ComplaintItem> {
  const res = await api.patch(`/complaints/${id}/close`, { resolutionNotes });
  return res.data;
}
