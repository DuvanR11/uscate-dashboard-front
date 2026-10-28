// Nombres para mostrar del feed de auditoría OSINT (`GET /osint/audit-logs`).
//
// Fase 4 del análisis de punta a punta (2026-10-28, INT-18): la pantalla
// cubría 13 acciones y el servidor registra 26 (`src/modules/investigation`:
// retención legal, paquete de custodia, las 8 de Deep Search, ampliación de
// entidades y vínculos sugeridos). Las que faltaban salían con su código y
// no se podían elegir en el filtro, y los detalles mostraban los códigos de
// fuente, tipo de evidencia y método ("SECOP · DATASET_RECORD",
// "APPROVE (DOCUMENT_NUMBER)"). Un solo mapa para la tabla y para el filtro.

import { RELATIONSHIP_TYPES, type OsintAuditLogEntry } from '@/lib/api/osint';
import { formatDecimal } from '@/lib/format';

/** Orden = orden del filtro: primero lo que hace el analista, después lo del agente. */
export const OSINT_ACTION_LABEL: Record<string, string> = {
  SEARCH_EXECUTED: 'Búsqueda ejecutada',
  CASE_CREATED: 'Caso creado',
  CASE_UPDATED: 'Caso actualizado',
  CASE_DELETED: 'Caso eliminado',
  LEGAL_HOLD_SET: 'Retención legal activada',
  LEGAL_HOLD_RELEASED: 'Retención legal liberada',
  CUSTODY_EXPORT_GENERATED: 'Paquete de cadena de custodia descargado',
  SUBJECT_ADDED: 'Sujeto agregado',
  SUBJECT_REMOVED: 'Sujeto eliminado',
  EVIDENCE_CREATED: 'Evidencia registrada',
  RELATIONSHIP_CREATED: 'Relación registrada',
  ENTITY_EXPANDED: 'Entidad ampliada en las fuentes',
  MATCH_CANDIDATE_REVIEWED: 'Candidato de identidad revisado',
  RELATIONSHIP_CANDIDATE_REVIEWED: 'Vínculo sugerido revisado',
  MONITOR_CREATED: 'Monitor creado',
  MONITOR_DELETED: 'Monitor eliminado',
  MONITOR_PAUSED: 'Monitor pausado',
  MONITOR_RESUMED: 'Monitor reanudado',
  DEEP_SEARCH_STARTED: 'Deep Search iniciado',
  DEEP_SEARCH_QUOTA_EXCEEDED: 'Deep Search rechazado por cupo semanal',
  DEEP_SEARCH_CANCELLED: 'Deep Search cancelado',
  DEEP_SEARCH_SUBQUESTION_SEARCHED: 'Deep Search: pregunta buscada',
  DEEP_SEARCH_ENTITY_EXPANDED: 'Deep Search: entidad ampliada',
  DEEP_SEARCH_DOCUMENT_INGESTED: 'Deep Search: documento leído',
  DEEP_SEARCH_DOSSIER_GENERATED: 'Deep Search: dossier generado',
  DEEP_SEARCH_DOSSIER_REGENERATE_STARTED: 'Dossier en regeneración',
};

/** Nunca el código crudo: una acción nueva del servidor sin nombre todavía sale genérica. */
export function osintActionLabel(action: string): string {
  return OSINT_ACTION_LABEL[action] ?? 'Acción del módulo OSINT';
}

const ENTITY_LABEL: Record<string, string> = {
  InvestigationCase: 'Caso',
  Evidence: 'Evidencia',
  Entity: 'Entidad',
  EntityRelationship: 'Relación',
  EntityMatchCandidate: 'Candidato de identidad',
  RelationshipCandidate: 'Vínculo sugerido',
  CaseMonitor: 'Monitor',
  DeepSearchRun: 'Deep Search',
  Investigation: 'Búsqueda ad-hoc',
};

export function osintEntityLabel(entityType: string): string {
  return ENTITY_LABEL[entityType] ?? 'Registro OSINT';
}

// Mismos nombres cortos que `OSINT_SOURCE_KEYS`/`EXPANSION_SOURCE_KEYS`, más
// las fuentes del catálogo que no se eligen a mano
// (`scripts/backfill-osint-sources.ts` del servidor).
const SOURCE_LABEL: Record<string, string> = {
  SECOP: 'SECOP II',
  POLICIA: 'Policía/MinDefensa',
  NEWS: 'Prensa',
  PROCURADURIA: 'Procuraduría',
  CONTRALORIA: 'Contraloría',
  SUPERSOCIEDADES: 'Supersociedades',
  SIGEP: 'SIGEP (PEP)',
  SIGEP_BIENES_RENTAS: 'SIGEP (bienes y rentas)',
  SIC: 'SIC',
  SUPERFINANCIERA: 'Superfinanciera',
  RUES: 'RUES',
  WEB_SEARCH: 'Búsqueda web',
  WHOIS: 'WHOIS/DNS',
  INTL_SANCTIONS: 'Sanciones internacionales',
  GLEIF: 'GLEIF (LEI)',
  ICIJ_OFFSHORE_LEAKS: 'Offshore Leaks (ICIJ)',
  WIKIDATA: 'Wikidata',
  DOCUMENT_INGESTION: 'Documento aportado',
  ANALYST_NOTE: 'Nota del analista',
};

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  DATASET_RECORD: 'registro de datos abiertos',
  DOCUMENT: 'documento',
  NEWS_ARTICLE: 'artículo de prensa',
  WEB_PAGE: 'página web',
  MANUAL_NOTE: 'nota manual',
};

const MATCH_METHOD_LABEL: Record<string, string> = {
  DOCUMENT_NUMBER: 'documento exacto',
  NAME_AND_CONTEXT: 'nombre y contexto',
  NAME_ONLY: 'solo nombre',
  EMBEDDING_SIMILARITY: 'similitud semántica',
};

const DECISION_LABEL: Record<string, string> = {
  APPROVE: 'Aprobado',
  REJECT: 'Rechazado',
};

const RUN_STATUS_LABEL: Record<string, string> = {
  PENDING: 'en cola',
  DECOMPOSING: 'descomponiendo el objetivo',
  SEARCHING: 'buscando en las fuentes',
  EXPANDING: 'ampliando entidades',
  INGESTING: 'leyendo documentos',
  SYNTHESIZING: 'escribiendo el dossier',
};

const RELATIONSHIP_LABEL: Record<string, string> = Object.fromEntries(
  RELATIONSHIP_TYPES.map((t) => [t.value, t.label]),
);

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function labelOf(map: Record<string, string>, value: unknown, fallback: string): string {
  const key = text(value);
  if (!key) return '';
  return map[key] ?? fallback;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${formatDecimal(n, 0)} ${n === 1 ? singular : pluralForm}`;
}

function evidenceCount(value: unknown): string {
  const n = count(value);
  return n === null ? '' : plural(n, 'evidencia nueva', 'evidencias nuevas');
}

function failedOr(m: Record<string, unknown>, ok: string): string {
  return m.status === 'FAILED' ? 'Falló' : ok;
}

function join(...parts: string[]): string {
  return parts.filter(Boolean).join(' · ');
}

/** Detalle legible de una entrada; "" si la acción no trae nada que mostrar. */
export function describeOsintAuditMetadata(entry: OsintAuditLogEntry): string {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case 'CASE_CREATED':
    case 'CASE_UPDATED':
      return text(m.title);
    case 'SUBJECT_ADDED':
      return text(m.displayName);
    case 'EVIDENCE_CREATED':
      return join(
        labelOf(SOURCE_LABEL, m.sourceKey, 'Otra fuente'),
        labelOf(EVIDENCE_TYPE_LABEL, m.evidenceType, 'otro tipo'),
      );
    case 'RELATIONSHIP_CREATED':
      return labelOf(RELATIONSHIP_LABEL, m.relationshipType, 'Otro vínculo');
    case 'MATCH_CANDIDATE_REVIEWED': {
      const decision = labelOf(DECISION_LABEL, m.decision, 'Revisado');
      const method = labelOf(MATCH_METHOD_LABEL, m.matchMethod, 'otro método');
      return method ? `${decision} (${method})` : decision;
    }
    case 'RELATIONSHIP_CANDIDATE_REVIEWED':
      return join(
        labelOf(DECISION_LABEL, m.decision, 'Revisado'),
        labelOf(RELATIONSHIP_LABEL, m.relationshipType, 'Otro vínculo'),
      );
    case 'ENTITY_EXPANDED': {
      const sources = Array.isArray(m.sourceKeys)
        ? m.sourceKeys.map((k) => labelOf(SOURCE_LABEL, k, 'Otra fuente')).filter(Boolean).join(', ')
        : '';
      return join(sources, evidenceCount(m.evidenceCreated));
    }
    case 'CUSTODY_EXPORT_GENERATED': {
      const evidence = count(m.evidenceCount);
      const warnings = count(m.integrityWarnings);
      return join(
        evidence === null ? '' : plural(evidence, 'evidencia', 'evidencias'),
        warnings ? plural(warnings, 'advertencia de integridad', 'advertencias de integridad') : '',
      );
    }
    case 'MONITOR_CREATED':
    case 'MONITOR_DELETED':
    case 'SEARCH_EXECUTED':
      return text(m.query);
    case 'DEEP_SEARCH_STARTED':
      return text(m.objective);
    case 'DEEP_SEARCH_QUOTA_EXCEEDED': {
      const used = count(m.recentCount);
      const limit = count(m.limit);
      return used === null || limit === null
        ? ''
        : `${formatDecimal(used, 0)} de ${formatDecimal(limit, 0)} corridas en la semana`;
    }
    case 'DEEP_SEARCH_CANCELLED': {
      const status = labelOf(RUN_STATUS_LABEL, m.previousStatus, '');
      return status ? `Iba ${status}` : '';
    }
    case 'DEEP_SEARCH_SUBQUESTION_SEARCHED':
      return join(text(m.query), failedOr(m, evidenceCount(m.evidenceCreated)));
    case 'DEEP_SEARCH_ENTITY_EXPANDED': {
      const hop = count(m.hopLevel);
      return join(
        hop === null ? '' : `Nivel ${formatDecimal(hop, 0)}`,
        failedOr(m, evidenceCount(m.evidenceCreated)),
      );
    }
    case 'DEEP_SEARCH_DOCUMENT_INGESTED':
      return join(text(m.url), failedOr(m, ''));
    case 'DEEP_SEARCH_DOSSIER_GENERATED': {
      const version = count(m.version);
      return version === null ? '' : `Versión ${formatDecimal(version, 0)}`;
    }
    default:
      return '';
  }
}
