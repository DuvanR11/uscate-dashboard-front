'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GoogleMap, 
  useJsApiLoader, 
  MarkerF, 
  InfoWindowF, 
  HeatmapLayerF
} from '@react-google-maps/api';
import { RequestItem } from '@/types/request';
import api from '@/lib/api';
import { Loader2, AlertTriangle } from 'lucide-react'; 
import { Badge } from "@/components/ui/badge";

// 1. CONSTANTES Y CONFIGURACIÓN
const LIBRARIES = ["visualization"] as "visualization"[]; 
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""; 

const containerStyle = { width: '100%', height: '100%', minHeight: '600px', borderRadius: '0.75rem' };
const defaultCenter = { lat: 4.6097, lng: -74.0817 }; 

const mapOptions = { 
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  styles: [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "on" }] }
  ],
};

export default function GoogleMapView() {
  
  if (!API_KEY) {
      return (
          <div className="flex flex-col items-center justify-center h-[400px] p-6 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive text-center">
              <AlertTriangle className="h-10 w-10 mb-2" />
              <h3 className="font-bold text-lg">Error de Configuración</h3>
              <p className="text-sm">Falta la clave API de Google Maps en .env.local.</p>
          </div>
      );
  }

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const mapRef = useRef<google.maps.Map>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY, 
    libraries: LIBRARIES,
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Pedimos más registros para que el mapa de calor se vea bien (limit=500)
        // Filtramos por SECURITY_APP
        const res = await api.get('/requests', { 
            params: { limit: 500, type: 'SECURITY_APP' } 
        });
        
        const data = res.data.data || []; // Aseguramos que sea array
        
        // Filtramos solo los que tienen coordenadas válidas
        const validCoords = data.filter((r: any) => 
            r.lat && r.lng && !isNaN(Number(r.lat)) && !isNaN(Number(r.lng))
        );
        
        setRequests(validCoords);
      } catch (error) {
        console.error("Error loading map data", error);
      }
    };
    fetchData();
  }, []);

  // Auto-zoom para encuadrar todos los puntos
  useEffect(() => {
    if (mapRef.current && requests.length > 0 && window.google) {
         const bounds = new window.google.maps.LatLngBounds();
         let hasValidPoints = false;

         requests.forEach((req) => {
             if(req.lat && req.lng) {
                 bounds.extend({ lat: Number(req.lat), lng: Number(req.lng) });
                 hasValidPoints = true;
             }
         });
         
         if (hasValidPoints) {
            mapRef.current.fitBounds(bounds);
            // Si solo hay 1 punto, alejamos un poco el zoom para que no sea excesivo
            if (requests.length === 1) {
                mapRef.current.setZoom(15);
            }
         }
    }
  }, [requests, isLoaded]);

  // Generador de Íconos SVG Nativos (Más rápido y nítido que PNGs)
  const getMarkerOptions = (priority: string) => {
    let color = '#1B2541'; // Default (Navy)
    
    switch (priority) {
        case 'CRITICAL': color = '#EF4444'; break; // Red
        case 'HIGH': color = '#F59E0B'; break; // Amber
        case 'MEDIUM': color = '#3B82F6'; break; // Blue
        default: color = '#64748B'; break; // Slate
    }

    if (!window.google) return undefined;

    return {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: color,
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#FFFFFF",
    };
  }

  const heatmapData = React.useMemo(() => {
    if (!window.google || requests.length === 0) return [];
    return requests.map(req => new window.google.maps.LatLng(Number(req.lat), Number(req.lng)));
  }, [requests, isLoaded]);


  if (!isLoaded) return (
    <div className="flex flex-col justify-center items-center h-[600px] border rounded-xl bg-slate-50">
        <Loader2 className="animate-spin h-10 w-10 text-primary mb-2"/>
        <p className="text-muted-foreground text-sm">Cargando cartografía...</p>
    </div>
  );

  return (
    <div className="shadow-lg border border-primary/10 rounded-xl overflow-hidden h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={13}
        onLoad={onLoad}
        options={mapOptions}
      >
        {requests.map((req) => (
          <MarkerF
            key={req.id}
            position={{ lat: Number(req.lat), lng: Number(req.lng) }}
            onClick={() => setSelectedRequest(req)}
            // Usamos opciones de ícono SVG en lugar de URL
            icon={getMarkerOptions(req.priority)} 
          />
        ))}

        {selectedRequest && (
          <InfoWindowF
            position={{ lat: Number(selectedRequest.lat), lng: Number(selectedRequest.lng) }}
            onCloseClick={() => setSelectedRequest(null)}
          >
            {/* Pop-up Personalizado */}
            <div className="min-w-[220px] max-w-[250px] p-1 font-sans">
              <div className="flex items-start gap-2 mb-2">
                 <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                     selectedRequest.priority === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-900'
                 }`} />
                 <h3 className="font-bold text-sm text-[#1B2541] leading-tight">
                    {selectedRequest.subject}
                 </h3>
              </div>
              
              <p className="text-xs text-slate-600 mb-3 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">
                  {selectedRequest.description}
              </p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <Badge variant="outline" className={`text-[10px] px-1.5 h-5 border-0 font-bold ${
                  selectedRequest.priority === 'CRITICAL' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedRequest.priority}
                </Badge>
                
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    {/* TRADUCCIÓN DE ID A NOMBRE */}
                    {selectedRequest.locality 
                        ? selectedRequest.locality.name 
                        : 'Sin zona'
                    }
                </span>
              </div>
            </div>
          </InfoWindowF>
        )}

        {heatmapData.length > 0 && (
            <HeatmapLayerF
              data={heatmapData}
              options={{
                radius: 30, // Aumentado ligeramente para mejor visibilidad
                opacity: 0.6,
              }}
            />
        )}
      </GoogleMap>
    </div>
  );
}