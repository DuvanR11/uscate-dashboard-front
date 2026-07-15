import {
  SocialAnalysisMetadata,
  SocialExtractionResponse,
} from '@/types/social-statistics.types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SOCIAL_EXTRACTOR_API_URL ??
  'http://127.0.0.1:8000/api/v1';

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = await response.json();

    return (
      errorData.detail ||
      errorData.message ||
      'No fue posible procesar la publicación.'
    );
  } catch {
    return `Error ${response.status}: no fue posible procesar la publicación.`;
  }
}

function parseAnalysisMetadata(
  headerValue: string | null,
): SocialAnalysisMetadata {
  if (!headerValue) {
    throw new Error(
      'El backend no retornó el encabezado X-Analysis-Metrics.',
    );
  }

  try {
    const metadata = JSON.parse(
      headerValue,
    ) as Partial<SocialAnalysisMetadata>;

    if (
      typeof metadata.total_registros !== 'number' ||
      !metadata.porcentajes_categorizacion ||
      typeof metadata.porcentajes_categorizacion !== 'object'
    ) {
      throw new Error('La estructura de métricas no es válida.');
    }

    return metadata as SocialAnalysisMetadata;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        'El encabezado X-Analysis-Metrics no contiene un JSON válido.',
      );
    }

    throw error;
  }
}

export const socialExtractorService = {
  async extractPublication(
    publicationUrl: string,
  ): Promise<SocialExtractionResponse> {
    const normalizedUrl = publicationUrl.trim();

    if (!normalizedUrl) {
      throw new Error('Debes ingresar el enlace de una publicación.');
    }

    const response = await fetch(`${API_BASE_URL}/extraer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: normalizedUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    const metricsHeader = response.headers.get('X-Analysis-Metrics');
    const metadata = parseAnalysisMetadata(metricsHeader);
    const blob = await response.blob();

    return {
      blob,
      metadata,
    };
  },
};