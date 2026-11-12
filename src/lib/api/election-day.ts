'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import api, { apiDelete, apiGet, apiPatch, apiPost, apiPut, LONG_REQUEST_TIMEOUT_MS } from '@/lib/api';

// Plan hacia la versión estable, Fase 5 (2026-11-10): jornada electoral
// (`modules/election-day`). Mientras el servidor la tenga apagada
// (`JORNADA_ELECTORAL_ENABLED`), `config` dice `enabled: false`, los módulos
// no aparecen en los permisos de nadie y el panel no muestra nada de esto.

export const ELECTION_DAY_MODULE = 'JORNADA_ELECTORAL';
export const ELECTION_DAY_ADMIN_MODULE = 'JORNADA_ELECTORAL_ADMIN';

export type ContestStatus = 'DRAFT' | 'OPEN' | 'CLOSED';
export type LineKind = 'CANDIDATE' | 'LIST' | 'BLANK' | 'NULL_VOTE' | 'UNMARKED';
export type ResultStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
export type ReadingStatus = 'NONE' | 'PENDING' | 'DONE' | 'FAILED';
export type ResultFlag = 'SUM_MISMATCH' | 'OVER_POTENTIAL' | 'PHOTO_MISMATCH' | 'NO_PHOTO';
export type IncidentKind =
  | 'VOTE_BUYING'
  | 'VOTER_PRESSURE'
  | 'VIOLENCE'
  | 'PROPAGANDA'
  | 'MISSING_MATERIAL'
  | 'WITNESS_BLOCKED'
  | 'TABLE_NOT_INSTALLED'
  | 'COUNTING_IRREGULARITY'
  | 'OTHER';
export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export const CONTEST_STATUS_LABEL: Record<ContestStatus, string> = {
  DRAFT: 'En preparación',
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
};

export const CONTEST_STATUS_TONE: Record<ContestStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-zinc-200 text-zinc-700',
};

export const LINE_KIND_LABEL: Record<LineKind, string> = {
  CANDIDATE: 'Candidato',
  LIST: 'Lista o partido',
  BLANK: 'Voto en blanco',
  NULL_VOTE: 'Votos nulos',
  UNMARKED: 'Tarjetas no marcadas',
};

export const FIXED_LINE_KINDS: LineKind[] = ['BLANK', 'NULL_VOTE', 'UNMARKED'];

export const RESULT_STATUS_LABEL: Record<ResultStatus, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviado',
  REVIEWED: 'Revisado',
};

export const RESULT_FLAG_LABEL: Record<ResultFlag, string> = {
  SUM_MISMATCH: 'La suma no da el total',
  OVER_POTENTIAL: 'Más votantes que el potencial',
  PHOTO_MISMATCH: 'No coincide con la foto',
  NO_PHOTO: 'Sin foto',
};

export const INCIDENT_KIND_ORDER: IncidentKind[] = [
  'VOTE_BUYING',
  'VOTER_PRESSURE',
  'VIOLENCE',
  'PROPAGANDA',
  'MISSING_MATERIAL',
  'WITNESS_BLOCKED',
  'TABLE_NOT_INSTALLED',
  'COUNTING_IRREGULARITY',
  'OTHER',
];

export const INCIDENT_KIND_LABEL: Record<IncidentKind, string> = {
  VOTE_BUYING: 'Compra de votos',
  VOTER_PRESSURE: 'Presión a votantes',
  VIOLENCE: 'Violencia o amenazas',
  PROPAGANDA: 'Propaganda en el puesto',
  MISSING_MATERIAL: 'Falta material electoral',
  WITNESS_BLOCKED: 'No dejan entrar al testigo',
  TABLE_NOT_INSTALLED: 'La mesa no se instaló',
  COUNTING_IRREGULARITY: 'Irregularidad en el conteo',
  OTHER: 'Otro',
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  OPEN: 'Abierto',
  ACKNOWLEDGED: 'Atendido',
  RESOLVED: 'Resuelto',
};

export const INCIDENT_STATUS_TONE: Record<IncidentStatus, string> = {
  OPEN: 'bg-red-100 text-red-800',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

export interface ContestLine {
  id: string;
  label: string;
  kind: LineKind;
  isOwn: boolean;
  position?: number;
}

export interface Contest {
  id: string;
  name: string;
  electionDate: string | null;
  status: ContestStatus;
  coversAllLines: boolean;
  openedAt: string | null;
  closedAt: string | null;
  lines: ContestLine[];
}

export interface ContestSummary extends Omit<Contest, 'lines'> {
  lineCount: number;
  witnessCount: number;
  resultCount: number;
}

export interface ContestLineInput {
  id?: string;
  label: string;
  kind: LineKind;
  isOwn?: boolean;
}

export interface ContestInput {
  name: string;
  electionDate?: string | null;
  coversAllLines?: boolean;
  lines: ContestLineInput[];
}

export interface Station {
  id: number;
  name: string;
  address: string | null;
  registeredVoters: number | null;
  declaredTables: number | null;
  createdTables: number;
  municipality: { id: number; name: string } | null;
  locality: { id: number; name: string } | null;
}

export interface ElectionTable {
  id: string;
  number: number;
  registeredVoters: number | null;
}

export interface Witness {
  id: string;
  contestId: string;
  credentialNumber: string | null;
  accreditedAt: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string; phone: string | null; isActive: boolean };
  pollingStation: { id: number; name: string };
  tables: { installedAt: string | null; table: { id: string; number: number } }[];
}

export interface WitnessInput {
  userId?: string;
  fullName?: string;
  documentNumber?: string;
  phone?: string;
  email?: string;
  password?: string;
  pollingStationId: number;
  credentialNumber?: string;
  tableIds?: string[];
}

export interface ResultRow {
  id: string;
  number: number;
  registeredVoters: number | null;
  pollingStation: { id: number; name: string };
  witness: { id: string; fullName: string; phone: string | null; installedAt: string | null } | null;
  result: {
    id: string;
    status: ResultStatus;
    totalVoters: number | null;
    flags: ResultFlag[];
    readingStatus: ReadingStatus;
    submittedAt: string | null;
    hasPhoto: boolean;
  } | null;
}

export interface ResultPage {
  total: number;
  page: number;
  pageSize: number;
  items: ResultRow[];
}

export interface ResultDetail {
  id: string;
  status: ResultStatus;
  totalVoters: number | null;
  readTotalVoters: number | null;
  readingStatus: ReadingStatus;
  readingError: string | null;
  flags: ResultFlag[];
  flagLabels: string[];
  reportedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  hasPhoto: boolean;
  contest: { id: string; name: string; coversAllLines: boolean; lines: ContestLine[] };
  table: ElectionTable;
  station: { id: number; name: string };
  lines: { lineId: string; votes: number | null; readVotes: number | null }[];
  witness: { user: { fullName: string; phone: string | null } } | null;
  reportedBy: { fullName: string } | null;
  reviewedBy: { fullName: string } | null;
}

export interface LineVotes {
  lineId: string;
  votes: number;
}

export interface Incident {
  id: string;
  contestId: string;
  kind: IncidentKind;
  kindLabel: string;
  description: string | null;
  occurredAt: string;
  status: IncidentStatus;
  statusLabel: string;
  handledAt: string | null;
  resolutionNote: string | null;
  hasPhoto: boolean;
  clientId: string | null;
  pollingStation: { id: number; name: string };
  table: { id: string; number: number } | null;
  reporter?: { fullName: string; phone: string | null } | null;
  handledBy?: { fullName: string } | null;
}

export interface LiveBucket {
  tables: number;
  reported: number;
  toReview: number;
  installed: number;
  openIncidents: number;
  votes: Record<string, number>;
}

export interface LiveCount {
  contest: Pick<Contest, 'id' | 'name' | 'status' | 'electionDate' | 'coversAllLines'>;
  serverTime: string;
  totals: Omit<LiveBucket, 'votes'>;
  lines: (ContestLine & { votes: number; share: number | null })[];
  byMunicipality: ({ id: number | null; name: string } & LiveBucket)[];
  byStation: ({ id: number; name: string; municipalityId: number | null } & LiveBucket)[];
}

export interface WarRoomElectionCount {
  contests: (LiveCount['contest'] & { totals: LiveCount['totals']; lines: LiveCount['lines'] })[];
  recentIncidents: {
    id: string;
    contestId: string;
    kind: IncidentKind;
    kindLabel: string;
    occurredAt: string;
    stationName: string;
    tableNumber: number | null;
  }[];
}

/** Lo que el testigo guarda en el celular para trabajar sin señal. */
export interface MyAssignment {
  witnessId: string;
  credentialNumber: string | null;
  accreditedAt: string | null;
  contest: Pick<Contest, 'id' | 'name' | 'electionDate' | 'status' | 'closedAt' | 'coversAllLines'> & {
    lines: ContestLine[];
  };
  station: { id: number; name: string; address: string | null; municipality: { name: string } | null };
  tables: (ElectionTable & {
    installedAt: string | null;
    result: {
      status: ResultStatus;
      clientId: string | null;
      totalVoters: number | null;
      flags: ResultFlag[];
      hasPhoto: boolean;
      readingStatus: ReadingStatus;
      submittedAt: string | null;
      lines: { lineId: string; votes: number | null }[];
    } | null;
  })[];
}

export interface WitnessNotice {
  version: string;
  text: string;
}

export interface PhotoProposal {
  resultId: string;
  totalVoters: number | null;
  lines: { lineId: string; votes: number | null }[];
}

const base = '/election-day';
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const electionDayApi = {
  config: () => apiGet<{ enabled: boolean }>(`${base}/config`),

  // Contiendas
  contests: () => apiGet<ContestSummary[]>(`${base}/contests`),
  contest: (id: string) => apiGet<Contest>(`${base}/contests/${id}`),
  createContest: (input: ContestInput) => apiPost<Contest>(`${base}/contests`, input),
  updateContest: (id: string, input: ContestInput) => apiPut<Contest>(`${base}/contests/${id}`, input),
  setStatus: (id: string, status: 'OPEN' | 'CLOSED') =>
    apiPost<Contest>(`${base}/contests/${id}/status`, { status }),
  removeContest: (id: string) => apiDelete<{ id: string }>(`${base}/contests/${id}`),
  live: (id: string) => apiGet<LiveCount>(`${base}/contests/${id}/live`),

  // Puestos y mesas
  stations: () => apiGet<Station[]>(`${base}/stations`),
  tables: (stationId: number) => apiGet<ElectionTable[]>(`${base}/stations/${stationId}/tables`),
  addTable: (stationId: number, input: { number: number; registeredVoters?: number | null }) =>
    apiPost<ElectionTable>(`${base}/stations/${stationId}/tables`, input),
  generateTables: (stationIds?: number[]) =>
    apiPost<{ stations: number; created: number }>(`${base}/tables/generate`, stationIds ? { stationIds } : {}),
  updateTable: (tableId: string, registeredVoters: number | null) =>
    apiPatch<ElectionTable>(`${base}/tables/${tableId}`, { registeredVoters }),
  removeTable: (tableId: string) => apiDelete<{ id: string }>(`${base}/tables/${tableId}`),

  // Testigos
  witnesses: (contestId: string) => apiGet<Witness[]>(`${base}/contests/${contestId}/witnesses`),
  witnessAccounts: () =>
    apiGet<{ id: string; fullName: string; email: string; phone: string | null }[]>(`${base}/witness-accounts`),
  createWitness: (contestId: string, input: WitnessInput) =>
    apiPost<Witness>(`${base}/contests/${contestId}/witnesses`, input),
  updateWitness: (id: string, input: { credentialNumber?: string | null; accredited?: boolean; tableIds?: string[] }) =>
    apiPatch<Witness>(`${base}/witnesses/${id}`, input),
  removeWitness: (id: string) =>
    apiDelete<{ id: string; accountDeactivated: boolean }>(`${base}/witnesses/${id}`),

  // E-14
  results: (contestId: string, params: { status?: string; stationId?: number; page?: number }) =>
    apiGet<ResultPage>(`${base}/contests/${contestId}/results`, { params }),
  result: (id: string) => apiGet<ResultDetail>(`${base}/results/${id}`),
  resultPhoto: (id: string) => apiGet<{ url: string }>(`${base}/results/${id}/photo`),
  review: (id: string, input: { totalVoters?: number; lines?: LineVotes[]; note?: string }) =>
    apiPatch<ResultDetail>(`${base}/results/${id}/review`, input),
  staffResult: (contestId: string, tableId: string, input: { totalVoters: number; lines: LineVotes[]; note?: string }) =>
    apiPut<ResultDetail>(`${base}/contests/${contestId}/tables/${tableId}/result`, input),

  // Incidentes
  incidents: (contestId: string, status?: IncidentStatus) =>
    apiGet<Incident[]>(`${base}/contests/${contestId}/incidents`, { params: status ? { status } : {} }),
  handleIncident: (id: string, input: { status: IncidentStatus; note?: string }) =>
    apiPatch<Incident>(`${base}/incidents/${id}`, input),
  incidentPhoto: (id: string) => apiGet<{ url: string }>(`${base}/incidents/${id}/photo`),

  // El testigo
  me: () => apiGet<MyAssignment[]>(`${base}/me`),
  /** El aviso de datos que el testigo lee al entrar por primera vez (abogado, 2026-11-11). */
  notice: () => apiGet<WitnessNotice>(`${base}/me/notice`),
  install: (contestId: string, tableId: string) =>
    apiPost<{ installedAt: string }>(`${base}/me/tables/${tableId}/install`, { contestId }),
  readPhoto: async (contestId: string, tableId: string, photo: Blob) => {
    const form = new FormData();
    form.append('contestId', contestId);
    form.append('photo', photo, 'e14.jpg');
    const response = await api.post<PhotoProposal>(`${base}/me/tables/${tableId}/read`, form, {
      ...multipart,
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  },
  myIncidents: (contestId: string) => apiGet<Incident[]>(`${base}/me/incidents`, { params: { contestId } }),
};

// Una sola consulta de la configuración por carga de la página.
let configPromise: Promise<boolean | null> | null = null;

/**
 * `true` solo cuando el servidor tiene la jornada encendida; `null` mientras
 * pregunta o si no hubo respuesta (sin señal: el testigo sigue con lo que
 * tiene guardado en el celular).
 */
export function useElectionDayEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    configPromise ??= electionDayApi
      .config()
      .then((config) => config.enabled === true)
      .catch((error: unknown) => {
        configPromise = null;
        return axios.isAxiosError(error) && !error.response ? null : false;
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

/** Un identificador para que un reenvío sin señal no duplique el reporte. */
export function newClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().replace(/-/g, '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Achica la foto en el celular antes de subirla (lado mayor de 2.000 px,
 * JPEG): un E-14 sigue legible y pesa una fracción del original.
 */
export async function compressPhoto(file: File, maxSide = 2000, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Contienda elegida en las pantallas de la campaña (se recuerda en este navegador). */
const SELECTED_KEY = 'zyron:jornada:contest';

export function rememberedContest(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

export function rememberContest(id: string) {
  try {
    localStorage.setItem(SELECTED_KEY, id);
  } catch {
    // Sin almacenamiento local no se recuerda; no pasa nada.
  }
}

export const number = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : new Intl.NumberFormat('es-CO').format(value);

export const percent = (value: number | null | undefined) =>
  value === null || value === undefined
    ? '—'
    : `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)} %`;

export const timeOf = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('es-CO', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Bogota',
      }).format(new Date(value))
    : '—';
