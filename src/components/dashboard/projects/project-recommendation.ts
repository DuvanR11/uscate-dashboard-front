import type { Project } from '@/types/project';

// Fase 3 del análisis de punta a punta (2026-10-28, INT-16): una sola fuente
// para el voto sugerido del Radar. Las tarjetas mostraban el voto que propone
// la ficha de la IA (`legislativeSheet.recommendedVote`, sin calibrar: en la
// práctica casi siempre «REVISAR») con la confianza de la IA, mientras el
// detalle y las cifras usaban la recomendación de las reglas (v2). Ahora
// tarjeta, cifras y detalle muestran la recomendación calibrada que manda la
// API (reglas v2 y, si la persona ya registró votos, su modelo personal); la
// ficha de la IA se cita solo cuando coincide con ella.

export function normalizeRecommendation(value?: string | null) {
  const normalized = (value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

  if (normalized === 'A FAVOR') return 'FAVOR';
  if (normalized === 'EN CONTRA') return 'CONTRA';
  if (normalized === 'ABSTENCION') return 'ABSTENCION';
  if (normalized === 'MODIFICAR') return 'MODIFICAR';
  if (normalized === 'REVISAR') return 'REVISAR';

  return normalized || 'SIN_RECOMENDACION';
}

export function recommendationLabel(value?: string | null) {
  const normalized = normalizeRecommendation(value);
  if (normalized === 'SIN_RECOMENDACION') return 'SIN RECOMENDACIÓN';
  if (normalized === 'ABSTENCION') return 'ABSTENCIÓN';

  return normalized;
}

type RecommendationSource = Pick<
  Project,
  'recommendation' | 'recommendations' | 'legislativeSheet'
>;

/** El voto sugerido calibrado (reglas v2 + modelo personal), o nada. */
export function calibratedRecommendation(project: RecommendationSource) {
  const value =
    project.recommendation?.recommendation ??
    project.recommendations?.[0]?.recommendation;
  return value ? normalizeRecommendation(value) : undefined;
}

/**
 * true si la ficha de la IA propone el mismo voto que la recomendación
 * calibrada: solo entonces su confianza y su razón describen lo que se ve.
 */
export function sheetAgreesWithRecommendation(project: RecommendationSource) {
  const calibrated = calibratedRecommendation(project);
  const sheetVote = project.legislativeSheet?.recommendedVote;
  return (
    !!calibrated &&
    !!sheetVote &&
    normalizeRecommendation(sheetVote) === calibrated
  );
}

/** El texto de la explicación guardada (`reasoning` es JSON), si lo hay. */
export function recommendationReasoningText(reasoning?: string | null) {
  if (!reasoning) return undefined;
  try {
    const parsed = JSON.parse(reasoning) as { text?: unknown };
    return typeof parsed?.text === 'string' && parsed.text.trim()
      ? parsed.text
      : undefined;
  } catch {
    return reasoning;
  }
}

/**
 * La razón que acompaña al voto sugerido en el detalle: la de la ficha si
 * coincide con él; si la ficha propuso otro voto, se dice así (nunca el JSON
 * crudo de la explicación, que antes se colaba cuando la ficha no traía razón).
 */
export function recommendationReason(project: RecommendationSource) {
  const sheet = project.legislativeSheet;
  if (sheetAgreesWithRecommendation(project) && sheet?.decisionReason) {
    return sheet.decisionReason;
  }

  const calibrated = calibratedRecommendation(project);
  if (calibrated && sheet?.recommendedVote) {
    return `La ficha de la IA propuso «${recommendationLabel(sheet.recommendedVote)}». El voto sugerido, «${recommendationLabel(calibrated)}», sale de las reglas de recomendación del Radar y, si ya registraste votos reales, de lo que aprendió de ellos: la explicación completa está en «Explicación del modelo IA».`;
  }

  return recommendationReasoningText(project.recommendation?.reasoning);
}
