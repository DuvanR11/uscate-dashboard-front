'use client';

import axios from 'axios';
import api, { LONG_REQUEST_TIMEOUT_MS } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import type { IncidentKind, MyAssignment } from '@/lib/api/election-day';

// Plan hacia la versión estable, Fase 5 (2026-11-10): el celular del testigo
// sin señal. Los E-14 y los incidentes se guardan aquí (IndexedDB del
// navegador) y se envían cuando vuelve la conexión. Cada reporte lleva su
// `clientId`: si el envío llegó pero la respuesta no, reenviarlo no lo
// duplica (el servidor devuelve el que ya tiene).
//
// También se guarda la última copia de «Mis mesas», para abrir la pantalla
// sin señal. Todo queda solo en este navegador y se borra al cerrar sesión
// desde la pantalla del testigo.

const DB_NAME = 'zyron-testigo';
const DB_VERSION = 1;
const OUTBOX = 'outbox';
const CACHE = 'cache';

export interface QueuedResult {
  clientId: string;
  /** Cuenta que lo reportó: otra sesión en el mismo celular no lo ve ni lo envía. */
  userId: string;
  kind: 'result';
  contestId: string;
  tableId: string;
  tableNumber: number;
  totalVoters: number;
  lines: { lineId: string; votes: number }[];
  /** La foto, si no se subió ya con «Leer la foto». */
  photo: Blob | null;
  reportedAt: string;
  createdAt: string;
  error?: string | null;
}

export interface QueuedIncident {
  clientId: string;
  userId: string;
  kind: 'incident';
  contestId: string;
  incidentKind: IncidentKind;
  tableId: string | null;
  description: string | null;
  photo: Blob | null;
  occurredAt: string;
  createdAt: string;
  error?: string | null;
}

export type QueuedReport = QueuedResult | QueuedIncident;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no guarda datos sin conexión.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: 'clientId' });
      if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = work(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function queueReport(report: QueuedReport): Promise<void> {
  await run(OUTBOX, 'readwrite', (s) => s.put(report));
}

export async function queuedReports(userId: string): Promise<QueuedReport[]> {
  try {
    const all = await run<QueuedReport[]>(OUTBOX, 'readonly', (s) => s.getAll() as IDBRequest<QueuedReport[]>);
    return all.filter((r) => r.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function dropReport(clientId: string): Promise<void> {
  await run(OUTBOX, 'readwrite', (s) => s.delete(clientId));
}

export async function saveAssignments(userId: string, data: MyAssignment[]): Promise<void> {
  try {
    await run(CACHE, 'readwrite', (s) => s.put({ userId, data, savedAt: new Date().toISOString() }, 'me'));
  } catch {
    // Sin almacenamiento: la pantalla funciona igual con señal.
  }
}

export async function savedAssignments(
  userId: string,
): Promise<{ data: MyAssignment[]; savedAt: string } | null> {
  try {
    const saved = await run<{ userId: string; data: MyAssignment[]; savedAt: string } | undefined>(
      CACHE,
      'readonly',
      (s) => s.get('me'),
    );
    // La copia es de una persona: otra sesión en el mismo celular no la ve.
    return saved && saved.userId === userId ? saved : null;
  } catch {
    return null;
  }
}

/** Borra todo lo guardado (al cerrar sesión desde la pantalla del testigo). */
export async function clearWitnessStorage(): Promise<void> {
  await Promise.allSettled([
    run(OUTBOX, 'readwrite', (s) => s.clear()),
    run(CACHE, 'readwrite', (s) => s.clear()),
  ]);
}

/** Un error que no se arregla reintentando (datos inválidos, mesa ajena, jornada cerrada). */
function isPermanent(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) return false;
  const status = error.response.status;
  return status >= 400 && status < 500 && ![401, 403, 408, 425, 429].includes(status);
}

async function send(report: QueuedReport): Promise<void> {
  const form = new FormData();
  form.append('contestId', report.contestId);
  form.append('clientId', report.clientId);
  if (report.kind === 'result') {
    form.append('totalVoters', String(report.totalVoters));
    form.append('lines', JSON.stringify(report.lines));
    form.append('reportedAt', report.reportedAt);
    if (report.photo) form.append('photo', report.photo, 'e14.jpg');
    await api.post(`/election-day/me/tables/${report.tableId}/result`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
  } else {
    form.append('kind', report.incidentKind);
    if (report.tableId) form.append('tableId', report.tableId);
    if (report.description) form.append('description', report.description);
    form.append('occurredAt', report.occurredAt);
    if (report.photo) form.append('photo', report.photo, 'incidente.jpg');
    await api.post('/election-day/me/incidents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: LONG_REQUEST_TIMEOUT_MS,
    });
  }
}

let flushing: Promise<{ sent: number; pending: number }> | null = null;

/**
 * Envía lo pendiente, en orden. Se detiene al primer error de conexión (se
 * reintenta luego); un error definitivo queda marcado en el reporte para que
 * el testigo lo vea y avise a la campaña.
 */
export function flushOutbox(userId: string): Promise<{ sent: number; pending: number }> {
  flushing ??= (async () => {
    let sent = 0;
    const pending = await queuedReports(userId);
    for (const report of pending) {
      if (report.error) continue;
      try {
        await send(report);
        await dropReport(report.clientId);
        sent++;
      } catch (error) {
        if (isPermanent(error)) {
          await queueReport({ ...report, error: apiErrorMessage(error) ?? 'El servidor rechazó el reporte.' });
          continue;
        }
        break;
      }
    }
    const left = (await queuedReports(userId)).length;
    return { sent, pending: left };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Reintenta un reporte que el servidor rechazó (por ejemplo, después de corregirlo). */
export async function retryReport(userId: string, clientId: string): Promise<void> {
  const report = (await queuedReports(userId)).find((r) => r.clientId === clientId);
  if (report) await queueReport({ ...report, error: null });
}
