import { apiGet } from '@/lib/api';

// Fase 3 "Territorio para cualquier municipio" (2026-10-06): dónde trabaja la
// organización (`GET /organization/territory`). Antes los mapas del panel
// abrían en Bogotá para todos los clientes.

export interface OrganizationTerritory {
  scope: 'MUNICIPALITY' | 'DEPARTMENT' | 'COUNTRY';
  /** "Neiva", "Huila" o "Colombia". */
  name: string;
  municipalityId: number | null;
  departmentId: number | null;
  center: { lat: number; lng: number };
  zoom: number;
}

// Mientras llega la respuesta (o si falla) se muestra el país completo: es
// neutral para cualquier cliente y nunca lo ubica en una ciudad ajena.
export const COUNTRY_TERRITORY: OrganizationTerritory = {
  scope: 'COUNTRY',
  name: 'Colombia',
  municipalityId: null,
  departmentId: null,
  center: { lat: 4.5709, lng: -74.2973 },
  zoom: 6,
};

// Una petición por organización y por sesión del navegador, aunque la pidan
// varios mapas y formularios a la vez.
const requests = new Map<string, Promise<OrganizationTerritory | null>>();

export function getOrganizationTerritory(organizationId: string) {
  let request = requests.get(organizationId);
  if (!request) {
    request = apiGet<OrganizationTerritory>('/organization/territory').catch(() => {
      // Error de red o cuenta sin organización: se reintenta en el próximo montaje.
      requests.delete(organizationId);
      return null;
    });
    requests.set(organizationId, request);
  }
  return request;
}

/** Vista para mapas que muestran un área más amplia que el municipio (menciones, calor). */
export function regionalZoom(territory: OrganizationTerritory): number {
  if (territory.scope === 'MUNICIPALITY') return 10;
  if (territory.scope === 'DEPARTMENT') return 8;
  return 6;
}
