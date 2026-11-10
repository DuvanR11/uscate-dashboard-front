import type { User } from '@/store/auth-store';

// Plan hacia la versión estable, Fase 2 (2026-11-10): la API guarda la cédula
// cifrada y la devuelve enmascarada (`•••• 4567`). La completa solo sale por
// «Ver» (con registro) para el administrador y quien tenga el permiso «Ver
// cédula completa». Quién puede verla lo decide el servidor; aquí solo se
// decide si se muestra el botón.

export const FULL_DOCUMENT_PERMISSION = {
  module: 'PROSPECTOS',
  subModule: 'CEDULA_COMPLETA',
} as const;

const ADMIN_ROLE_CODES = ['ADMIN', 'SUPER_ADMIN'];

export function isAdminRole(roleCode: string | null | undefined): boolean {
  return !!roleCode && ADMIN_ROLE_CODES.includes(roleCode);
}

export function isFullDocumentRow(row: {
  module: string;
  subModule?: string | null;
}): boolean {
  return (
    row.module === FULL_DOCUMENT_PERMISSION.module &&
    row.subModule === FULL_DOCUMENT_PERMISSION.subModule
  );
}

export function hasFullDocumentPermission(
  permissions:
    | ReadonlyArray<{ module: string; subModule?: string | null; canRead: boolean }>
    | null
    | undefined,
): boolean {
  return (permissions ?? []).some((p) => isFullDocumentRow(p) && p.canRead);
}

/** ¿Se muestra el botón «Ver»? Nunca en una sesión de «Ver como». */
export function canRevealDocuments(
  user: Pick<User, 'role' | 'permissions'> | null | undefined,
  impersonating: boolean,
): boolean {
  if (!user || impersonating) return false;
  return isAdminRole(user.role?.code) || hasFullDocumentPermission(user.permissions);
}

/** La API devuelve la cédula enmascarada; reenviarla no la cambia. */
export function isMaskedDocument(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.includes('•');
}
