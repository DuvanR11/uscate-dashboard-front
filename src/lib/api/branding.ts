import api, { apiGet, apiPatch, apiDelete } from '@/lib/api';

/**
 * Cliente para `/branding` (Personalización de Marca / White Label —
 * informe técnico "Personalización de Marca", Fase 3 del backend ya
 * implementada y verificada). Mismo criterio "eliminar = restablecer" que
 * `lib/api/catalogs.ts`, salvo que acá "restablecer" SÍ borra la fila física
 * (decisión #14 de Fase 1) — no hay soft-delete para branding.
 *
 * Ningún método de acá recibe `organizationId` — el backend siempre lo
 * resuelve del JWT (`request.user.organizationId`), nunca de un parámetro
 * de cliente (refinamiento de seguridad decidido en Fase 1, elimina el
 * vector IDOR de raíz).
 */

export interface EffectiveBranding {
  applicationName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface AdminBranding {
  organizationId: string;
  applicationName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  updatedAt: string | null;
}

export interface UpdateBrandingPayload {
  applicationName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

// Mismos valores que `DEFAULT_BRANDING` en el backend
// (`api-uscate-back/src/modules/branding/branding.constants.ts`) — el
// branding actual de Uscátegui, tal como ya vive hardcodeado en
// `globals.css`/`sidebar.tsx`. Última red de seguridad si `GET /branding`
// ni siquiera responde (backend caído/red) — ver estrategia de fallback,
// §7 del informe: la app nunca debe quedar sin tema, ni con una pantalla
// en blanco.
export const DEFAULT_BRANDING: EffectiveBranding = {
  applicationName: 'Dashboard Uscátegui',
  logoUrl: '/imgs/logo.png',
  primaryColor: '#1B2541',
  secondaryColor: '#FFC400',
  accentColor: '#FFC400',
};

/** Extrae el `message` que arma Nest en sus excepciones (400/409) de un error de axios. */
export function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}

export const brandingApi = {
  /** `GET /branding` — sin permiso especial, cualquier sesión válida. */
  getEffective: () => apiGet<EffectiveBranding>('/branding'),
  /** `GET /branding/admin` — requiere `PERSONALIZACION.canRead`. */
  getAdmin: () => apiGet<AdminBranding>('/branding/admin'),
  /** `PATCH /branding` — requiere `PERSONALIZACION.canWrite`. Upsert parcial. */
  update: (data: UpdateBrandingPayload) => apiPatch<AdminBranding>('/branding', data),
  /** `DELETE /branding` — requiere `PERSONALIZACION.canWrite`. Restablecer (borra la fila). */
  reset: () => apiDelete<{ success: boolean }>('/branding'),
};

/**
 * `POST /branding/logo` — multipart, no encaja en los helpers JSON de
 * `apiPost`/etc. de `lib/api.ts`, así que usa el cliente axios (`api`)
 * directo con `FormData`, mismo patrón que cualquier upload de archivo en
 * este frontend.
 */
export async function uploadBrandingLogo(file: File): Promise<AdminBranding> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<AdminBranding>('/branding/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
