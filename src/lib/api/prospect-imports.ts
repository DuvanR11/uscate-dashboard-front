import api from '@/lib/api';

// Fase 1 "Importar contactos" (2026-10-06) — cliente de `/prospect-imports`.

export const IMPORT_FIELDS = [
  'firstName',
  'lastName',
  'fullName',
  'documentNumber',
  'phone',
  'email',
  'address',
  'birthDate',
  'municipality',
  'zone',
  'votingStation',
  'votingTable',
  'notes',
  'consent',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ImportMapping = Partial<Record<ImportField, number>>;

export const IMPORT_FIELD_LABEL: Record<ImportField, string> = {
  firstName: 'Nombres',
  lastName: 'Apellidos',
  fullName: 'Nombre completo',
  documentNumber: 'Cédula',
  phone: 'Celular',
  email: 'Correo',
  address: 'Dirección o barrio',
  birthDate: 'Fecha de nacimiento',
  municipality: 'Municipio',
  zone: 'Zona (comuna, barrio, vereda)',
  votingStation: 'Puesto de votación',
  votingTable: 'Mesa',
  notes: 'Notas',
  consent: 'Autorización de datos',
};

export type ImportConsentMode = 'NONE' | 'ALL' | 'COLUMN';

export interface ImportPreview {
  fileName: string;
  totalRows: number;
  headers: string[];
  sample: string[][];
  suggestedMapping: ImportMapping;
  quota: { used: number; limit: number | null; remaining: number | null } | null;
}

export type ImportIssueKind =
  | 'REJECTED'
  | 'DUPLICATE_FILE'
  | 'DUPLICATE_EXISTING'
  | 'OVER_QUOTA';

export interface ImportIssue {
  row: number;
  kind: ImportIssueKind;
  reason: string;
  name: string;
}

export interface ImportResult {
  dryRun: boolean;
  importId: string | null;
  created: number;
  fileName: string;
  totalRows: number;
  toCreate: number;
  withConsent: number;
  withoutConsent: number;
  duplicatesInFile: number;
  duplicatesExisting: number;
  rejected: number;
  overQuota: number;
  unknownMunicipalities: number;
  /** Fase 3: zonas de la columna "Zona" que no existían y se crean con la importación. */
  newZones: string[];
  /** Zonas que no se crearon por superar el máximo por importación. */
  zonesNotCreated: number;
  /** Contactos cuyo puesto coincide con el catálogo de puestos de votación. */
  linkedToPollingStation: number;
  issues: ImportIssue[];
  issuesTruncated: boolean;
}

export interface ImportOptions {
  mapping: ImportMapping;
  consentMode: ImportConsentMode;
  consentSource?: string;
  channelId?: number;
  segmentId?: number;
  tagId?: number;
  leaderId?: string;
  dryRun?: boolean;
}

export async function previewProspectImport(file: File): Promise<ImportPreview> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ImportPreview>('/prospect-imports/preview', form);
  return data;
}

export async function runProspectImport(
  file: File,
  options: ImportOptions,
): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('mapping', JSON.stringify(options.mapping));
  form.append('consentMode', options.consentMode);
  if (options.consentSource) form.append('consentSource', options.consentSource);
  if (options.channelId) form.append('channelId', String(options.channelId));
  if (options.segmentId) form.append('segmentId', String(options.segmentId));
  if (options.tagId) form.append('tagId', String(options.tagId));
  if (options.leaderId) form.append('leaderId', options.leaderId);
  if (options.dryRun) form.append('dryRun', 'true');
  const { data } = await api.post<ImportResult>('/prospect-imports', form);
  return data;
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

/** Descarga un CSV que Excel en español abre bien (punto y coma + BOM). */
export function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const text = rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([String.fromCharCode(0xfeff) + text], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadImportTemplate() {
  downloadCsv('plantilla-contactos.csv', [
    ['Nombres', 'Apellidos', 'Cédula', 'Celular', 'Correo', 'Barrio', 'Comuna', 'Puesto de votación', 'Mesa', 'Autoriza datos'],
    ['Ana María', 'Gómez Ruiz', '1023456789', '3001234567', 'ana@correo.com', 'Las Granjas', 'Comuna 6', 'I.E. Santa Librada', '12', 'Sí'],
  ]);
}

const ISSUE_KIND_LABEL: Record<ImportIssueKind, string> = {
  REJECTED: 'Rechazada',
  DUPLICATE_FILE: 'Duplicada en el archivo',
  DUPLICATE_EXISTING: 'Ya existe',
  OVER_QUOTA: 'Sin cupo en el plan',
};

export function downloadImportIssues(result: ImportResult) {
  downloadCsv('filas-que-no-entraron.csv', [
    ['Fila del archivo', 'Nombre', 'Tipo', 'Motivo'],
    ...result.issues.map((issue) => [
      issue.row,
      issue.name,
      ISSUE_KIND_LABEL[issue.kind],
      issue.reason,
    ]),
  ]);
}
