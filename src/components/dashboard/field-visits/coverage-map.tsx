'use client';

// Plan hacia la versión estable, Fase 3c (2026-11-10): cobertura puerta a
// puerta por zona sobre el mapa. Un círculo por zona con centro conocido; el
// tamaño es el número de visitas relativo a la zona con más. La página lo
// importa con `dynamic(ssr:false)` porque el mapa necesita `window`.
import { useBrandColors } from '@/hooks/use-brand-colors';
import { useOrgTerritory } from '@/hooks/use-org-territory';
import { DataMap, type MapBubble } from '@/components/dashboard/map/data-map';
import type { CoverageZone } from '@/lib/api/field-visits';

const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);

export default function CoverageMap({ zones }: { zones: CoverageZone[] }) {
  const brand = useBrandColors();
  const { territory } = useOrgTerritory();
  const placed = zones.filter((zone) => zone.lat != null && zone.lng != null && zone.localityId != null);
  const max = placed.length > 0 ? Math.max(...placed.map((zone) => zone.total)) : 0;

  const bubbles: MapBubble[] = placed.map((zone) => {
    const relative = max > 0 ? zone.total / max : 0;
    return {
      id: String(zone.localityId),
      title: `${zone.name}: ${number(zone.total)} visitas`,
      lat: Number(zone.lat),
      lng: Number(zone.lng),
      radius: 8 + relative * 28,
      color: brand.primary,
      fillOpacity: 0.3 + relative * 0.4,
    };
  });

  return (
    <DataMap
      center={territory.center}
      zoom={territory.scope === 'MUNICIPALITY' ? 12 : territory.zoom}
      embedded
      bubbles={bubbles}
      renderPopup={(id) => {
        const zone = placed.find((z) => String(z.localityId) === id);
        if (!zone) return null;
        return (
          <div className="space-y-0.5 text-sm">
            <p className="font-bold text-slate-800">{zone.name}</p>
            <p className="text-slate-600">{number(zone.total)} visitas</p>
            <p className="text-slate-600">
              Apoya {number(zone.byResult.SUPPORTS)} · Indeciso {number(zone.byResult.UNDECIDED)} · No apoya{' '}
              {number(zone.byResult.OPPOSES)}
            </p>
          </div>
        );
      }}
    >
      {placed.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-md bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow">
          Ninguna zona visitada tiene un punto en el mapa: mira la tabla.
        </div>
      )}
    </DataMap>
  );
}
