'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, ShieldAlert, Activity } from 'lucide-react';

// Coordenadas por defecto (Neiva, Huila como punto de partida estratégico)
const DEFAULT_CENTER: [number, number] = [2.9273, -75.2818];

interface PredictiveMapProps {
  events: any[];
}

export default function PredictiveMap({ events }: PredictiveMapProps) {
  // Función para determinar el color según la categoría o impacto
  const getColor = (category: string) => {
    switch (category) {
      case 'SEGURIDAD': return '#ef4444'; // Rojo
      case 'SALUD_MENTAL': return '#3b82f6'; // Azul
      case 'POBREZA': return '#eab308'; // Amarillo
      default: return '#8b5cf6'; // Morado
    }
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-slate-200 z-0 relative">
      <MapContainer 
        center={DEFAULT_CENTER} 
        zoom={6} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        {/* Capa base del mapa (OpenStreetMap, 100% gratis) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" // Estilo claro y limpio
        />

        {/* Renderizado de eventos como "Puntos de Calor" */}
        {events.map((event) => {
          if (!event.LATITUDE || !event.LONGITUDE) return null;
          
          const color = getColor(event.CATEGORY);
          // El tamaño del radio depende del nivel de impacto (1 a 10)
          const radius = Math.max(10, event.IMPACT_SCORE * 3);

          return (
            <CircleMarker
              key={event.id}
              center={[event.LATITUDE, event.LONGITUDE]}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.5,
                weight: 2,
              }}
              radius={radius}
            >
              <Popup className="rounded-lg">
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2 border-b pb-2">
                    {event.CATEGORY === 'SEGURIDAD' ? <ShieldAlert size={16} color={color}/> : <Activity size={16} color={color}/>}
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                      {event.CATEGORY}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{event.TITLE}</h3>
                  <p className="text-xs text-slate-500 mb-2">{event.LOCATION_NAME}</p>
                  <div className="bg-slate-50 p-2 rounded text-[10px] text-slate-600 font-mono">
                    Impacto Predictivo: {event.IMPACT_SCORE}/10
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}