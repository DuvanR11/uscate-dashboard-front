'use client';

import { useCallback, useEffect, useState } from 'react';
import { localitiesApi, type Locality } from '@/lib/api/catalogs';

/**
 * Zonas (comunas, barrios, veredas, localidades) que la organización puede
 * usar: las compartidas de su municipio más las propias. Fase 3 (2026-10-06):
 * reemplaza a las listas de localidades de Bogotá que varias pantallas
 * traían escritas a mano.
 */
export function useZones() {
  const [zones, setZones] = useState<Locality[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    localitiesApi
      .list()
      .then((data) => {
        if (!cancelled) setZones(Array.isArray(data) ? data : []);
      })
      // Sin zonas las pantallas siguen funcionando: la zona es opcional.
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { zones, loading, reload };
}
