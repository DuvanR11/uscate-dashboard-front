import { apiGet } from '@/lib/api';

export interface TerritorialCrosswalk {
  catalogVersion: string; pilot: string; territoryCode: string; status: string; published: boolean; contentHash: string;
  summary: { csvRecords: number; stations: number; tables: number; units: number; communeCandidates: number; corregimientosWithoutGeometry: number; specialUnits: number; approvedCorrespondences: number; georeferencedStations: number; stationConflicts: number };
  sources: { geometryReferenceYear: number; mmvSha256: string; geometrySha256: string };
  units: { electoralCode: string; electoralLabels: string[]; kind: string; stationCount: number; tableCount: number; approved: boolean; candidate: { geographicCode: string; geographicLabel: string; referenceYear: number } | null }[];
  stations: { key: string; zoneCode: string; stationCode: string; sourceNames: string[]; sourceUnitCodes: string[]; tableCount: number; status: string; coordinates: null; approved: boolean }[];
}
export async function getTerritorialCrosswalk() {
  const data = await apiGet<TerritorialCrosswalk>('/platform/territorial-data/geography/crosswalk');
  if (data?.catalogVersion !== 'NEIVA_2023_CROSSWALK_DRAFT_V1' || data.pilot !== 'NEIVA_CONCEJO_2023' || data.territoryCode !== '41001' || data.status !== 'DRAFT_NOT_APPROVED' || data.published !== false || data.contentHash !== 'badd3781c987d06c09e0aa560b1bf4ee556472d3ad1aae4662fd84754569bf4b' || data.sources?.geometryReferenceYear !== 2018 || data.summary?.stations !== 52 || data.summary.tables !== 863 || data.summary.approvedCorrespondences !== 0 || data.summary.georeferencedStations !== 0 || !Array.isArray(data.units) || data.units.length !== 19 || !Array.isArray(data.stations) || data.stations.length !== 52 || data.units.some(u => u.approved) || data.stations.some(s => s.approved || s.coordinates !== null)) throw new Error('No se pudo verificar el inventario de correspondencias.');
  return data;
}
