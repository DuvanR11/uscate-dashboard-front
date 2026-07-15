export interface CategorizationPercentages {
  [category: string]: number;
}

export interface SocialAnalysisMetadata {
  total_registros: number;
  porcentajes_categorizacion: CategorizationPercentages;
}

export interface SocialExtractionResponse {
  blob: Blob;
  metadata: SocialAnalysisMetadata | null;
}