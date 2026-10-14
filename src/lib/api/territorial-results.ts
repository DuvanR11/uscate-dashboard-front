import api from '@/lib/api';
import type { TerritorialContext } from './territorial-data';

export interface MunicipalResults {
  version: { id: string; number: number; publishedAt: string; contentHash: string };
  data: {
    pilot: string; methodologyVersion: string; electionDate: string; corporation: string;
    territoryCode: string; municipality: string; department: string; granularity: string; geographyRevision: number;
    totals: { GROUP: number; BLANK: number; NULL: number; UNMARKED: number; VALID: number };
    categoryTotal: number;
    groupPercentageDenominator: { category: string; votes: number };
    groups: { documentCode: string; mmvCode: string; votes: number }[];
    coverage: { observedTables: number; expectedTables: number };
    sources: {
      actas: { provenance: string; declaredPortal: string; cryptographicSignatureVerified: boolean; e26Reference: string; statedScrutinyCompletion: string; e24Reference: string; e24GenerationTime: string };
      mmv: { url: string; resultType: string; cutoff: string | null };
    };
    participation: null; votersByAge: null; limits: string[];
  };
}

export async function getOrganizationTerritorialContext(signal: AbortSignal) {
  return (await api.get<TerritorialContext>('/organization/territorial-data/context', { signal })).data;
}
export async function getOrganizationMunicipalResults(signal: AbortSignal) {
  return (await api.get<MunicipalResults>('/organization/territorial-data/results', { signal })).data;
}

/** Do not render a partial response or use a different geographic/percentage basis. */
export function validateMunicipalResults(result: MunicipalResults, context: TerritorialContext) {
  const d = result?.data, v = result?.version;
  const integer = (n: number) => Number.isSafeInteger(n) && n >= 0;
  if (!context.resultsAvailable || !context.eligibleTerritory ||
    !d || !v || d.pilot !== 'NEIVA_CONCEJO_2023' || d.granularity !== 'MUNICIPAL' ||
    d.territoryCode !== '41001' || d.corporation !== 'CONCEJO' ||
    d.methodologyVersion !== 'NEIVA_E26_MUNICIPAL_V1' || d.electionDate !== '2023-10-29' ||
    d.territoryCode !== context.geography?.divipolaMunicipalityCode ||
    d.geographyRevision !== context.geography.revision || v.id !== context.publication?.id ||
    v.number !== context.publication.number || !Number.isFinite(Date.parse(v.publishedAt)) ||
    !/^[a-f0-9]{64}$/.test(v.contentHash) ||
    d.groupPercentageDenominator?.category !== 'VALID_INCLUDING_BLANK' ||
    !d.totals || !Object.values(d.totals).every(integer) ||
    d.groupPercentageDenominator.votes !== d.totals.VALID ||
    d.totals.VALID !== d.totals.GROUP + d.totals.BLANK ||
    d.categoryTotal !== d.totals.VALID + d.totals.NULL + d.totals.UNMARKED ||
    !Array.isArray(d.groups) || !d.groups.length ||
    !d.groups.every(g => typeof g.documentCode === 'string' && /^\d+$/.test(g.documentCode) && typeof g.mmvCode === 'string' && /^\d+$/.test(g.mmvCode) && integer(g.votes)) ||
    new Set(d.groups.map(g => g.mmvCode)).size !== d.groups.length ||
    d.groups.reduce((sum, g) => sum + g.votes, 0) !== d.totals.GROUP ||
    !d.coverage || !integer(d.coverage.observedTables) || !integer(d.coverage.expectedTables) ||
    d.coverage.observedTables > d.coverage.expectedTables ||
    d.participation !== null || d.votersByAge !== null || !Array.isArray(d.limits) || !d.limits.every(l => typeof l === 'string') ||
    !d.sources?.actas || !d.sources.mmv ||
    ![d.municipality, d.department, d.sources.actas.e26Reference, d.sources.actas.e24Reference, d.sources.actas.declaredPortal, d.sources.mmv.url].every(value => typeof value === 'string') ||
    !Number.isFinite(Date.parse(d.sources.actas.statedScrutinyCompletion)) || !Number.isFinite(Date.parse(d.sources.actas.e24GenerationTime)) ||
    d.sources.actas.provenance !== 'USER_PROVIDED_PDFS_AFTER_OFFICIAL_PORTAL_LINK' || d.sources.actas.cryptographicSignatureVerified !== false ||
    d.sources.mmv.resultType !== 'UNVERIFIED' || d.sources.mmv.cutoff !== null) {
    throw new Error('La respuesta no corresponde a una versión municipal completa y vigente. Actualiza la consulta.');
  }
}

export function votePercentage(votes: number, denominator: number): number | null {
  return denominator > 0 ? votes * 100 / denominator : null;
}
