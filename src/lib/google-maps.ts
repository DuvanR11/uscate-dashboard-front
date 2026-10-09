'use client';

import { useJsApiLoader } from '@react-google-maps/api';

// Todos los mapas del panel usan Google Maps (2026-10-09). Los de Tablero,
// Inteligencia y Monitoreo usaban Leaflet con el fondo gratuito de CARTO, que
// empezó a exigir clave: cada cuadro del mapa salía con el letrero "API KEY
// REQUIRED". No volver a depender de un fondo de mapa de terceros sin contrato.
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

/**
 * Cargador ÚNICO de Google Maps. La librería exige que todos los que lo usan
 * en una misma página pidan exactamente las mismas opciones (mismo `id`, misma
 * clave, mismas librerías); por eso viven aquí y no en cada mapa.
 *
 * Sin la librería "visualization": Google retiró la capa de calor
 * (HeatmapLayer) en la versión 3.65 y construirla hacía caer la pantalla.
 */
export function useGoogleMaps() {
  return useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_KEY,
  });
}

/**
 * Aviso para que los mapas incrustados se creen aunque todavía no hayan
 * entrado en pantalla. Lo lanza "Exportar a PDF" antes de tomar la imagen.
 */
export const SHOW_MAPS_EVENT = 'zyron:show-maps';

// Fondo sobrio para los mapas que pintan datos encima (círculos por
// departamento, por territorio o por noticia): sin comercios ni transporte y
// con poco color, para que lo que se lea sean los círculos.
export const DATA_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ saturation: -55 }, { lightness: 12 }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ lightness: 25 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d6e4f0' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
];
