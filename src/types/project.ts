// Deuda técnica menor (2026-09-16) — forma real de `GET /projects` /
// `GET /projects/:id` (Radar Legislativo), verificada contra el uso ya
// existente en `(dashboard)/projects` y `ProjectCard.tsx` (nunca inventada).
export interface ProjectRecommendation {
  recommendation: 'FAVOR' | 'CONTRA' | 'MODIFICAR' | 'ABSTENCION' | 'REVISAR';
  // Fase 3 del análisis de punta a punta (2026-10-28, INT-16): en el listado
  // (`GET /projects`) la API manda la recomendación calibrada de cada
  // proyecto (`VotingService.listRecommendations`), la misma del detalle.
  score?: number;
  /** `RULES` = solo reglas; `RULES_AND_MODEL` = reglas + los votos registrados. */
  basis?: 'RULES' | 'RULES_AND_MODEL';
  rulesVersion?: number;
  /** true = calculada para el listado; la explicación se genera al abrir el proyecto. */
  preliminary?: boolean;
  actualVote?: string | null;
}

export interface SourceDocument {
  url: string;
  name?: string;
  docType?: string;
  score?: number;
}

export interface KeyArticle {
  article?: string;
  importance?: 'alta' | 'media' | 'baja' | string;
  summary?: string;
}

export interface LegislativeSheet {
  recommendedVote?: string;
  confidence?: number;
  executiveSummary?: string;
  redFlags?: string[];
  // Campos adicionales de `GET /projects/:id` (detalle), verificados
  // contra `model LegislativeSheet` en el schema real del backend.
  congressmanSummary?: string;
  decisionReason?: string;
  legalImpact?: string;
  fiscalImpact?: string;
  socialImpact?: string;
  politicalImpact?: string;
  projectPurpose?: string;
  mainProblem?: string;
  proposedSolution?: string;
  keyArticles?: KeyArticle[];
  benefits?: string[];
  risks?: string[];
  argumentsFor?: string[];
  argumentsAgainst?: string[];
  affectedActors?: string[];
  lawyerNotes?: string[];
  sourceDocuments?: SourceDocument[];
  [key: string]: unknown;
}

export interface ProjectDocument {
  id?: string;
  url: string;
  name?: string;
  docType?: string;
  score?: number;
}

export interface Project {
  id: string;
  title: string;
  chamber?: string;
  currentStage?: string;
  projectNumber?: string;
  projectYear?: number;
  year?: number;
  recommendations?: ProjectRecommendation[];
  legislativeSheet?: LegislativeSheet | null;
  analysis?: {
    summary?: string;
    impact?: string;
    risk?: string;
    topics?: string | string[];
  } | null;
  // `reasoning` solo viene en el detalle (`GET /projects/:id`) — verificados
  // contra `ProjectsService#buildProjectDetail()`/`findOne()` reales. Desde
  // INT-16 el listado también trae `recommendation` (sin `reasoning`).
  recommendation?: (ProjectRecommendation & { reasoning?: string; actualVote?: string }) | null;
  legislativeBody?: { name?: string; personaTitle?: string } | null;
  documents?: ProjectDocument[];
}

export interface IngestionRun {
  status: string;
  source: string;
  projectsFound: number;
  projectsUpdated: number;
  docsProcessed: number;
  docsSkipped: number;
  errorsCount: number;
}

export interface ProjectAlert {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  // El proyecto del aviso (para mostrar su título y enlazarlo).
  project?: {
    id: string;
    uid: string;
    title: string;
    projectNumber: string | null;
    projectYear: number | null;
    currentStage: string | null;
  } | null;
}
