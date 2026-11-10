'use client';

import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost } from '@/lib/api';

// Plan hacia la versión estable, Fase 3c (2026-11-10): visitas puerta a
// puerta (`modules/crm/field-visits`). Mientras el servidor las tenga
// apagadas (`FIELD_VISITS_ENABLED`), `config` dice `enabled: false` y el panel
// no muestra nada de esto.

export type VisitResult = 'NOT_HOME' | 'ATTENDED' | 'SUPPORTS' | 'UNDECIDED' | 'OPPOSES' | 'DO_NOT_RETURN';

export const VISIT_RESULT_ORDER: VisitResult[] = [
  'NOT_HOME',
  'ATTENDED',
  'SUPPORTS',
  'UNDECIDED',
  'OPPOSES',
  'DO_NOT_RETURN',
];

export const VISIT_RESULT_LABEL: Record<VisitResult, string> = {
  NOT_HOME: 'No estaba',
  ATTENDED: 'Atendió',
  SUPPORTS: 'Apoya',
  UNDECIDED: 'Indeciso',
  OPPOSES: 'No apoya',
  DO_NOT_RETURN: 'Pidió no volver',
};

/** Clases de la etiqueta de cada resultado (texto en tinta, nunca solo color). */
export const VISIT_RESULT_TONE: Record<VisitResult, string> = {
  NOT_HOME: 'bg-slate-100 text-slate-700',
  ATTENDED: 'bg-sky-100 text-sky-800',
  SUPPORTS: 'bg-green-100 text-green-800',
  UNDECIDED: 'bg-amber-100 text-amber-800',
  OPPOSES: 'bg-red-100 text-red-800',
  DO_NOT_RETURN: 'bg-zinc-800 text-white',
};

export interface FieldVisitsConfig {
  enabled: boolean;
  results: { value: VisitResult; label: string }[];
}

export interface FieldVisit {
  id: string;
  result: VisitResult;
  resultLabel: string;
  note: string | null;
  addressLabel: string | null;
  visitedAt: string;
  locality: { id: number; name: string } | null;
  visitor: { id: string; fullName: string } | null;
  prospect: { id: string; fullName: string } | null;
  location: { latitude: number; longitude: number; accuracyMeters: number | null } | null;
  canDelete: boolean;
}

export interface ProspectVisits {
  lastResult: VisitResult | null;
  lastVisitedAt: string | null;
  doNotReturn: boolean;
  visits: FieldVisit[];
}

export type ByResult = Record<VisitResult, number>;

export interface MyVisits {
  days: number;
  total: number;
  byResult: ByResult;
  visits: FieldVisit[];
}

export interface CoverageZone {
  localityId: number | null;
  name: string;
  kind: string | null;
  lat: number | null;
  lng: number | null;
  total: number;
  byResult: ByResult;
  lastVisitAt: string | null;
}

export interface VisitCoverage {
  days: number;
  scope: 'ORGANIZATION' | 'TEAM';
  total: number;
  byResult: ByResult;
  zones: CoverageZone[];
}

export interface NewFieldVisit {
  prospectId?: string;
  localityId?: number;
  result: VisitResult;
  note?: string;
  addressLabel?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}

export const fieldVisitsApi = {
  config: () => apiGet<FieldVisitsConfig>('/field-visits/config'),
  create: (input: NewFieldVisit) => apiPost<FieldVisit>('/field-visits', input),
  forProspect: (prospectId: string) => apiGet<ProspectVisits>(`/field-visits/prospect/${prospectId}`),
  mine: (days = 7) => apiGet<MyVisits>('/field-visits/mine', { params: { days } }),
  coverage: (days = 30) => apiGet<VisitCoverage>('/field-visits/coverage', { params: { days } }),
  remove: (id: string) => apiDelete<{ id: string; deleted: boolean }>(`/field-visits/${id}`),
};

// Una sola consulta de la configuración por carga de la página.
let configPromise: Promise<boolean> | null = null;

/** `true` solo cuando el servidor tiene las visitas encendidas; `null` mientras pregunta. */
export function useFieldVisitsEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    configPromise ??= fieldVisitsApi
      .config()
      .then((config) => config.enabled === true)
      .catch(() => {
        configPromise = null;
        return false;
      });
    configPromise.then((value) => {
      if (!cancelled) setEnabled(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}

/** Fecha y hora de Colombia, corta («9 nov., 3:40 p. m.»). */
export function visitTime(value: string): string {
  return new Date(value).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });
}
