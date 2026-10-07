'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * `MapContainer` solo lee `center` y `zoom` al montarse. El territorio de la
 * organización llega un instante después, así que este componente (hijo del
 * mapa) mueve la vista cuando cambian.
 */
export function LeafletRecenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: false });
  }, [map, lat, lng, zoom]);
  return null;
}
