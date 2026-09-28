// Estadísticas de redes (2026-09-28): contrato de `POST /social-stats/analyze`
// y afines (módulo `social-stats` del backend). Reemplaza al servicio externo
// anterior (`/extraer` + cabecera X-Analysis-Metrics), que nunca existió en
// producción.

export type SocialPlatform = 'YOUTUBE' | 'FACEBOOK' | 'INSTAGRAM';

export type CommentCategory =
  | 'positivo'
  | 'negativo'
  | 'neutral'
  | 'pregunta_o_solicitud';

export interface SocialComment {
  author: string | null;
  text: string;
  publishedAt: string | null;
  likes: number;
  category: CommentCategory | null;
}

export interface SocialPublication {
  platform: SocialPlatform;
  externalId: string;
  url: string;
  title: string | null;
  author: string | null;
  publishedAt: string | null;
  totalComments: number;
}

export interface SocialAnalysisResult {
  analysisId: string;
  createdAt: string;
  publication: SocialPublication;
  totalComments: number;
  analyzedComments: number;
  classifiedComments: number;
  counts: Record<CommentCategory, number>;
  categories: Record<CommentCategory, number>;
  summary: string | null;
  themes: string[];
  highlights: Record<CommentCategory, SocialComment[]>;
  comments: SocialComment[];
}

export interface SocialSources {
  youtube: { available: boolean };
  meta: {
    configured: boolean;
    pageName?: string | null;
    instagramUsername?: string | null;
  };
}

export interface SocialRecentPost {
  platform: SocialPlatform;
  url: string;
  caption: string | null;
  publishedAt: string | null;
  comments: number;
}

export interface SocialAnalysisHistoryItem {
  id: string;
  platform: SocialPlatform;
  url: string;
  title: string | null;
  totalComments: number;
  analyzedComments: number;
  categories: Record<CommentCategory, number>;
  createdAt: string;
}
