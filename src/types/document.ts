// Tipos de Gestión Documental (Campaña > Oficina). Reflejan la forma que
// devuelve `api-uscate-back/src/modules/documents/documents.service.ts`.

export interface SimpleUserRef {
  id: string;
  fullName: string;
  email: string;
}

export interface DocumentFolderRef {
  id: string;
  name: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  objectKey: string;
  originalFileName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  checksum: string | null;
  changeNote: string | null;
  uploadedById: string;
  uploadedBy?: SimpleUserRef;
  createdAt: string;
}

export type DocumentStatus = 'ACTIVE' | 'DELETED';

export interface DocumentItem {
  id: string;
  organizationId: string;
  folderId: string | null;
  folder: DocumentFolderRef | null;
  name: string;
  description: string | null;
  currentVersionNumber: number;
  currentVersionId: string | null;
  currentVersion: DocumentVersion | null;
  status: DocumentStatus;
  deletedAt: string | null;
  deletedById: string | null;
  createdById: string;
  createdBy: SimpleUserRef;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFolderItem {
  id: string;
  organizationId: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  _count?: { documents: number; children: number };
}

export interface PaginatedDocuments {
  data: DocumentItem[];
  meta: { total: number; page: number; lastPage: number };
}

export interface SignedUrlResponse {
  url: string;
  expiresInSeconds: number;
}

// Formatos que el backend admite previsualizar inline (PDF/imágenes) — ver
// PREVIEWABLE_EXTENSIONS en api-uscate-back/src/modules/documents/documents.constants.ts.
export const PREVIEWABLE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
