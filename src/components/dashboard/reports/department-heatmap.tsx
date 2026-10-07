'use client';

// Mejora del Dashboard de Analítica (2026-09-04): primera UI real para
// `GET /reports/political/map` — el backend ya calculaba la intensidad por
// departamento, pero ninguna pantalla lo consumía. Mismo stack que
// `PredictiveMap.tsx` (react-leaflet + CircleMarker por intensidad),
// importado con `dynamic(ssr:false)` desde la página porque Leaflet toca
// `window`.
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useBrandColors } from '@/hooks/use-brand-colors';
import { useOrgTerritory } from '@/hooks/use-org-territory';
import { LeafletRecenter } from '@/components/dashboard/map/leaflet-recenter';

export interface HeatmapPoint {
  department: string;
  lat: number;
  lng: number;
  intensity: number;
}

export default function DepartmentHeatmap({ data }: { data: HeatmapPoint[] }) {
  const brand = useBrandColors();
  // Fase 3: este mapa compara departamentos, así que mantiene una vista
  // amplia, pero centrada en la región de la organización y no en Bogotá.
  const { territory } = useOrgTerritory();
  const zoom = territory.scope === 'COUNTRY' ? 5.5 : 6.5;
  const maxIntensity = data.length > 0 ? Math.max(...data.map((d) => d.intensity)) : 0;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-slate-200 z-0 relative">
      <MapContainer
        center={[territory.center.lat, territory.center.lng]}
        zoom={zoom}
        zoomSnap={0.5}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <LeafletRecenter lat={territory.center.lat} lng={territory.center.lng} zoom={zoom} />
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {data.map((point) => {
          // Radio proporcional a la intensidad relativa al máximo — nunca
          // un número inventado, siempre relativo a los datos reales.
          const relative = maxIntensity > 0 ? point.intensity / maxIntensity : 0;
          const radius = 8 + relative * 32;
          return (
            <CircleMarker
              key={point.department}
              center={[point.lat, point.lng]}
              radius={radius}
              pathOptions={{
                color: brand.primary,
                fillColor: brand.primary,
                fillOpacity: 0.35 + relative * 0.4,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold text-slate-800">{point.department}</p>
                  <p className="text-slate-500">{point.intensity} prospectos</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
