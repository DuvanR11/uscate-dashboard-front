import { AlertCircle, ArrowUpCircle, MinusCircle, ArrowDownCircle, LucideIcon } from 'lucide-react';

// Centralizado en un único archivo — a diferencia de `requests`, que
// duplica labels/colores de status y priority 3 veces (columns.tsx,
// manage-request-view.tsx, requests-toolbar.tsx). Ver plan de
// implementación, Fase 5.

export const DENUNCIAS_MODULE = 'DENUNCIAS_DEMANDAS';

export const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  DENUNCIA: 'Denuncia',
  DEMANDA: 'Demanda',
};

export const COMPLAINT_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  RECEIVED: { label: 'Recibido', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  ASSIGNED: { label: 'Asignado', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  IN_PROGRESS: { label: 'En Trámite', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  RESPONDED: { label: 'Respondido', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  CLOSED: { label: 'Cerrado', badgeClass: 'bg-slate-100 text-slate-600 border-slate-300' },
};

export const COMPLAINT_PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  CRITICAL: { label: 'Crítica', color: 'text-red-700 bg-red-50 border-red-200', icon: AlertCircle },
  HIGH: { label: 'Alta', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: ArrowUpCircle },
  MEDIUM: { label: 'Media', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: MinusCircle },
  LOW: { label: 'Baja', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: ArrowDownCircle },
};
