'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  COUNTRY_TERRITORY,
  getOrganizationTerritory,
  type OrganizationTerritory,
} from '@/lib/api/territory';

/**
 * Territorio de la organización en sesión. `territory` nunca es nulo (mientras
 * carga es Colombia); `loaded` dice si ya llegó la respuesta real.
 */
export function useOrgTerritory(): { territory: OrganizationTerritory; loaded: boolean } {
  const organizationId = useAuthStore((s) => s.user?.organizationId);
  const [state, setState] = useState<{
    organizationId: string | undefined;
    territory: OrganizationTerritory | null;
  }>({ organizationId: undefined, territory: null });

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    getOrganizationTerritory(organizationId).then((territory) => {
      if (!cancelled) setState({ organizationId, territory });
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // Si cambió la organización (sesión "ver como"), lo cargado ya no aplica.
  const current = state.organizationId === organizationId ? state.territory : null;
  return { territory: current ?? COUNTRY_TERRITORY, loaded: current !== null };
}
