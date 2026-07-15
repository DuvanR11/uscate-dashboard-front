'use client';

import { useState } from 'react';
import { socialExtractorService } from '@/services/socialExtractor.service';
import { SocialAnalysisMetadata } from '@/types/social-statistics.types';

export function useSocialExtractor() {
  const [publicationUrl, setPublicationUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SocialAnalysisMetadata | null>(null);
  const [reportBlob, setReportBlob] = useState<Blob | null>(null);

  const executeExtraction = async (): Promise<void> => {
    const normalizedUrl = publicationUrl.trim();

    if (!normalizedUrl) {
      setError('Debes ingresar el enlace de una publicación.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setReportBlob(null);

    try {
      const response =
        await socialExtractorService.extractPublication(normalizedUrl);

      setResult(response.metadata);
      setReportBlob(response.blob);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado durante la extracción.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = (): void => {
    if (!reportBlob) {
      setError('No existe un reporte disponible para descargar.');
      return;
    }

    const blobUrl = window.URL.createObjectURL(reportBlob);
    const anchor = document.createElement('a');

    anchor.href = blobUrl;
    anchor.download = `estadisticas_publicacion_${
      new Date().toISOString().split('T')[0]
    }.xlsx`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(blobUrl);
  };

  const clearState = (): void => {
    setPublicationUrl('');
    setError(null);
    setResult(null);
    setReportBlob(null);
  };

  return {
    publicationUrl,
    setPublicationUrl,
    loading,
    error,
    result,
    hasReport: Boolean(reportBlob),
    executeExtraction,
    exportExcel,
    clearState,
  };
}