'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GoogleMap, InfoWindowF } from '@react-google-maps/api';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { DATA_MAP_STYLES, GOOGLE_MAPS_KEY, useGoogleMaps } from '@/lib/google-maps';

/**
 * Mapa coroplético: cada territorio (municipio o departamento) pintado según
 * su valor. Reemplaza al "mapa de calor" de Google, que se retiró en mayo de
 * 2026: los datos públicos llegan SUMADOS por territorio, así que colorear el
 * contorno oficial (DANE) es además la forma honesta de mostrarlos.
 *
 * Los contornos vienen de un archivo GeoJSON con `properties.code` (DIVIPOLA).
 * El color sale de cinco tramos por quintiles del color principal de la marca;
 * un territorio sin dato queda gris con borde punteado.
 */
export interface ChoroplethMapProps {
  /** GeoJSON con `properties.code`. */
  geoUrl: string;
  /** Valor por código; null o ausente = sin dato. */
  values: Record<string, number | null | undefined>;
  /** Nombre por código (para la ventana de detalle y la leyenda). */
  names: Record<string, string>;
  /** Territorio a resaltar con borde grueso. */
  highlightCode?: string | null;
  /** Color base de la escala. */
  color: string;
  /** Cómo escribir un valor ("392.009 hab."). */
  formatValue: (value: number) => string;
  /** Título de la leyenda. */
  legendTitle: string;
  /** Contenido extra de la ventana de detalle. */
  renderDetail?: (code: string) => ReactNode;
}

const CONTAINER_STYLE = { width: '100%', height: '100%' };
// Vista inicial fija (todo el país). Debe ser la MISMA referencia en cada
// pintada: con un objeto nuevo la librería recentra el mapa y deshace el
// encuadre del territorio.
const COLOMBIA_CENTER = { lat: 4.57, lng: -74.3 };
const OPACITIES = [0.14, 0.3, 0.46, 0.64, 0.84];
const NO_DATA_FILL = '#cbd5e1';
const INK = '#0B1728';

/** Cortes por quintiles (los valores iguales caen en el mismo tramo). */
export function quantileBreaks(values: number[], buckets = 5): number[] {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const breaks: number[] = [];
  for (let i = 1; i < buckets; i++) {
    const value = sorted[Math.min(sorted.length - 1, Math.floor((i * sorted.length) / buckets))];
    if (breaks.length === 0 || value > breaks[breaks.length - 1]) breaks.push(value);
  }
  return breaks;
}

/** Tramo de un valor: 0 = el más bajo. */
export function bucketOf(value: number, breaks: number[]): number {
  let bucket = 0;
  while (bucket < breaks.length && value >= breaks[bucket]) bucket++;
  return bucket;
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 bg-slate-50 px-6 text-center text-slate-500">
      <AlertTriangle className="h-6 w-6 text-amber-500" />
      <p className="text-sm">{children}</p>
    </div>
  );
}

export function ChoroplethMap({
  geoUrl,
  values,
  names,
  highlightCode,
  color,
  formatValue,
  legendTitle,
  renderDetail,
}: ChoroplethMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [rejected, setRejected] = useState(false);
  // Contornos ya descargados, recordando de qué archivo son: si cambia el
  // archivo, lo anterior deja de valer sin tener que borrarlo a mano.
  const [loaded, setLoaded] = useState<{ url: string; geo: object | null; error: boolean } | null>(null);
  const geo = loaded?.url === geoUrl ? loaded.geo : null;
  const geoError = loaded?.url === geoUrl && loaded.error;
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selected, setSelected] = useState<{ code: string; position: google.maps.LatLng } | null>(null);
  const [tilesReady, setTilesReady] = useState(false);
  const hoverRef = useRef<string | null>(null);

  useEffect(() => {
    const target = window as unknown as { gm_authFailure?: () => void };
    const previous = target.gm_authFailure;
    target.gm_authFailure = () => {
      previous?.();
      setRejected(true);
    };
    return () => {
      target.gm_authFailure = previous;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(geoUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: object) => {
        if (!cancelled) setLoaded({ url: geoUrl, geo: json, error: false });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ url: geoUrl, geo: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [geoUrl]);

  const breaks = useMemo(
    () => quantileBreaks(Object.values(values).filter((v): v is number => typeof v === 'number')),
    [values],
  );

  const styleFor = useCallback(
    (feature: google.maps.Data.Feature): google.maps.Data.StyleOptions => {
      const code = String(feature.getProperty('code'));
      const value = values[code];
      const highlighted = code === highlightCode;
      const hovered = code === hoverRef.current;
      const hasValue = typeof value === 'number';
      return {
        fillColor: hasValue ? color : NO_DATA_FILL,
        fillOpacity: hasValue ? OPACITIES[bucketOf(value, breaks)] : 0.35,
        strokeColor: highlighted || hovered ? INK : '#ffffff',
        strokeWeight: highlighted ? 3 : hovered ? 2 : 0.8,
        strokeOpacity: 1,
        zIndex: highlighted ? 3 : hovered ? 2 : 1,
        cursor: 'pointer',
      };
    },
    [values, highlightCode, color, breaks],
  );

  // Carga los contornos en la capa de datos del mapa y la encuadra.
  useEffect(() => {
    if (!map || !geo) return;
    const data = map.data;
    data.forEach((feature) => data.remove(feature));
    const features = data.addGeoJson(geo);
    const bounds = new window.google.maps.LatLngBounds();
    features.forEach((feature) =>
      feature.getGeometry()?.forEachLatLng((latLng) => bounds.extend(latLng)),
    );
    if (!bounds.isEmpty()) map.fitBounds(bounds, 24);

    const listeners = [
      data.addListener('click', (event: google.maps.Data.MouseEvent) => {
        setSelected({ code: String(event.feature.getProperty('code')), position: event.latLng! });
      }),
      data.addListener('mouseover', (event: google.maps.Data.MouseEvent) => {
        hoverRef.current = String(event.feature.getProperty('code'));
        data.overrideStyle(event.feature, { strokeColor: INK, strokeWeight: 2, zIndex: 2 });
      }),
      data.addListener('mouseout', (event: google.maps.Data.MouseEvent) => {
        hoverRef.current = null;
        data.revertStyle(event.feature);
      }),
    ];
    return () => listeners.forEach((listener) => listener.remove());
  }, [map, geo]);

  useEffect(() => {
    map?.data.setStyle(styleFor);
  }, [map, styleFor]);

  const options = useMemo<google.maps.MapOptions>(
    () => ({
      styles: DATA_MAP_STYLES,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: 'cooperative',
    }),
    [],
  );

  let content: ReactNode;
  let state: 'off' | 'loading' | 'ready' = tilesReady && geo ? 'ready' : 'loading';
  if (!GOOGLE_MAPS_KEY) {
    state = 'off';
    content = <Notice>El mapa no está disponible: falta configurar la clave de Google Maps.</Notice>;
  } else if (loadError || rejected) {
    state = 'off';
    content = <Notice>No se pudo cargar el mapa de Google. Recarga la página; si sigue igual, avisa a soporte.</Notice>;
  } else if (geoError) {
    state = 'off';
    content = <Notice>No se pudieron cargar los contornos del territorio. Recarga la página.</Notice>;
  } else if (!isLoaded) {
    content = (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  } else {
    content = (
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={COLOMBIA_CENTER}
        zoom={6}
        options={options}
        onLoad={setMap}
        onUnmount={() => setMap(null)}
        onClick={() => setSelected(null)}
        onTilesLoaded={() => setTilesReady(true)}
      >
        {selected && (
          <InfoWindowF position={selected.position} onCloseClick={() => setSelected(null)}>
            <div className="font-sans text-sm">
              <p className="font-semibold text-slate-900">{names[selected.code] ?? selected.code}</p>
              <p className="text-slate-600">
                {typeof values[selected.code] === 'number'
                  ? formatValue(values[selected.code] as number)
                  : 'Sin dato'}
              </p>
              {renderDetail?.(selected.code)}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    );
  }

  const known = Object.values(values).filter((v): v is number => typeof v === 'number');
  const min = known.length ? Math.min(...known) : null;
  const max = known.length ? Math.max(...known) : null;
  const edges = min !== null && max !== null ? [min, ...breaks, max] : [];

  return (
    <div className="flex h-full flex-col gap-2">
      <div
        data-map-state={state}
        className="relative z-0 min-h-[320px] flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-inner"
      >
        {content}
      </div>
      {edges.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600" aria-label={`Leyenda: ${legendTitle}`}>
          <span className="font-medium text-slate-700">{legendTitle}</span>
          {OPACITIES.slice(0, breaks.length + 1).map((opacity, i) => (
            <span key={opacity} className="flex items-center gap-1 tabular-nums">
              <span
                aria-hidden
                className="inline-block h-3 w-5 rounded-sm border border-slate-300"
                style={{ backgroundColor: color, opacity }}
              />
              {formatValue(edges[i])} – {formatValue(edges[i + 1])}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span aria-hidden className="inline-block h-3 w-5 rounded-sm border border-dashed border-slate-400 bg-slate-300/60" />
            Sin dato
          </span>
        </div>
      )}
    </div>
  );
}
