import { apiGet, apiPost, LONG_REQUEST_TIMEOUT_MS } from '@/lib/api';
import type {
  SocialAnalysisHistoryItem,
  SocialAnalysisResult,
  SocialRecentPost,
  SocialSources,
} from '@/types/social-statistics.types';

// Estadísticas de redes (2026-09-28): todo pasa por la API con la sesión del
// usuario (permiso ESTADISTICAS_REDES), nunca contra un servicio externo.
export const getSocialSources = () => apiGet<SocialSources>('/social-stats/sources');

export const getSocialRecentPosts = () =>
  apiGet<SocialRecentPost[]>('/social-stats/recent-posts');

export const getSocialHistory = () =>
  apiGet<SocialAnalysisHistoryItem[]>('/social-stats/history');

// Fase 5 del análisis de punta a punta (2026-10-28, TRV-25): lee la publicación en la
// red y clasifica sus comentarios con IA: pasa del plazo general de 30 s.
export const analyzePublication = (url: string) =>
  apiPost<SocialAnalysisResult>('/social-stats/analyze', { url }, { timeout: LONG_REQUEST_TIMEOUT_MS });
