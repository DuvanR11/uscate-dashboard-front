import { apiGet, apiPost } from '@/lib/api';
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

export const analyzePublication = (url: string) =>
  apiPost<SocialAnalysisResult>('/social-stats/analyze', { url });
