import api from '@/lib/api';
import { assertTerritorialReaderBinding, territorialReaderRoot } from './territorial-reader';
import type { MunicipalResults } from './territorial-results';

export interface MunicipalMapData {
  version: MunicipalResults['version']; territoryCode: '41001'; granularity: 'MUNICIPAL';
  source: { id: string; publisher: string; referenceYear: number; sourceUrl: string; retrievedAt: string; sourceSha256: string; canonicalSha256: string; coordinateSystem: string; coordinateOrder: string; use: string; electionBoundaryCertified: boolean };
  bbox: number[]; vertexCount: number;
  boundary: { type: 'FeatureCollection'; features: { type: 'Feature'; properties: { MPIO_CDPMP: string; MPIO_NANO: number }; geometry: { type: 'Polygon'; coordinates: number[][][] } }[] };
  availability: { municipality: boolean; submunicipalResults: boolean; electoralHeatmap: boolean; participation: boolean; votersByAge: boolean };
}
export async function getMunicipalMap(datasetCode:string,version: MunicipalResults['version'], signal: AbortSignal) {
  const { data } = await api.get<MunicipalMapData>(territorialReaderRoot(datasetCode)+'/map', { params: { versionId: version.id, contentHash: version.contentHash }, signal });
  assertTerritorialReaderBinding(data,datasetCode);
  validateMunicipalMap(data, version); return data;
}
export function validateMunicipalMap(m: MunicipalMapData, version: MunicipalResults['version']) {
  const f = m?.boundary?.features?.[0], ring = f?.geometry?.coordinates?.[0];
  if (m?.version?.id !== version.id || m.version.number !== version.number || m.version.contentHash !== version.contentHash || m.territoryCode !== '41001' || m.granularity !== 'MUNICIPAL' || m.source?.id !== 'DANE_MGN2024_NEIVA_REFERENCE_V1' || m.source.referenceYear !== 2024 || m.source.coordinateSystem !== 'EPSG:4326' || m.source.coordinateOrder !== 'LONGITUDE_LATITUDE' || m.source.use !== 'MUNICIPAL_REFERENCE_ONLY' || m.source.electionBoundaryCertified !== false || m.source.sourceSha256 !== 'cad5847b5baa095ccb40f695fee82d7825f1c9d0b2669e3f7ec175c388270bc3' || m.source.canonicalSha256 !== 'aa9a8dd20121ac5141c765e932183b2139c6147132048ed51ac1727bd37bd4aa' || m.boundary?.type !== 'FeatureCollection' || m.boundary.features.length !== 1 || f?.type !== 'Feature' || f.properties?.MPIO_CDPMP !== '41001' || f.properties.MPIO_NANO !== 2024 || f.geometry?.type !== 'Polygon' || f.geometry.coordinates.length !== 1 || !Array.isArray(ring) || ring.length !== 10882 || m.vertexCount !== ring.length || !ring.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= -76 && p[0] <= -74 && p[1] >= 2 && p[1] <= 4) || ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1] || m.availability?.municipality !== true || ['submunicipalResults','electoralHeatmap','participation','votersByAge'].some(key => m.availability[key as keyof typeof m.availability] !== false)) throw new Error('INVALID_MUNICIPAL_MAP');
}

/** Spherical Mercator for display only; values are fitted into an SVG, never used as locations or distances. */
export function municipalOutline(coordinates: number[][]) {
  const projected = coordinates.map(([lon, lat]) => [lon * Math.PI / 180, Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))]);
  const xs = projected.map(p => p[0]), ys = projected.map(p => p[1]);
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const scale = Math.min(600 / (xmax - xmin), 400 / (ymax - ymin));
  const xpad = (700 - (xmax - xmin) * scale) / 2, ypad = (500 - (ymax - ymin) * scale) / 2;
  return projected.map(([x, y], i) => `${i ? 'L' : 'M'}${(xpad + (x - xmin) * scale).toFixed(2)},${(ypad + (ymax - y) * scale).toFixed(2)}`).join(' ') + ' Z';
}
