// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { todayISO } from '@/lib/dates';

// Plan "Cadena de Firma", Fase 3 (2026-09-03) — RECHAZADO real: el
// congresista ahora puede devolver un borrador con un motivo real, en vez
// de que el único camino fuera seguir editando a ciegas.
export type PetitionStatus = 'BORRADOR' | 'EN_REVISION' | 'FIRMADO' | 'RECHAZADO' | 'RADICADO' | 'ENVIADO' | 'RESPONDIDO' | 'ARCHIVADO' | 'VENCIDO';
export type PetitionDirection = 'CREADA' | 'RESPUESTA';

/**
 * Fase 3 del análisis de punta a punta (2026-10-28, GOB-04): firmada o en un
 * estado posterior. El servidor ya no deja cambiar su contenido (responde 409),
 * así que la pantalla la muestra de solo lectura y no la autoguarda. Mismo
 * criterio que `isPetitionLocked()` del servidor (`petition-section-base.ts`).
 */
export const LOCKED_PETITION_STATUSES = ['FIRMADO', 'RADICADO', 'ENVIADO', 'RESPONDIDO', 'ARCHIVADO'];

export function isPetitionLocked(status?: string | null, signedAt?: string | null): boolean {
  return !!signedAt || LOCKED_PETITION_STATUSES.includes(status ?? '');
}

export type PetitionForm = {
  id: string;
  radicado: string;
  petitioner: string;
  // Post-plan (2026-09-03) — "notificación real al peticionario": sin
  // esto, no hay forma real de avisarle al ciudadano cuando su petición
  // queda firmada.
  petitionerEmail: string;
  petitionType: string;
  petitionDirection: PetitionDirection;
  status: PetitionStatus;
  receivedAt: string;
  originalText: string;
  generatedDraft: string;
  signedBy?: string;
  signedAt?: string;
  signatureImage?: string;
  rejectionReason?: string | null;
  // Post-plan (2026-09-03) — "asignación de abogados con UI real": el
  // backend tiene `assignLawyer()` desde la Fase 2, nunca conectado a
  // ningún control del frontend hasta ahora.
  assignedLawyerId?: string | null;
  // Post-plan (2026-09-03) — "extensión de plazo legal" (Art. 14, Ley 1755
  // de 2015).
  deadlineAt?: string;
  deadlineExtendedAt?: string | null;
  deadlineExtensionReason?: string | null;
};

// Deuda técnica menor (2026-09-17) — forma real de `GET /petitions`,
// superset de `PetitionForm`: agrega el semáforo/plazo calculados
// server-side (nunca en `PetitionForm`, que es solo el editor) y `draft`
// (nombre legado del campo, aún leído como fallback en `handleLoadPetition`).
/** Estados en los que el plazo ya no corre: la petición fue atendida. */
export const ATTENDED_STATUSES = ['FIRMADO', 'RESPONDIDO', 'ARCHIVADO'];

/**
 * Plazo de una petición en la tabla. Una ya atendida no sigue contando días
 * (se veía "-17 días" con punto verde en una petición respondida), y una
 * vencida se muestra vencida, en rojo.
 */
export function DeadlineCell({
  status,
  trafficLight,
  daysLeft,
}: {
  status?: string;
  trafficLight?: string;
  daysLeft?: number | null;
}) {
  if (status && ATTENDED_STATUSES.includes(status)) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <div className="h-3 w-3 rounded-full bg-green-500" />
        <span className="font-semibold">Atendida</span>
      </div>
    );
  }
  if (daysLeft === null || daysLeft === undefined) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <div className="h-3 w-3 rounded-full bg-slate-300" />
        <span className="font-semibold">Sin plazo</span>
      </div>
    );
  }
  if (daysLeft < 0) {
    const overdue = Math.abs(daysLeft);
    return (
      <div className="flex items-center gap-2 text-red-700">
        <div className="h-3 w-3 rounded-full animate-pulse bg-red-500" />
        <span className="font-black">Vencida hace {overdue} {overdue === 1 ? 'día' : 'días'}</span>
      </div>
    );
  }
  const dot = trafficLight === 'RED' ? 'animate-pulse bg-red-500' : trafficLight === 'YELLOW' ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${dot}`} />
      <span className="font-black">
        {daysLeft === 0 ? 'Vence hoy' : `${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`}
      </span>
    </div>
  );
}

export type PetitionListItem = PetitionForm & {
  // El servidor también responde EXPIRED (plazo vencido) y GRAY (sin plazo):
  // la pantalla solo conocía tres colores y pintaba esos dos en VERDE.
  trafficLight?: 'RED' | 'YELLOW' | 'GREEN' | 'EXPIRED' | 'GRAY';
  daysLeft?: number | null;
  draft?: string;
};

export interface PetitionHistoryEntry {
  id: string;
  action: string;
  user?: { fullName?: string };
  createdAt: string;
  detail?: string;
}

export const initialForm: PetitionForm = {
  id: '',
  radicado: '',
  petitioner: '',
  petitionerEmail: '',
  petitionType: 'GENERAL',
  petitionDirection: 'CREADA',
  signedBy: '',
  signedAt: '',
  signatureImage: '',
  status: 'BORRADOR',
  // Fase 3 del análisis de punta a punta (2026-10-28, GOB-07): era el día en
  // UTC, y después de las 7 p. m. proponía mañana (que el servidor ya rechaza
  // por futura). `handleNewDraft()` lo vuelve a calcular al abrir el borrador.
  receivedAt: todayISO(),
  originalText: '',
  generatedDraft: '',
  rejectionReason: null,
  assignedLawyerId: null,
};

// Plan "Cadena de Firma", Fase 3 (2026-09-03) — el backend ahora devuelve
// mensajes reales y específicos (motivo del 403 de rol, validación del
// motivo de rechazo, etc.) — mostrarlos tal cual es más útil que un
// genérico "Error al...".
// TRV-25: vive en `lib/api-error.ts`; se reexporta para los imports de siempre.
export { extractErrorMessage } from '@/lib/api-error';

// Plan "Cadena de Firma", Fase 4 (2026-09-03) — etiquetas en español de los
// 6 hitos reales que `PetitionsService.logHistory()` registra (backend,
// mismo enum real).
export const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATED: 'Petición creada',
  ASSIGNED: 'Asignada a un abogado',
  AI_DRAFT_GENERATED: 'Borrador generado con IA',
  SUBMITTED_FOR_REVIEW: 'Enviada a revisión',
  REJECTED: 'Rechazada por el despacho',
  APPROVED: 'Aprobada y firmada',
  DEADLINE_EXTENDED: 'Plazo legal extendido',
  DEADLINE_ALERT_SENT: 'Aviso de vencimiento enviado',
  PETITIONER_NOTIFIED: 'Peticionario notificado por correo',
};

// Fase 4 del análisis de punta a punta (2026-10-28, GOB-18): la tabla y el
// editor mostraban el código del estado ("EN REVISION", sin tilde). Todos los
// valores de `PetitionStatus` del servidor (`schema.prisma`).
export const PETITION_STATUS_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  FIRMADO: 'Firmada',
  RECHAZADO: 'Rechazada',
  RADICADO: 'Radicada',
  ENVIADO: 'Enviada',
  RESPONDIDO: 'Respondida',
  ARCHIVADO: 'Archivada',
  VENCIDO: 'Vencida',
};

export const petitionTypeInfo: Record<string, { label: string; days: string; help: string }> = {
  INFORMACION: {
    label: 'Información / documentos',
    days: '10 días hábiles',
    help: 'Solicitudes de copias, datos, documentos o información pública.',
  },
  GENERAL: {
    label: 'Petición general',
    days: '15 días hábiles',
    help: 'Quejas, reclamos, solicitudes particulares o peticiones ciudadanas.',
  },
  CONSULTA: {
    label: 'Consulta',
    days: '30 días hábiles',
    help: 'Solicitudes de concepto o interpretación jurídica/administrativa.',
  },
};
