// Deuda técnica menor (2026-09-16) — forma real de `GET /projects` /
// `GET /projects/:id` (Radar Legislativo), verificada contra el uso ya
// existente en `(dashboard)/projects` y `ProjectCard.tsx` (nunca inventada).
export interface ProjectRecommendation {
  recommendation: 'FAVOR' | 'CONTRA' | 'MODIFICAR' | 'ABSTENCION' | 'REVISAR';
}

export interface SourceDocument {
  url: string;
  name?: string;
  docType?: string;
  score?: number;
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
  // Solo en el detalle (`GET /projects/:id`) — verificados contra
  // `ProjectsService#buildProjectDetail()`/`findOne()` reales.
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
}
