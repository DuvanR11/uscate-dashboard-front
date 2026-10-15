import { apiGet } from '@/lib/api';

export interface TerritorialCrosswalk {
  catalogVersion: string; pilot: string; territoryCode: string; status: string; published: boolean; contentHash: string;
  summary: { csvRecords: number; stations: number; tables: number; units: number; communeCandidates: number; corregimientosWithoutGeometry: number; specialUnits: number; approvedCorrespondences: number; georeferencedStations: number; stationConflicts: number; pdfCandidates: number; outsideDeclaredCommuneReference: number; pdfMissingUnits: number };
  sources: { geometryReferenceYear: number; mmvSha256: string; geometrySha256: string };
  units: { electoralCode: string; electoralLabels: string[]; kind: string; stationCount: number; tableCount: number; approved: boolean; candidate: { geographicCode: string; geographicLabel: string; referenceYear: number } | null }[];
  stations: { key: string; zoneCode: string; stationCode: string; sourceNames: string[]; sourceUnitCodes: string[]; tableCount: number; status: string; coordinates: null; approved: boolean;
    pdfCandidate: { page: number; address: string; latitude: number; longitude: number; latitudeRaw: string; longitudeRaw: string; declaredUnitCode: string | null; approved: boolean; communeReference: string | null; containingCommuneCodes: string[]; correspondenceBasis: string } | null }[];
}
export async function getTerritorialCrosswalk() {
  const data = await apiGet<TerritorialCrosswalk>('/platform/territorial-data/geography/crosswalk');
  if (data?.catalogVersion !== 'NEIVA_2023_CROSSWALK_DRAFT_V2' || data.pilot !== 'NEIVA_CONCEJO_2023' || data.territoryCode !== '41001' || data.status !== 'DRAFT_NOT_APPROVED' || data.published !== false || data.contentHash !== 'd6144f57ecd8990bd20bdcc714d8b7d77e09a48f08de9c7c539c967327918435' || data.sources?.geometryReferenceYear !== 2018 || data.summary?.stations !== 52 || data.summary.tables !== 863 || data.summary.approvedCorrespondences !== 0 || data.summary.georeferencedStations !== 0 || !Array.isArray(data.units) || data.units.length !== 19 || !Array.isArray(data.stations) || data.stations.length !== 52 || data.units.some(u => u.approved) || data.stations.some(s => s.approved || s.coordinates !== null)) throw new Error('No se pudo verificar el inventario de correspondencias.');
  if (data.summary.pdfCandidates !== 52 || data.summary.outsideDeclaredCommuneReference !== 3 || data.stations.some(s => !s.pdfCandidate || s.pdfCandidate.approved || ![298,299,300,301].includes(s.pdfCandidate.page) || !Number.isFinite(s.pdfCandidate.latitude) || !Number.isFinite(s.pdfCandidate.longitude) || s.pdfCandidate.latitude < 2 || s.pdfCandidate.latitude > 4 || s.pdfCandidate.longitude < -76 || s.pdfCandidate.longitude > -74)) throw new Error('No se pudo verificar la referencia de coordenadas del PDF.');
  return data;
}
