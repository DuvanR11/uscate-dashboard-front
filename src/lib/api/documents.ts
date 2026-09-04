import api, { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api';
import {
  DocumentItem,
  DocumentFolderItem,
  DocumentVersion,
  PaginatedDocuments,
  SignedUrlResponse,
} from '@/types/document';

/**
 * Cliente para `GET/POST/PATCH/DELETE /documents` y `/documents/folders`
 * (ver `api-uscate-back/src/modules/documents/`). Los uploads (crear
 * documento / nueva versión) usan `FormData` — mismo patrón ya usado
 * contra `/media/upload` en `request-form.tsx`.
 */

export interface DocumentsQuery {
  page?: number;
  limit?: number;
  folderId?: string;
  search?: string;
}

export function getDocuments(query: DocumentsQuery = {}): Promise<PaginatedDocuments> {
  const params: Record<string, string | number> = {};
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;
  if (query.folderId) params.folderId = query.folderId;
  if (query.search) params.search = query.search;

  return api.get<PaginatedDocuments>('/documents', { params }).then((res) => res.data);
}

export function getDocument(id: string): Promise<DocumentItem> {
  return apiGet<DocumentItem>(`/documents/${id}`);
}

export function createDocument(params: {
  file: File;
  name: string;
  description?: string;
  folderId?: string;
}): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('name', params.name);
  if (params.description) formData.append('description', params.description);
  if (params.folderId) formData.append('folderId', params.folderId);

  return api
    .post<DocumentItem>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
}

export function updateDocument(
  id: string,
  payload: { name?: string; description?: string; folderId?: string | null },
): Promise<DocumentItem> {
  return apiPatch<DocumentItem>(`/documents/${id}`, payload);
}

export function deleteDocument(id: string): Promise<DocumentItem> {
  return apiDelete<DocumentItem>(`/documents/${id}`);
}

export function restoreDocument(id: string): Promise<DocumentItem> {
  return apiPost<DocumentItem>(`/documents/${id}/restore`);
}

export function getDocumentVersions(id: string): Promise<DocumentVersion[]> {
  return apiGet<DocumentVersion[]>(`/documents/${id}/versions`);
}

export function addDocumentVersion(
  id: string,
  params: { file: File; changeNote?: string },
): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', params.file);
  if (params.changeNote) formData.append('changeNote', params.changeNote);

  return api
    .post<DocumentItem>(`/documents/${id}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
}

// Devuelven { url, expiresInSeconds } — URL firmada de Spaces de corta
// duración, nunca una URL pública permanente. `versionId` ausente = versión
// actual.
export function getDownloadUrl(id: string, versionId?: string): Promise<SignedUrlResponse> {
  return api
    .get<SignedUrlResponse>(`/documents/${id}/download`, {
      params: versionId ? { versionId } : undefined,
    })
    .then((res) => res.data);
}

export function getPreviewUrl(id: string): Promise<SignedUrlResponse> {
  return apiGet<SignedUrlResponse>(`/documents/${id}/preview`);
}

export function getDocumentFolders(includeInactive = false): Promise<DocumentFolderItem[]> {
  return api
    .get<DocumentFolderItem[]>('/documents/folders', {
      params: includeInactive ? { includeInactive: 'true' } : undefined,
    })
    .then((res) => res.data);
}

export function createDocumentFolder(payload: {
  name: string;
  parentId?: string;
}): Promise<DocumentFolderItem> {
  return apiPost<DocumentFolderItem>('/documents/folders', payload);
}

export function updateDocumentFolder(
  id: string,
  payload: { name?: string; parentId?: string | null; isActive?: boolean },
): Promise<DocumentFolderItem> {
  return apiPatch<DocumentFolderItem>(`/documents/folders/${id}`, payload);
}

export function deleteDocumentFolder(id: string): Promise<DocumentFolderItem> {
  return apiDelete<DocumentFolderItem>(`/documents/folders/${id}`);
}
