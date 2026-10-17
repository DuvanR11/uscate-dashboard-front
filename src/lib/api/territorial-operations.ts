import api from '@/lib/api';

export interface OperationsItem {
  code: string; name: string; state: string; revision: number;
  election: { code: string; name: string; electionDate: string };
  corporation: { code: string; name: string };
  territory: { code: string; name: string; level: string };
  sources: Record<string, number>; documentary: Record<string, number>;
  changedDocumentaryCases: number; syntheticExercises: Record<string, number>;
  versions: Record<string, number>; readerImplemented: boolean;
  warnings: { code: string; message: string }[];
}
export interface TerritorialOperations {
  checkedAt: string; cacheSeconds: number; pageSize: number; next: string | null; items: OperationsItem[];
  reports: { workerEnabled: boolean; states: { state: string; count: number; expiredLeases: number; oldestAt: string | null }[] };
  remoteMonitoring: { pilot: string; workerEnabled: boolean; stale: boolean; interrupted: boolean;
    lastCompletedAt: string | null; lastRun: { status: string; requestedAt: string; finishedAt: string | null; leaseExpiresAt: string | null } | null;
    schedule: { enabled: boolean; nextRunAt: string | null; hour: number; minute: number; blockedReason: string | null } | null };
  limitations: string[];
}
const record = (x: unknown): x is Record<string, unknown> => Boolean(x && typeof x === 'object' && !Array.isArray(x));
const counts = (x: unknown) => record(x) && Object.values(x).every(n => Number.isSafeInteger(n) && Number(n) >= 0);
const date = (x: unknown) => typeof x === 'string' && Number.isFinite(Date.parse(x));
const nullableDate = (x: unknown) => x === null || date(x);
export function validateTerritorialOperations(value: unknown): asserts value is TerritorialOperations {
  if (!record(value) || !date(value.checkedAt) || value.cacheSeconds !== 15 || value.pageSize !== 20
    || !(value.next === null || typeof value.next === 'string' && /^[A-Z0-9_:-]{1,100}$/.test(value.next))
    || !Array.isArray(value.items) || value.items.length > 20
    || !record(value.reports) || typeof value.reports.workerEnabled !== 'boolean' || !Array.isArray(value.reports.states)
    || !value.reports.states.every(s => record(s) && ['PENDING','GENERATING','FAILED'].includes(String(s.state))
      && Number.isSafeInteger(s.count) && Number(s.count) >= 0 && Number.isSafeInteger(s.expiredLeases)
      && Number(s.expiredLeases) >= 0 && nullableDate(s.oldestAt))
    || !record(value.remoteMonitoring) || value.remoteMonitoring.pilot !== 'NEIVA_CONCEJO_2023'
    || typeof value.remoteMonitoring.workerEnabled !== 'boolean' || typeof value.remoteMonitoring.stale !== 'boolean' || typeof value.remoteMonitoring.interrupted !== 'boolean'
    || !nullableDate(value.remoteMonitoring.lastCompletedAt)
    || !(value.remoteMonitoring.lastRun === null || record(value.remoteMonitoring.lastRun)
      && typeof value.remoteMonitoring.lastRun.status === 'string' && date(value.remoteMonitoring.lastRun.requestedAt)
      && nullableDate(value.remoteMonitoring.lastRun.finishedAt) && nullableDate(value.remoteMonitoring.lastRun.leaseExpiresAt))
    || !(value.remoteMonitoring.schedule === null || record(value.remoteMonitoring.schedule)
      && typeof value.remoteMonitoring.schedule.enabled === 'boolean' && nullableDate(value.remoteMonitoring.schedule.nextRunAt)
      && Number.isInteger(value.remoteMonitoring.schedule.hour) && Number(value.remoteMonitoring.schedule.hour) >= 0 && Number(value.remoteMonitoring.schedule.hour) <= 23
      && Number.isInteger(value.remoteMonitoring.schedule.minute) && Number(value.remoteMonitoring.schedule.minute) >= 0 && Number(value.remoteMonitoring.schedule.minute) <= 59
      && (value.remoteMonitoring.schedule.blockedReason === null || typeof value.remoteMonitoring.schedule.blockedReason === 'string'))
    || !Array.isArray(value.limitations) || !value.limitations.every(s => typeof s === 'string'))
    throw Error('No pudimos verificar el estado de operación territorial.');
  const seen = new Set<string>();
  for (const item of value.items) {
    if (!record(item) || typeof item.code !== 'string' || !/^[A-Z0-9_:-]{1,100}$/.test(item.code) || seen.has(item.code)
      || typeof item.name !== 'string' || typeof item.state !== 'string' || !Number.isSafeInteger(item.revision)
      || !['election','corporation','territory'].every(k => record(item[k]) && typeof item[k].code === 'string' && typeof item[k].name === 'string')
      || !['sources','documentary','syntheticExercises','versions'].every(k => counts(item[k]))
      || !Number.isSafeInteger(item.changedDocumentaryCases) || Number(item.changedDocumentaryCases) < 0
      || typeof item.readerImplemented !== 'boolean' || !Array.isArray(item.warnings)
      || !item.warnings.every(w => record(w) && typeof w.code === 'string' && typeof w.message === 'string'))
      throw Error('No pudimos verificar los conjuntos territoriales.');
    seen.add(item.code);
  }
  if (value.next !== null && (value.items.length !== 20 || value.items[19].code !== value.next))
    throw Error('No pudimos verificar la paginación territorial.');
}
export async function getTerritorialOperations(afterCode?: string) {
  const { data } = await api.get<unknown>('/platform/territorial-data/operations', { params: afterCode ? { afterCode } : {}, timeout: 25_000 });
  validateTerritorialOperations(data);
  return data;
}
