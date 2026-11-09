import api, { apiGet } from '@/lib/api';
import type { KeywordKind } from '@/lib/api/monitoring';

/**
 * Tendencias de Monitoreo de medios (`/monitoring/trends`, Fase 3 del plan
 * del 2026-11-08). Todo se cuenta en el servidor: por noticia (la misma nota
 * en dos etiquetas es una), en días de Colombia y sin el archivo.
 */

export type TrendPeriod = '7d' | '30d' | '90d';

export const TREND_PERIOD_LABEL: Record<TrendPeriod, string> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
};

export interface SentimentCounts {
  negative: number;
  neutral: number;
  positive: number;
  unclassified: number;
}

export interface TrendKeyword extends SentimentCounts {
  id: string;
  name: string;
  kind: KeywordKind;
  news: number;
  previousNews: number;
  /** Variación en % frente al periodo anterior; null si antes no hubo. */
  variationPct: number | null;
  /** Negativas sobre las clasificadas, de 0 a 1. */
  negativeShare: number | null;
}

export interface ShareItem {
  id: string;
  name: string;
  kind: 'OWN' | 'RIVAL';
  news: number;
  /** De 0 a 1. */
  share: number;
}

export interface TrendOutlet {
  name: string;
  news: number;
  own: number;
  rival: number;
  topic: number;
  ownNegative: number;
}

export interface TrendsReport {
  period: { key: TrendPeriod; days: string[]; since: string; until: string; previousSince: string };
  totals: {
    news: number;
    previousNews: number;
    variationPct: number | null;
    negative: number;
    previousNegative: number;
    outlets: number;
  };
  daily: ({ day: string; total: number } & SentimentCounts)[];
  keywords: TrendKeyword[];
  shareOfVoice: {
    available: boolean;
    items: ShareItem[];
    ownShare: number | null;
    previousOwnShare: number | null;
    daily: { day: string; counts: Record<string, number> }[];
  };
  outlets: TrendOutlet[];
  hasOwn: boolean;
  hasRivals: boolean;
  truncated: boolean;
}

export const monitoringTrendsApi = {
  get: (period: TrendPeriod) => apiGet<TrendsReport>(`/monitoring/trends?period=${period}`),

  /**
   * Descarga el informe en PDF. El nombre lo arma el panel: entre dominios
   * distintos el navegador no deja leer `Content-Disposition`.
   */
  async downloadReport(period: TrendPeriod, lastDay: string): Promise<void> {
    const response = await api.get<Blob>(`/monitoring/trends/report?period=${period}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `informe-medios-${lastDay}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
