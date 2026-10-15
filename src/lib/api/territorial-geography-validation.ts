import { apiGet } from '@/lib/api';

export interface GeographyValidation {
  schemaVersion: number; pilot: string; territoryCode: string; reviewDate: string;
  status: string; geographicValidationClosed: boolean; submunicipalPublicationReady: boolean;
  contentHash: string; draftContentHash: string; evidenceContentHash: string;
  summary: { stations: number; tables: number; matchedPdfCandidates: number; unresolvedStationCases: number; pendingRequirements: number; approvedCorrespondences: number };
  checks: { code: string; status: string; detail: string }[];
  cases: { stationKey: string; names: string[]; kind: string; status: string; mmvUnitCodes: string[]; pdfUnitCode: string | null; referenceContainingCodes: string[]; pdfPage: number; documentaryEvidence: { sourceId: string; page: number | null; conclusion: string }[] }[];
  requirements: { code: string; affectedCount: number; affectedKind: string; title: string; requiredEvidence: string; status: string }[];
  evidenceSources: { id: string; title: string; url: string; documentDate: string | null; sha256: string | null; limitations: string }[];
  limitations: string[];
}
export async function getGeographyValidation() {
  const data = await apiGet<GeographyValidation>('/platform/territorial-data/geography/crosswalk/validation');
  if (data?.schemaVersion !== 1 || data.pilot !== 'NEIVA_CONCEJO_2023' || data.territoryCode !== '41001' || data.status !== 'PENDING_EVIDENCE' || data.geographicValidationClosed !== false || data.submunicipalPublicationReady !== false || !/^[a-f0-9]{64}$/.test(data.contentHash ?? '') || data.draftContentHash !== 'd6144f57ecd8990bd20bdcc714d8b7d77e09a48f08de9c7c539c967327918435' || data.summary?.stations !== 52 || !Array.isArray(data.cases) || !Array.isArray(data.requirements) || !Array.isArray(data.checks) || !Array.isArray(data.evidenceSources) || !Array.isArray(data.limitations)) throw new Error('No se pudo verificar el informe geográfico.');
  const { contentHash, ...payload } = data;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  const actualHash = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  if (actualHash !== contentHash) throw new Error('La huella del informe geográfico no coincide.');
  return data;
}
