'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GoogleMap, InfoWindowF, MarkerF } from '@react-google-maps/api';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { DATA_MAP_STYLES, GOOGLE_MAPS_KEY, useGoogleMaps } from '@/lib/google-maps';

/** Un círculo sobre el mapa. `radius` va en píxeles: no crece ni se encoge al acercar. */
export interface MapBubble {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  /** Color del borde. */
  color: string;
  /** Color del relleno (por defecto, el del borde). */
  fillColor?: string;
  fillOpacity: number;
  weight?: number;
  /** Texto que aparece al pasar el cursor (y que leen los lectores de pantalla). */
  title?: string;
}

interface DataMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  bubbles: MapBubble[];
  /** Contenido de la ventana que se abre al tocar un círculo. */
  renderPopup?: (id: string) => ReactNode;
  /** Acepta niveles intermedios (5,5 · 6,5) para encuadrar una región completa. */
  fractionalZoom?: boolean;
  /**
   * Para un mapa dentro de una página que se desplaza: no secuestra la rueda
   * del ratón (se acerca con Ctrl + rueda) y solo se crea cuando entra en
   * pantalla, así no se carga un mapa que nadie llegó a ver.
   */
  embedded?: boolean;
  /** Capas propias encima del mapa (por ejemplo, un aviso de "sin datos"). */
  children?: ReactNode;
}

const CONTAINER_STYLE = { width: '100%', height: '100%' };

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 bg-slate-50 px-6 text-center text-slate-500">
      <AlertTriangle className="h-6 w-6 text-amber-500" />
      <p className="text-sm">{children}</p>
    </div>
  );
}

/**
 * Mapa de datos del panel sobre Google Maps: círculos de tamaño fijo en
 * pantalla y una ventana de detalle al tocarlos. Lo usan el mapa por
 * departamentos del Tablero y los de Inteligencia y Monitoreo.
 */
export function DataMap({
  center,
  zoom,
  bubbles,
  renderPopup,
  fractionalZoom = false,
  embedded = false,
  children,
}: DataMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  // Un mapa incrustado espera a entrar en pantalla (si el navegador sabe avisarlo).
  const [visible, setVisible] = useState(
    () => !embedded || typeof IntersectionObserver === 'undefined',
  );
  const frameRef = useRef<HTMLDivElement>(null);

  // Google avisa por esta función global cuando rechaza la clave (vencida, o
  // sin permiso para este dominio); sin escucharla el mapa queda gris sin más.
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
    if (visible) return;
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: '200px' },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [visible]);

  // La librería recentra cuando cambia la REFERENCIA de `center`: con un objeto
  // nuevo en cada pintada el mapa volvería a su sitio cada vez que se toca algo.
  const stableCenter = useMemo(() => ({ lat: center.lat, lng: center.lng }), [center.lat, center.lng]);
  const options = useMemo<google.maps.MapOptions>(
    () => ({
      styles: DATA_MAP_STYLES,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: true,
      clickableIcons: false,
      isFractionalZoomEnabled: fractionalZoom,
      gestureHandling: embedded ? 'cooperative' : 'greedy',
    }),
    [fractionalZoom, embedded],
  );

  const valid = useMemo(
    () => bubbles.filter((bubble) => Number.isFinite(bubble.lat) && Number.isFinite(bubble.lng)),
    [bubbles],
  );
  const selected = selectedId ? valid.find((bubble) => bubble.id === selectedId) ?? null : null;

  let content: ReactNode;
  if (!GOOGLE_MAPS_KEY) {
    content = <Notice>El mapa no está disponible: falta configurar la clave de Google Maps.</Notice>;
  } else if (loadError || rejected) {
    content = <Notice>No se pudo cargar el mapa de Google. Recarga la página; si sigue igual, avisa a soporte.</Notice>;
  } else if (!isLoaded || !visible) {
    content = (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  } else {
    content = (
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={stableCenter}
        zoom={zoom}
        options={options}
        onClick={() => setSelectedId(null)}
      >
        {valid.map((bubble) => (
          <MarkerF
            key={bubble.id}
            position={{ lat: bubble.lat, lng: bubble.lng }}
            title={bubble.title}
            onClick={renderPopup ? () => setSelectedId(bubble.id) : undefined}
            clickable={Boolean(renderPopup)}
            // Los círculos pequeños quedan encima de los grandes para poder tocarlos.
            zIndex={1000 - Math.round(bubble.radius)}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: bubble.radius,
              fillColor: bubble.fillColor ?? bubble.color,
              fillOpacity: bubble.fillOpacity,
              strokeColor: bubble.color,
              strokeOpacity: 1,
              strokeWeight: bubble.weight ?? 2,
            }}
          />
        ))}

        {selected && renderPopup && (
          <InfoWindowF
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelectedId(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -Math.round(selected.radius)) }}
          >
            <div className="font-sans">{renderPopup(selected.id)}</div>
          </InfoWindowF>
        )}
      </GoogleMap>
    );
  }

  return (
    <div
      ref={frameRef}
      className="relative z-0 h-full w-full overflow-hidden rounded-xl border border-slate-200 shadow-inner"
    >
      {content}
      {children}
    </div>
  );
}
