// Deuda técnica menor (2026-09-16) — forma real de `GET /intelligence/heatmap`,
// verificada contra `IntelligenceService#mapMentionToLegacyEventShape()`
// (api-uscate-back/src/modules/intelligence/intelligence.service.ts). El
// backend nombra estos campos en MAYÚSCULAS a propósito ("legacy shape",
// nunca renombrado para no tocar el resto de /inteligencia).
export interface IntelligenceHeatmapEvent {
  id: string;
  TITLE: string;
  SUMMARY: string | null;
  SOURCE_URL: string;
  CATEGORY: string;
  SENTIMENT: string | null;
  IMPACT_SCORE: number | null;
  LOCATION_NAME: string | null;
  LATITUDE: number | null;
  LONGITUDE: number | null;
  EVENT_DATE: string;
}
