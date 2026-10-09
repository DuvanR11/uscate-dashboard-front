'use client';

// Mejora del Dashboard de Analítica (2026-09-04): primera UI real para
// `GET /reports/political/map` — el backend ya calculaba la intensidad por
// departamento, pero ninguna pantalla lo consumía. Sobre Google Maps desde el
// 2026-10-09 (`DataMap`); la página lo importa con `dynamic(ssr:false)`
// porque el mapa necesita `window`.
import { useBrandColors } from '@/hooks/use-brand-colors';
import { useOrgTerritory } from '@/hooks/use-org-territory';
import { DataMap, type MapBubble } from '@/components/dashboard/map/data-map';

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

  const bubbles: MapBubble[] = data.map((point) => {
    // Radio proporcional a la intensidad relativa al máximo — nunca
    // un número inventado, siempre relativo a los datos reales.
    const relative = maxIntensity > 0 ? point.intensity / maxIntensity : 0;
    return {
      id: point.department,
      title: `${point.department}: ${point.intensity} prospectos`,
      lat: Number(point.lat),
      lng: Number(point.lng),
      radius: 8 + relative * 32,
      color: brand.primary,
      fillOpacity: 0.35 + relative * 0.4,
    };
  });

  return (
    <DataMap
      center={territory.center}
      zoom={zoom}
      fractionalZoom
      embedded
      bubbles={bubbles}
      renderPopup={(id) => {
        const point = data.find((d) => d.department === id);
        if (!point) return null;
        return (
          <div className="text-sm">
            <p className="font-bold text-slate-800">{point.department}</p>
            <p className="text-slate-500">{point.intensity} prospectos</p>
          </div>
        );
      }}
    />
  );
}
