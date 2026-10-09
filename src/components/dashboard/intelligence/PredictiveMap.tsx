'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Activity, ExternalLink, Mic, Layers } from 'lucide-react';
import type { IntelligenceHeatmapEvent } from '@/types/intelligence';
import { useOrgTerritory } from '@/hooks/use-org-territory';
import { regionalZoom } from '@/lib/api/territory';
import { DataMap, type MapBubble } from '@/components/dashboard/map/data-map';

interface PredictiveMapProps {
  events: IntelligenceHeatmapEvent[];
}

const getColor = (category: string) => {
  switch (category) {
    case 'SEGURIDAD': return '#ef4444';
    case 'SALUD_MENTAL': return '#3b82f6';
    case 'PROPIEDAD_HORIZONTAL': return '#8b5cf6';
    case 'POBREZA': return '#eab308';
    default: return '#64748b';
  }
};

// Sobre Google Maps desde el 2026-10-09 (`DataMap`).
export default function PredictiveMap({ events }: PredictiveMapProps) {
  const router = useRouter();
  // Fase 3: el mapa abre en el territorio de la organización, no en Bogotá.
  const { territory } = useOrgTerritory();
  const zoom = regionalZoom(territory);

  const handleSendToPlenary = (event: IntelligenceHeatmapEvent) => {
    const prefillStance = `Basado en el evento reportado en ${event.LOCATION_NAME} sobre "${event.TITLE}": \n\nMi postura frente a esto es...`;
    const params = new URLSearchParams({
      topic: event.CATEGORY,
      stance: prefillStance
    });
    router.push(`/inteligencia/plenarias?${params.toString()}`);
  };

  // --- AGRUPACIÓN (CLUSTERING) ---
  // Cada grupo queda ordenado de mayor a menor impacto: el primero es el
  // "principal" y da el color del círculo.
  const groupedEvents = useMemo(() => {
    const groups: Record<string, IntelligenceHeatmapEvent[]> = {};

    events.forEach(event => {
      if (!event.LATITUDE || !event.LONGITUDE) return;
      // Redondeamos a 3 decimales para agrupar puntos que están a pocos metros de diferencia
      const key = `${event.LATITUDE.toFixed(3)},${event.LONGITUDE.toFixed(3)}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
    });

    return Object.entries(groups).map(([key, group]) => ({
      key,
      events: [...group].sort((a, b) => (b.IMPACT_SCORE ?? 0) - (a.IMPACT_SCORE ?? 0)),
    }));
  }, [events]);
  // -----------------------------------------------

  const bubbles: MapBubble[] = groupedEvents.map(({ key, events: group }) => {
    const mainEvent = group[0];
    const isCluster = group.length > 1;
    const color = getColor(mainEvent.CATEGORY);
    return {
      id: key,
      title: isCluster ? `${group.length} eventos en ${mainEvent.LOCATION_NAME}` : mainEvent.TITLE,
      // `groupedEvents` ya descartó todo lo que no tuviera coordenadas reales.
      lat: Number(mainEvent.LATITUDE),
      lng: Number(mainEvent.LONGITUDE),
      // Si hay más de un evento, el círculo es un poco más grande para indicar volumen
      radius: Math.max(10, (mainEvent.IMPACT_SCORE ?? 0) * 3) + (isCluster ? 6 : 0),
      color,
      fillOpacity: isCluster ? 0.7 : 0.5, // Más oscuro si hay varios
      weight: isCluster ? 3 : 2,
    };
  });

  return (
    <DataMap
      center={territory.center}
      zoom={zoom}
      bubbles={bubbles}
      renderPopup={(id) => {
        const group = groupedEvents.find((item) => item.key === id)?.events;
        if (!group) return null;
        const isCluster = group.length > 1;
        return (
          // Contenedor con Scroll para múltiples noticias
          <div className="p-1 min-w-[260px] max-w-[300px] max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">

            {isCluster && (
              <div className="sticky top-0 bg-white z-10 border-b border-slate-200 pb-2 mb-3 flex items-center gap-2 text-primary">
                <Layers size={16} className="text-secondary" />
                <span className="text-xs font-black uppercase tracking-wider">
                  {group.length} Eventos en esta zona
                </span>
              </div>
            )}

            <div className="space-y-4">
              {group.map((event) => (
                <div key={event.id} className={`pb-4 ${isCluster ? 'border-b border-slate-100 last:border-0 last:pb-0' : ''}`}>

                  {/* Cabecera de la noticia */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1.5">
                      {event.CATEGORY === 'SEGURIDAD' ? <ShieldAlert size={14} color={getColor(event.CATEGORY)}/> : <Activity size={14} color={getColor(event.CATEGORY)}/>}
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: getColor(event.CATEGORY) }}>
                        {event.CATEGORY.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px] font-mono">
                      Impacto: {event.IMPACT_SCORE}/10
                    </span>
                  </div>

                  {/* Contenido (Noticia) */}
                  <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{event.TITLE}</h3>
                  <p className="text-xs text-slate-500 mb-2 font-medium">{event.LOCATION_NAME}</p>

                  <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 mb-3 leading-relaxed border border-slate-100">
                    {event.SUMMARY}
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex flex-col gap-2">
                    {event.SOURCE_URL && (
                      <a
                        href={event.SOURCE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 text-xs py-1.5 rounded transition-colors"
                      >
                        <ExternalLink size={12} /> Leer Fuente
                      </a>
                    )}

                    <button
                      onClick={() => handleSendToPlenary(event)}
                      className="flex items-center justify-center gap-1 w-full bg-primary text-white hover:bg-primary/90 text-xs py-1.5 font-bold rounded transition-colors shadow-sm"
                    >
                      <Mic size={12} className="text-secondary" /> Usar en Plenaria
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        );
      }}
    />
  );
}
