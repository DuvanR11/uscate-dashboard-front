// Fase 2 del análisis de punta a punta (2026-10-28, MSG-06): textos y fechas
// que comparten la tabla y el detalle de la cola de Habeas Data.
import type { DataSubjectRequest, DataSubjectRequestStatus } from '@/lib/api/habeas-data';

export const REQUEST_TYPE_LABEL: Record<string, string> = {
  ACCESO: 'Acceso',
  RECTIFICACION: 'Rectificación',
  CANCELACION: 'Cancelación',
  OPOSICION: 'Oposición',
};

export const STATUS_CONFIG: Record<
  DataSubjectRequestStatus,
  { label: string; variant: 'secondary' | 'outline' | 'default' | 'destructive' }
> = {
  PENDIENTE: { label: 'Pendiente', variant: 'secondary' },
  EN_REVISION: { label: 'En revisión', variant: 'outline' },
  RESUELTA: { label: 'Resuelta', variant: 'default' },
  RECHAZADA: { label: 'Rechazada', variant: 'destructive' },
};

export function isOpenRequest(request: DataSubjectRequest): boolean {
  return request.status === 'PENDIENTE' || request.status === 'EN_REVISION';
}

/** Cancelación y oposición son las que cambian datos al resolverse. */
export function changesDataOnResolve(request: DataSubjectRequest): boolean {
  return request.requestType === 'CANCELACION' || request.requestType === 'OPOSICION';
}

/** Fecha de un instante del servidor, en el día de Colombia. */
export function formatRequestDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
}

export function daysRemaining(request: DataSubjectRequest): number {
  const dueAt = new Date(request.extendedDueAt ?? request.dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueAt.setHours(0, 0, 0, 0);
  return Math.ceil((dueAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
