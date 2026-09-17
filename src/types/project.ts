// Deuda técnica menor (2026-09-16) — forma real de `GET /projects` /
// `GET /projects/:id` (Radar Legislativo), verificada contra el uso ya
// existente en `(dashboard)/projects` y `ProjectCard.tsx` (nunca inventada).
export interface ProjectRecommendation {
  recommendation: 'FAVOR' | 'CONTRA' | 'MODIFICAR' | 'ABSTENCION' | 'REVISAR';
}

export interface LegislativeSheet {
  recommendedVote?: string;
  confidence?: number;
  executiveSummary?: string;
  redFlags?: string[];
  [key: string]: unknown;
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
  analysis?: { summary?: string; impact?: string } | null;
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
