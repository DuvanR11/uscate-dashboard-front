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
    groups: { documentCode: string; mmvCode: string; votes: number; name?: string; nameEvidence?: { e26Page: number; e24Page: number; e24LabelComplete: boolean } }[];
    groupNameCatalog?: { version: string; contentHash: string; reviewedOn: string; nameSource: string; scope: string; mmvCsvSha256: string; e26Sha256: string; e24Sha256: string; e26SummaryPage: number };
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
    !['NEIVA_E26_MUNICIPAL_V1', 'NEIVA_E26_MUNICIPAL_NAMES_V2'].includes(d.methodologyVersion) || d.electionDate !== '2023-10-29' ||
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
  if (d.methodologyVersion === 'NEIVA_E26_MUNICIPAL_NAMES_V2') {
    const catalog = d.groupNameCatalog;
    if (!catalog || catalog.version !== 'NEIVA_CONCEJO_2023_GROUP_NAMES_V1' ||
      catalog.contentHash !== '3a9cd1c65916a11cc24bbb0fa7f097a5470077ddd8ac0ca78ed2270057e95fad' ||
      catalog.nameSource !== 'MMV_NOMBRE_PARTIDO_PRESERVED_VERBATIM' || catalog.scope !== 'ELECTORAL_LIST_LABELS_FOR_THIS_ELECTION_ONLY' ||
      catalog.e26SummaryPage !== 11 || !/^\d{4}-\d{2}-\d{2}$/.test(catalog.reviewedOn) ||
      ![catalog.mmvCsvSha256, catalog.e26Sha256, catalog.e24Sha256].every(hash => /^[a-f0-9]{64}$/.test(hash)) ||
      d.groups.length !== 17 || d.limits.includes('GROUP_NAMES_NOT_VALIDATED') ||
      !d.groups.every(g => typeof g.name === 'string' && g.name.trim() === g.name && g.name.length > 0 && g.name.length <= 200 && !/[\r\n]/.test(g.name) &&
        g.nameEvidence?.e26Page === 11 && Number.isInteger(g.nameEvidence.e24Page) && g.nameEvidence.e24Page >= 1 && g.nameEvidence.e24Page <= 12 && typeof g.nameEvidence.e24LabelComplete === 'boolean')) {
      throw new Error('Los nombres no corresponden al catálogo revisado de esta elección.');
    }
  } else if (d.groupNameCatalog || d.groups.some(g => g.name !== undefined || g.nameEvidence !== undefined)) {
    throw new Error('La versión original no contiene un catálogo de nombres.');
  }
}

export function filterMunicipalGroups(groups: MunicipalResults['data']['groups'], query: string) {
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-CO');
  const needle = normalize(query.trim());
  return groups.filter(g => normalize(`${g.documentCode} ${g.mmvCode} ${g.name ?? ''}`).includes(needle));
}

export function votePercentage(votes: number, denominator: number): number | null {
  return denominator > 0 ? votes * 100 / denominator : null;
}
