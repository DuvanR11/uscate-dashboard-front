'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { TerritoryActivity } from '@/lib/api/monitoring';
import { useBrandColors } from '@/hooks/use-brand-colors';

const DEFAULT_CENTER: [number, number] = [4.6097, -74.0817]; // Bogotá/Cundinamarca

interface PredictiveMapProps {
  territories: TerritoryActivity[];
  keywordName?: string | null;
}

/**
 * Mapa por territorios del panel de Monitoreo (Fase 10) — a diferencia de
 * `components/dashboard/intelligence/PredictiveMap.tsx` (que grafica
 * eventos individuales de `IntelligenceEvent`), este pinta un círculo por
 * territorio agregado (`GET /monitoring/analytics/keywords/:id/territories`,
 * Fase 9): la intensidad ya viene sumada del backend, acá solo se dibuja.
 * Intencionalmente NO reemplaza ni toca el mapa de `/inteligencia` — son
 * pipelines de datos distintos (ver decisión #2 del informe, migración
 * pendiente) y este vive en su propia ruta `/inteligencia/monitoreo`.
 */
export default function PredictiveMap({ territories, keywordName }: PredictiveMapProps) {
  const colors = useBrandColors();
  const withCoords = territories.filter((t) => t.latitude !== null && t.longitude !== null);
  const maxCount = Math.max(1, ...withCoords.map((t) => t.mentionCount));

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-slate-200 z-0 relative">
      <MapContainer center={DEFAULT_CENTER} zoom={8} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {withCoords.map((t) => {
          const intensity = t.mentionCount / maxCount;
          const radius = 8 + intensity * 22;
          // Confianza baja (fallback a centroide departamental, ver Fase 7)
          // se dibuja más tenue para no sobre-representar precisión que no
          // existe todavía (0 de 116 Municipality tienen lat/lng propios).
          const opacity = t.locationConfidence && t.locationConfidence >= 0.7 ? 0.75 : 0.35;

          return (
            <CircleMarker
              key={t.locationName}
              center={[t.latitude as number, t.longitude as number]}
              radius={radius}
              pathOptions={{
                color: colors.primary,
                fillColor: colors.secondary,
                fillOpacity: opacity,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1 min-w-[180px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin size={14} className="text-primary" />
                    <span className="font-bold text-sm text-primary">{t.locationName}</span>
                  </div>
                  {keywordName && <p className="text-xs text-slate-500 mb-1">{keywordName}</p>}
                  <p className="text-xs text-slate-600">
                    <strong>{t.mentionCount}</strong> mención(es)
                  </p>
                  {t.locationConfidence !== null && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Confianza de ubicación: {Math.round(t.locationConfidence * 100)}%
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {territories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 pointer-events-none">
          <p className="text-sm text-slate-400">Sin actividad geolocalizada en esta ventana.</p>
        </div>
      )}
    </div>
  );
}