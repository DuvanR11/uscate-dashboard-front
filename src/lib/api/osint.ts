import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

/**
 * Cliente para `modules/investigation` (backend) — Arquitectura OSINT
 * Investigativo, las 10 fases ya cerradas (ver memoria
 * `osint-plataforma-arquitectura`). Exclusivo de `OSINT_CASOS`/
 * `OSINT_ENTITY_RESOLUTION` (SUPER_ADMIN). A diferencia de `platform.ts`/
 * `monitoring.ts`, cada controlador de este módulo envuelve la respuesta en
 * `{ success, data }` (o `{ success, total, data }` en listados) — por eso
 * cada función acá desenvuelve explícitamente, en vez de tipar `apiGet`
 * directo sobre el payload.
 */

// --- Envoltorios reales del backend (@RequirePermissions OSINT_*) ---
interface Envelope<T> {
  success: boolean;
  data: T;
}
interface ListEnvelope<T> {
  success: boolean;
  total: number;
  data: T[];
}

async function unwrap<T>(promise: Promise<Envelope<T>>): Promise<T> {
  return (await promise).data;
}
async function unwrapList<T>(promise: Promise<ListEnvelope<T>>): Promise<{ data: T[]; total: number }> {
  const res = await promise;
  return { data: res.data, total: res.total };
}

// =========================================================================
// CASOS
// =========================================================================

export type CaseStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';

export interface InvestigationCase {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: CaseStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { subjects: number; evidence: number };
}

export type SubjectType = 'PERSON' | 'COMPANY';

export interface InvestigationSubject {
  id: string;
  caseId: string;
  type: SubjectType;
  displayName: string;
  documentNumber: string | null;
  createdAt: string;
}

export interface InvestigationCaseDetail extends InvestigationCase {
  subjects: InvestigationSubject[];
}

export interface ListCasesResult {
  data: InvestigationCase[];
  total: number;
  page: number;
  pageSize: number;
}

/** `GET /osint/cases` */
export function listCases(options: {
  status?: CaseStatus;
  page?: number;
  pageSize?: number;
}): Promise<ListCasesResult> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  const qs = params.toString();
  return apiGet<{ success: boolean; data: InvestigationCase[]; total: number; page: number; pageSize: number }>(
    `/osint/cases${qs ? `?${qs}` : ''}`,
  ).then((res) => ({ data: res.data, total: res.total, page: res.page, pageSize: res.pageSize }));
}

/** `POST /osint/cases` */
export function createCase(input: { title: string; description?: string }): Promise<InvestigationCase> {
  return unwrap(apiPost<Envelope<InvestigationCase>>('/osint/cases', input));
}

/** `GET /osint/cases/:id` */
export function getCase(id: string): Promise<InvestigationCaseDetail> {
  return unwrap(apiGet<Envelope<InvestigationCaseDetail>>(`/osint/cases/${id}`));
}

/** `PATCH /osint/cases/:id` */
export function updateCase(
  id: string,
  input: { title?: string; description?: string; status?: CaseStatus },
): Promise<InvestigationCase> {
  return unwrap(apiPatch<Envelope<InvestigationCase>>(`/osint/cases/${id}`, input));
}

/** `DELETE /osint/cases/:id` */
export function deleteCase(id: string): Promise<void> {
  return apiDelete(`/osint/cases/${id}`).then(() => undefined);
}

/** `POST /osint/cases/:id/subjects` */
export function addSubject(
  caseId: string,
  input: { type: SubjectType; displayName: string; documentNumber?: string },
): Promise<InvestigationSubject> {
  return unwrap(apiPost<Envelope<InvestigationSubject>>(`/osint/cases/${caseId}/subjects`, input));
}

/** `DELETE /osint/cases/:id/subjects/:subjectId` */
export function removeSubject(caseId: string, subjectId: string): Promise<void> {
  return apiDelete(`/osint/cases/${caseId}/subjects/${subjectId}`).then(() => undefined);
}

// =========================================================================
// EVIDENCIA
// =========================================================================

export type EvidenceType = 'DATASET_RECORD' | 'DOCUMENT' | 'NEWS_ARTICLE' | 'WEB_PAGE' | 'MANUAL_NOTE';

export type Confidence =
  | 'VERIFIED_FACT'
  | 'REPORTED_FACT'
  | 'PROBABLE_MATCH'
  | 'POSSIBLE_MATCH'
  | 'ANALYST_HYPOTHESIS'
  | 'CONTRADICTED';

export interface EvidenceEntityRef {
  id: string;
  canonicalName: string;
  type: string;
}

export interface Evidence {
  id: string;
  caseId: string | null;
  sourceId: string;
  source: { id: string; key: string; name: string; reliabilityLevel: string };
  sourceRecordId: string | null;
  entityId: string | null;
  entity: EvidenceEntityRef | null;
  url: string | null;
  title: string | null;
  excerpt: string | null;
  retrievedAt: string;
  publishedAt: string | null;
  confidence: Confidence;
  evidenceType: EvidenceType;
  rawMetadata: Record<string, unknown> | null;
}

/** Las 9 fuentes reales del catálogo `OsintSource`, seleccionables al registrar evidencia manual. */
export const OSINT_SOURCE_KEYS = [
  { key: 'SECOP', label: 'SECOP II (Contratos)' },
  { key: 'POLICIA', label: 'Policía/MinDefensa (criminalidad agregada)' },
  { key: 'NEWS', label: 'Prensa (Google News)' },
  { key: 'PROCURADURIA', label: 'Procuraduría (SIRI)' },
  { key: 'CONTRALORIA', label: 'Contraloría (Resp. fiscal)' },
  { key: 'SUPERSOCIEDADES', label: 'Supersociedades' },
  { key: 'SIGEP', label: 'SIGEP (PEP)' },
  { key: 'SIC', label: 'SIC (Sanciones)' },
  { key: 'SUPERFINANCIERA', label: 'Superfinanciera' },
] as const;

/** `POST /osint/evidence` */
export function createEvidence(input: {
  sourceKey: string;
  evidenceType: EvidenceType;
  caseId?: string;
  entityId?: string;
  sourceRecordId?: string;
  url?: string;
  title?: string;
  excerpt?: string;
  publishedAt?: string;
  rawMetadata?: Record<string, unknown>;
  confidenceOverride?: 'ANALYST_HYPOTHESIS' | 'CONTRADICTED';
}): Promise<Evidence> {
  return unwrap(apiPost<Envelope<Evidence>>('/osint/evidence', input));
}

/**
 * Plan "Pilar OSINT" (2026-09-02), Fase D — puente real entre el buscador
 * ad-hoc (`/inteligencia/expedientes`) y la Evidencia de un Caso: convierte
 * los registros crudos que una búsqueda ya trajo en Evidence real, sin que
 * el investigador tenga que transcribirlos a mano.
 * `POST /osint/evidence/bulk-from-search`
 */
export function createEvidenceBulkFromSearch(input: {
  caseId: string;
  entityId?: string;
  sourceKey: string;
  records: Record<string, unknown>[];
}): Promise<Evidence[]> {
  return unwrapList(
    apiPost<ListEnvelope<Evidence>>('/osint/evidence/bulk-from-search', input),
  ).then((r) => r.data);
}

/** `GET /osint/evidence?caseId=` */
export function listEvidenceByCase(caseId: string): Promise<Evidence[]> {
  return unwrapList(apiGet<ListEnvelope<Evidence>>(`/osint/evidence?caseId=${caseId}`)).then((r) => r.data);
}

/** `GET /osint/evidence?entityId=` */
export function listEvidenceByEntity(entityId: string): Promise<Evidence[]> {
  return unwrapList(apiGet<ListEnvelope<Evidence>>(`/osint/evidence?entityId=${entityId}`)).then((r) => r.data);
}

// =========================================================================
// INGESTA DE DOCUMENTOS
// =========================================================================

export interface IngestDocumentResult {
  evidence: Evidence;
  document: { id: string; title: string | null };
}

/** `POST /osint/documents/ingest` */
export function ingestDocument(input: {
  url: string;
  caseId?: string;
  entityId?: string;
  title?: string;
}): Promise<IngestDocumentResult> {
  return unwrap(apiPost<Envelope<IngestDocumentResult>>('/osint/documents/ingest', input));
}

// =========================================================================
// ENTIDADES — resolución
// =========================================================================

// Plan "OSINT Profesional" (2026-09-02), Fase 1 — paleta de entidades. 2
// categorías reales, resueltas por caminos distintos en el backend:
//   - IDENTIDAD (`resolveSubject`, probabilístico: documento/nombre/embeddings)
//   - ATRIBUTO (`resolveAttribute`, determinista: dedupe exacto tras normalizar)
// `EntitySubjectType` se mantiene como el nombre histórico del primer grupo
// (lo siguen usando `EntityMatchCandidate.subjectType`/`resolveSubject`, que
// SOLO aplican a sujetos de identidad — un atributo nunca genera un
// candidato de coincidencia, no hay ambigüedad que revisar).
export type EntitySubjectType = 'PERSON' | 'COMPANY' | 'PUBLIC_ENTITY';
export type EntityAttributeType =
  | 'DOMAIN'
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'VEHICLE'
  | 'BANK_ACCOUNT'
  | 'SOCIAL_PROFILE'
  | 'ALIAS';
export type EntityType = EntitySubjectType | EntityAttributeType;

export const ENTITY_IDENTITY_TYPES: { value: EntitySubjectType; label: string }[] = [
  { value: 'PERSON', label: 'Persona' },
  { value: 'COMPANY', label: 'Empresa' },
  { value: 'PUBLIC_ENTITY', label: 'Entidad pública' },
];

export const ENTITY_ATTRIBUTE_TYPES: { value: EntityAttributeType; label: string }[] = [
  { value: 'DOMAIN', label: 'Dominio' },
  { value: 'EMAIL', label: 'Correo electrónico' },
  { value: 'PHONE', label: 'Teléfono' },
  { value: 'ADDRESS', label: 'Dirección' },
  { value: 'VEHICLE', label: 'Vehículo' },
  { value: 'BANK_ACCOUNT', label: 'Cuenta bancaria' },
  { value: 'SOCIAL_PROFILE', label: 'Perfil social' },
  { value: 'ALIAS', label: 'Alias' },
];

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = Object.fromEntries(
  [...ENTITY_IDENTITY_TYPES, ...ENTITY_ATTRIBUTE_TYPES].map((t) => [t.value, t.label]),
) as Record<EntityType, string>;

export function isEntityAttributeType(type: string): type is EntityAttributeType {
  return ENTITY_ATTRIBUTE_TYPES.some((t) => t.value === type);
}

// Plan "Pilar OSINT", Fase C2 (cerrada 2026-09-02, decisión de producto
// confirmada con el usuario: botón explícito "Enriquecer", no automático) —
// mismo set que `EXPANDABLE_ENTITY_TYPES` en `entity-expansion.service.ts`
// del backend: solo las entidades con un NOMBRE tiene sentido buscarlo en
// las fuentes reales (un email/teléfono/dirección no).
export const EXPANDABLE_ENTITY_TYPES: EntityType[] = ['PERSON', 'COMPANY', 'PUBLIC_ENTITY', 'DOMAIN'];

export function isExpandableEntityType(type: EntityType): boolean {
  return EXPANDABLE_ENTITY_TYPES.includes(type);
}

export interface Entity {
  id: string;
  organizationId: string;
  type: EntityType;
  canonicalName: string;
  documentNumber: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type EntityMatchStatus = 'CONFIRMED' | 'PROBABLE' | 'POSSIBLE' | 'REJECTED' | 'PENDING';
export type MatchMethod = 'DOCUMENT_NUMBER' | 'NAME_AND_CONTEXT' | 'NAME_ONLY' | 'EMBEDDING_SIMILARITY';

export interface EntityMatchCandidate {
  id: string;
  entityId: string;
  entity: Entity;
  subjectType: EntitySubjectType;
  subjectName: string;
  subjectDocumentNumber: string | null;
  subjectContext: Record<string, unknown> | null;
  matchScore: number;
  matchReason: string;
  matchingAttributes: Record<string, unknown>;
  conflictingAttributes: Record<string, unknown> | null;
  status: EntityMatchStatus;
  matchMethod: MatchMethod;
  createdAt: string;
}

export interface ResolveSubjectResult {
  created: boolean;
  entity: Entity;
  candidates: EntityMatchCandidate[];
}

/**
 * Plan "OSINT Profesional" (2026-09-02), Fase 6 — buscador libre de
 * entidades ya resueltas: nunca pasa por el motor de identidad
 * (`resolveSubject`), solo lista lo que ya existe. `GET /osint/entities?q=`
 */
export function searchEntities(
  q: string,
  options: { type?: EntityType; limit?: number } = {},
): Promise<Entity[]> {
  const params = new URLSearchParams({ q });
  if (options.type) params.set('type', options.type);
  if (options.limit) params.set('limit', String(options.limit));
  return unwrapList(
    apiGet<ListEnvelope<Entity>>(`/osint/entities?${params.toString()}`),
  ).then((r) => r.data);
}

/** `POST /osint/entities/resolve` */
export function resolveSubject(input: {
  type: EntitySubjectType;
  name: string;
  documentNumber?: string;
  context?: Record<string, unknown>;
}): Promise<ResolveSubjectResult> {
  return apiPost<ResolveSubjectResult & { success: boolean }>('/osint/entities/resolve', input).then((res) => ({
    created: res.created,
    entity: res.entity,
    candidates: res.candidates,
  }));
}

export interface ResolveAttributeResult {
  created: boolean;
  entity: Entity;
}

/**
 * Plan "OSINT Profesional" (2026-09-02), Fase 1. `POST /osint/entities/attributes`
 * — resolución determinista de una entidad de ATRIBUTO (dominio, email,
 * teléfono, dirección, vehículo, cuenta bancaria, perfil social, alias).
 * A diferencia de `resolveSubject`, nunca devuelve `candidates` — no hay
 * ambigüedad que un analista deba revisar.
 */
export function resolveAttribute(input: {
  type: EntityAttributeType;
  value: string;
  context?: Record<string, unknown>;
}): Promise<ResolveAttributeResult> {
  return apiPost<ResolveAttributeResult & { success: boolean }>('/osint/entities/attributes', input).then(
    (res) => ({ created: res.created, entity: res.entity }),
  );
}

/** `GET /osint/entities/candidates?status=` */
export function listMatchCandidates(status?: EntityMatchStatus): Promise<EntityMatchCandidate[]> {
  return unwrapList(
    apiGet<ListEnvelope<EntityMatchCandidate>>(`/osint/entities/candidates${status ? `?status=${status}` : ''}`),
  ).then((r) => r.data);
}

/** `PATCH /osint/entities/candidates/:id/review` */
export function reviewMatchCandidate(
  id: string,
  decision: 'APPROVE' | 'REJECT',
): Promise<EntityMatchCandidate> {
  return unwrap(apiPatch<Envelope<EntityMatchCandidate>>(`/osint/entities/candidates/${id}/review`, { decision }));
}

export interface MatchMetric {
  CONFIRMED: number;
  REJECTED: number;
  PROBABLE: number;
  POSSIBLE: number;
  PENDING: number;
  approvalRate: number | null;
}

/** `GET /osint/entities/match-metrics` */
export function getMatchMetrics(): Promise<Record<MatchMethod, MatchMetric>> {
  return unwrap(apiGet<Envelope<Record<MatchMethod, MatchMetric>>>('/osint/entities/match-metrics'));
}

// =========================================================================
// RELACIONES
// =========================================================================

export type RelationshipType =
  | 'REPRESENTATIVE_OF'
  | 'EMPLOYEE_OF'
  | 'CONTRACTOR_OF'
  | 'DONOR_TO_CAMPAIGN'
  | 'SANCTIONED_BY'
  | 'FAMILY_MEMBER_OF'
  | 'ASSOCIATE_OF'
  | 'MEMBER_OF'
  // Plan "OSINT Profesional" (2026-09-02), Fase 1 — vínculos de propiedad e
  // infraestructura compartida, con sentido real ahora que existen
  // entidades de atributo (DOMAIN/EMAIL/PHONE/ADDRESS/...).
  | 'OWNS'
  | 'BENEFICIAL_OWNER_OF'
  | 'SHARES_ADDRESS_WITH'
  | 'SHARES_PHONE_WITH'
  | 'SHARES_DOMAIN_WITH';

export const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'REPRESENTATIVE_OF', label: 'Representante legal de' },
  { value: 'EMPLOYEE_OF', label: 'Empleado de' },
  { value: 'CONTRACTOR_OF', label: 'Contratista de' },
  { value: 'DONOR_TO_CAMPAIGN', label: 'Donante de campaña de' },
  { value: 'SANCTIONED_BY', label: 'Sancionado por' },
  { value: 'FAMILY_MEMBER_OF', label: 'Familiar de' },
  { value: 'ASSOCIATE_OF', label: 'Asociado de' },
  { value: 'MEMBER_OF', label: 'Miembro de' },
  { value: 'OWNS', label: 'Es dueño de' },
  { value: 'BENEFICIAL_OWNER_OF', label: 'Beneficiario real de' },
  { value: 'SHARES_ADDRESS_WITH', label: 'Comparte dirección con' },
  { value: 'SHARES_PHONE_WITH', label: 'Comparte teléfono con' },
  { value: 'SHARES_DOMAIN_WITH', label: 'Comparte dominio con' },
];

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  sourceEntity: Entity;
  targetEntityId: string;
  targetEntity: Entity;
  relationshipType: RelationshipType;
  confidence: Confidence;
  startDate: string | null;
  endDate: string | null;
  evidenceId: string;
  evidence?: Evidence;
  createdAt: string;
}

/** `POST /osint/relationships` */
export function createRelationship(input: {
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: RelationshipType;
  evidenceId: string;
  entityMatchCandidateId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<EntityRelationship> {
  return unwrap(apiPost<Envelope<EntityRelationship>>('/osint/relationships', input));
}

/** `GET /osint/relationships?entityId=` */
export function listRelationshipsForEntity(entityId: string): Promise<EntityRelationship[]> {
  return unwrapList(apiGet<ListEnvelope<EntityRelationship>>(`/osint/relationships?entityId=${entityId}`)).then(
    (r) => r.data,
  );
}

// =========================================================================
// GRAFO
// =========================================================================

export interface GraphFilters {
  minConfidence?: Confidence;
  relationshipTypes?: RelationshipType[];
}

// Plan "OSINT Profesional" (2026-09-02), Fase 5 — "riesgo por entidad,
// visible en el propio nodo del grafo": score+level en lote (barato,
// nunca N+1) para pintar cada nodo; los `factors` completos se piden
// aparte vía `getEntityRisk()`, solo para el nodo seleccionado.
export interface EntityRiskSummary {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface EntityRiskFactor {
  source: string;
  category: string;
  message: string;
  score: number;
  evidence?: Record<string, unknown>;
}

export interface EntityRiskResult {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: EntityRiskFactor[];
  summary: string;
}

export interface NeighborhoodResult {
  nodes: Entity[];
  edges: EntityRelationship[];
  truncated: boolean;
  risks: Record<string, EntityRiskSummary>;
}

export interface PathResult {
  found: boolean;
  nodes: Entity[];
  edges: EntityRelationship[];
  risks: Record<string, EntityRiskSummary>;
}

function filtersToQuery(filters?: GraphFilters): string {
  const params = new URLSearchParams();
  if (filters?.minConfidence) params.set('minConfidence', filters.minConfidence);
  if (filters?.relationshipTypes?.length) params.set('relationshipTypes', filters.relationshipTypes.join(','));
  return params.toString();
}

/** `GET /osint/entities/:id/graph` */
export function getEntityNeighborhood(
  entityId: string,
  options: { depth?: number; filters?: GraphFilters } = {},
): Promise<NeighborhoodResult> {
  const params = new URLSearchParams(filtersToQuery(options.filters));
  if (options.depth) params.set('depth', String(options.depth));
  const qs = params.toString();
  return unwrap(apiGet<Envelope<NeighborhoodResult>>(`/osint/entities/${entityId}/graph${qs ? `?${qs}` : ''}`));
}

/** `GET /osint/entities/path?from=&to=` */
export function findEntityPath(
  from: string,
  to: string,
  options: { maxDepth?: number; filters?: GraphFilters } = {},
): Promise<PathResult> {
  const params = new URLSearchParams(filtersToQuery(options.filters));
  params.set('from', from);
  params.set('to', to);
  if (options.maxDepth) params.set('maxDepth', String(options.maxDepth));
  return unwrap(apiGet<Envelope<PathResult>>(`/osint/entities/path?${params.toString()}`));
}

/** `GET /osint/entities/:id/risk` — deep-dive con los factores completos. */
export function getEntityRisk(entityId: string): Promise<EntityRiskResult> {
  return unwrap(apiGet<Envelope<EntityRiskResult>>(`/osint/entities/${entityId}/risk`));
}

// =========================================================================
// AMPLIAR ENTIDAD ("transform por nodo") + CANDIDATOS DE RELACIÓN
// =========================================================================

/** Las 10 fuentes reales del Source Registry, seleccionables al "ampliar" una entidad. */
export const EXPANSION_SOURCE_KEYS = [
  { key: 'SECOP', label: 'SECOP II (Contratos)' },
  { key: 'POLICIA', label: 'Policía/MinDefensa (criminalidad agregada)' },
  { key: 'NEWS', label: 'Prensa (Google News)' },
  { key: 'PROCURADURIA', label: 'Procuraduría (SIRI)' },
  { key: 'CONTRALORIA', label: 'Contraloría (Resp. fiscal)' },
  { key: 'SUPERSOCIEDADES', label: 'Supersociedades' },
  { key: 'SIGEP', label: 'SIGEP (PEP)' },
  { key: 'SIC', label: 'SIC (Sanciones)' },
  { key: 'SUPERFINANCIERA', label: 'Superfinanciera' },
  { key: 'WEB_SEARCH', label: 'Búsqueda web' },
  { key: 'WHOIS', label: 'WHOIS/DNS' },
  { key: 'INTL_SANCTIONS', label: 'Sanciones internacionales (OFAC/ONU/UE)' },
] as const;

export interface ExpandEntityResult {
  evidenceCreated: Evidence[];
  relationshipCandidatesCreated: RelationshipCandidate[];
  sourceErrors: Record<string, string>;
}

/**
 * Plan "OSINT Profesional" (2026-09-02), Fase 2. `POST /osint/entities/:id/expand`
 * — corre las fuentes elegidas usando el nombre puntual de esta Entity (no
 * texto libre), adjunta cada registro como Evidencia real del caso, y
 * propone (nunca confirma) vínculos cuando un registro nombra
 * estructuralmente una segunda parte.
 */
export function expandEntity(
  entityId: string,
  input: { caseId: string; sourceKeys?: string[] },
): Promise<ExpandEntityResult> {
  return unwrap(
    apiPost<Envelope<ExpandEntityResult>>(`/osint/entities/${entityId}/expand`, input),
  );
}

export type RelationshipCandidateStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RelationshipCandidate {
  id: string;
  caseId: string | null;
  sourceEntityId: string;
  sourceEntity: Entity;
  targetEntityId: string;
  targetEntity: Entity;
  relationshipType: RelationshipType;
  evidenceId: string;
  evidence?: Evidence;
  sourceKey: string;
  reason: string;
  status: RelationshipCandidateStatus;
  createdAt: string;
}

/** `GET /osint/relationship-candidates?status=&caseId=` */
export function listRelationshipCandidates(options: {
  status?: RelationshipCandidateStatus;
  caseId?: string;
} = {}): Promise<RelationshipCandidate[]> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.caseId) params.set('caseId', options.caseId);
  const qs = params.toString();
  return unwrapList(
    apiGet<ListEnvelope<RelationshipCandidate>>(`/osint/relationship-candidates${qs ? `?${qs}` : ''}`),
  ).then((r) => r.data);
}

/** `PATCH /osint/relationship-candidates/:id/review` */
export function reviewRelationshipCandidate(
  id: string,
  decision: 'APPROVE' | 'REJECT',
): Promise<RelationshipCandidate> {
  return unwrap(
    apiPatch<Envelope<RelationshipCandidate>>(`/osint/relationship-candidates/${id}/review`, { decision }),
  );
}

export interface RelatedCase {
  id: string;
  title: string;
  status: string;
  evidenceCount: number;
}

/** Plan "Pilar OSINT" (2026-09-02), Fase C. `GET /osint/entities/:id/cases` */
export function getRelatedCases(entityId: string): Promise<RelatedCase[]> {
  return unwrap(apiGet<Envelope<RelatedCase[]>>(`/osint/entities/${entityId}/cases`));
}

// =========================================================================
// LÍNEA DE TIEMPO DEL CASO
// =========================================================================

export interface TimelineEvent {
  id: string;
  type: string;
  source: string;
  title: string;
  description?: string;
  date: string;
  timestamp: number;
  risk?: number;
  relatedNodeId?: string;
  properties?: Record<string, unknown>;
}

export interface CaseTimeline {
  total: number;
  events: TimelineEvent[];
  groupedByYear: Record<string, TimelineEvent[]>;
  groupedByMonth: Record<string, TimelineEvent[]>;
}

/**
 * Plan "OSINT Profesional" (2026-09-02), Fase 4 — línea de tiempo real de
 * la Evidencia ya persistida de un Caso (antes `TimelineBuilderService`
 * solo existía para una búsqueda ad-hoc). `GET /osint/cases/:id/timeline`
 */
export function getCaseTimeline(caseId: string): Promise<CaseTimeline> {
  return unwrap(apiGet<Envelope<CaseTimeline>>(`/osint/cases/${caseId}/timeline`));
}

// =========================================================================
// INDICADORES
// =========================================================================

export type IndicatorSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Indicator {
  id: string;
  caseId: string;
  entityId: string | null;
  code: string;
  description: string;
  severity: IndicatorSeverity;
  confidence: Confidence;
  evidenceIds: string[];
  createdAt: string;
}

/** `GET /osint/cases/:caseId/indicators` */
export function listIndicators(caseId: string): Promise<Indicator[]> {
  return unwrapList(apiGet<ListEnvelope<Indicator>>(`/osint/cases/${caseId}/indicators`)).then((r) => r.data);
}

/** `POST /osint/cases/:caseId/indicators/recompute` */
export function recomputeIndicators(caseId: string): Promise<Indicator[]> {
  return unwrapList(apiPost<ListEnvelope<Indicator>>(`/osint/cases/${caseId}/indicators/recompute`)).then(
    (r) => r.data,
  );
}

// =========================================================================
// MONITORES DE CASO
// =========================================================================

export interface CaseMonitor {
  id: string;
  caseId: string;
  query: string;
  isActive: boolean;
  frequencyMinutes: number;
  lastCheckedAt: string | null;
  lastSnapshot: Record<string, number> | null;
  consecutiveFailures: number;
  createdAt: string;
}

export interface CaseMonitorAlert {
  id: string;
  monitorId: string;
  message: string;
  details: { deltas: { source: string; previous: number; current: number }[] };
  readAt: string | null;
  createdAt: string;
}

/** `POST /osint/cases/:caseId/monitors` */
export function createMonitor(
  caseId: string,
  input: { query: string; frequencyMinutes?: number },
): Promise<CaseMonitor> {
  return unwrap(apiPost<Envelope<CaseMonitor>>(`/osint/cases/${caseId}/monitors`, input));
}

/** `GET /osint/cases/:caseId/monitors` */
export function listMonitors(caseId: string): Promise<CaseMonitor[]> {
  return unwrapList(apiGet<ListEnvelope<CaseMonitor>>(`/osint/cases/${caseId}/monitors`)).then((r) => r.data);
}

/** `PATCH /osint/cases/:caseId/monitors/:id/pause` */
export function pauseMonitor(caseId: string, id: string): Promise<CaseMonitor> {
  return unwrap(apiPatch<Envelope<CaseMonitor>>(`/osint/cases/${caseId}/monitors/${id}/pause`));
}

/** `PATCH /osint/cases/:caseId/monitors/:id/resume` */
export function resumeMonitor(caseId: string, id: string): Promise<CaseMonitor> {
  return unwrap(apiPatch<Envelope<CaseMonitor>>(`/osint/cases/${caseId}/monitors/${id}/resume`));
}

/** `DELETE /osint/cases/:caseId/monitors/:id` */
export function deleteMonitor(caseId: string, id: string): Promise<void> {
  return apiDelete(`/osint/cases/${caseId}/monitors/${id}`).then(() => undefined);
}

/** `GET /osint/cases/:caseId/alerts?unread=` */
export function listAlerts(caseId: string, onlyUnread?: boolean): Promise<CaseMonitorAlert[]> {
  return unwrapList(
    apiGet<ListEnvelope<CaseMonitorAlert>>(`/osint/cases/${caseId}/alerts${onlyUnread ? '?unread=true' : ''}`),
  ).then((r) => r.data);
}

/** `PATCH /osint/cases/:caseId/alerts/:alertId/read` */
export function markAlertRead(caseId: string, alertId: string): Promise<CaseMonitorAlert> {
  return unwrap(apiPatch<Envelope<CaseMonitorAlert>>(`/osint/cases/${caseId}/alerts/${alertId}/read`));
}

// =========================================================================
// CATÁLOGO DE FUENTES (solo lectura — la edición vive en `lib/api/platform.ts`)
// =========================================================================

export interface OsintSourceReadOnly {
  id: string;
  key: string;
  name: string;
  description: string | null;
  accessType: string;
  isActive: boolean;
  official: boolean;
  reliabilityLevel: string;
  lastVerifiedAt: string | null;
}

/** `GET /osint/sources` — catálogo global, filtra inactivas por defecto. */
export function listOsintSources(includeInactive?: boolean): Promise<OsintSourceReadOnly[]> {
  return unwrapList(
    apiGet<ListEnvelope<OsintSourceReadOnly>>(`/osint/sources${includeInactive ? '?includeInactive=true' : ''}`),
  ).then((r) => r.data);
}

// =========================================================================
// FEED DE AUDITORÍA (por-organización)
// =========================================================================

export interface OsintAuditLogEntry {
  id: string;
  organizationId: string;
  userId: string;
  user: { id: string; fullName: string; email: string };
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListAuditLogResult {
  data: OsintAuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** `GET /osint/audit-logs` */
export function listAuditLogs(options: {
  action?: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ListAuditLogResult> {
  const params = new URLSearchParams();
  if (options.action) params.set('action', options.action);
  if (options.entityType) params.set('entityType', options.entityType);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  const qs = params.toString();
  return apiGet<{ success: boolean; data: OsintAuditLogEntry[]; total: number; page: number; pageSize: number }>(
    `/osint/audit-logs${qs ? `?${qs}` : ''}`,
  ).then((res) => ({ data: res.data, total: res.total, page: res.page, pageSize: res.pageSize }));
}

// =========================================================================
// ERRORES
// =========================================================================

export function extractErrorMessage(error: unknown): string | undefined {
  const response = (error as { response?: { data?: { message?: string | string[] } } })?.response;
  const message = response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message;
}
