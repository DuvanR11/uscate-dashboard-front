// Plan "OSINT Profesional" (2026-09-02), Fase 4 — grafo profesional
// unificado. Hasta ahora `InvestigationGraph.tsx` (buscador ad-hoc, 12
// fuentes) y `EntityGraphView.tsx` (grafo de casos, Entity/
// EntityRelationship persistentes) reimplementaban por separado el MISMO
// layout con ReactFlow+dagre. Esta forma común es lo que permite que
// ambos deleguen el renderizado a un solo componente (`GraphCanvas`),
// aunque sus datos de origen sean estructuralmente distintos (nodos
// efímeros por búsqueda vs. `Entity` reales persistidas).
export interface GraphViewNode {
  id: string;
  label: string;
  type: string;
  /** 0-10, solo tiene sentido en el grafo ad-hoc (una Entity no trae "riesgo" propio). */
  risk?: number;
  /** El objeto original (InvestigationNode o Entity) — lo usa el panel de detalle de cada llamador. */
  raw: unknown;
}

export interface GraphViewEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  /** Solo en el grafo de casos (EntityRelationship.confidence) — ausente en el ad-hoc. */
  confidence?: string;
  /** Solo en el grafo ad-hoc (peso agregado del link) — ausente en el de casos. */
  weight?: number;
  raw: unknown;
}

export type GraphLayout = 'hierarchical' | 'radial';

// Nivel de confianza -> color/grosor/estilo de trazo del enlace. Mismo
// orden real de `CONFIDENCE_RANK` del backend (confidence-rank.util.ts) —
// duplicado acá a propósito (es una tabla de presentación pura, el
// frontend no comparte código con el backend).
export const CONFIDENCE_EDGE_STYLE: Record<
  string,
  { color: string; width: number; dashed?: boolean }
> = {
  VERIFIED_FACT: { color: '#16a34a', width: 3 },
  REPORTED_FACT: { color: '#0891b2', width: 2.5 },
  PROBABLE_MATCH: { color: '#ca8a04', width: 2 },
  POSSIBLE_MATCH: { color: '#ca8a04', width: 1.5, dashed: true },
  ANALYST_HYPOTHESIS: { color: '#94a3b8', width: 1.5, dashed: true },
  CONTRADICTED: { color: '#dc2626', width: 2, dashed: true },
};

export interface NodeBookmark {
  starred: boolean;
  note: string;
}

// Plan "OSINT Profesional" (2026-09-02), Fase 5 — "riesgo por entidad,
// visible en el propio nodo del grafo": un anillo de color por nivel,
// aplicado en `GraphCanvas` cuando `node.risk` viene poblado (hoy: la
// Entity graph de casos, vía `EntityGraphService.getNeighborhood()`/
// `findPath()`; el buscador ad-hoc sigue con su propio `risk` 0-10 de
// siempre, mismo campo, mismo tratamiento visual). Solo HIGH/CRITICAL se
// resaltan — LOW/MEDIUM no generan ruido visual.
export function riskRingColor(risk: number | undefined): string | null {
  if (risk == null) return null;
  if (risk >= 8.5) return '#dc2626'; // CRITICAL
  if (risk >= 6.5) return '#ea580c'; // HIGH
  return null;
}
