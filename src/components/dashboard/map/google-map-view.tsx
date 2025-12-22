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
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'; // Íconos para el popup
import { Badge } from "@/components/ui/badge";

// 1. CONSTANTES ESTÁTICAS
const LIBRARIES = ["visualization"] as "visualization"[]; 
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""; 

// Estilo del contenedor ajustado a variables CSS
const containerStyle = { width: '100%', height: '100%', minHeight: '600px', borderRadius: '0.75rem' }; // radius-xl
const defaultCenter = { lat: 2.9273, lng: -75.2817 }; // Neiva

const mapOptions = { 
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  // Estilo sutil para que destaquen los marcadores
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
       featureType: "administrative",
       elementType: "geometry",
       stylers: [{ visibility: "on" }]
    }
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
        const res = await api.get('/requests');
        const validCoords = res.data.data.filter((r: any) => r.lat && r.lng && r.type === 'SECURITY_APP');
        setRequests(validCoords);
      } catch (error) {
        console.error("Error loading map data", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (mapRef.current && requests.length > 0) {
      if (typeof window.google !== 'undefined' && window.google.maps) {
          const bounds = new window.google.maps.LatLngBounds();
          requests.forEach((req) => bounds.extend({ lat: req.lat!, lng: req.lng! }));
          
          if (requests.length === 1) {
              mapRef.current.setCenter({ lat: requests[0].lat!, lng: requests[0].lng! });
              mapRef.current.setZoom(15); 
          } else {
              mapRef.current.fitBounds(bounds);
          }
      }
    }
  }, [requests]);

  // Colores alineados a la marca (pero Google Maps requiere URLs o Hex simples para íconos default)
  const getMarkerColor = (priority: string) => {
    // Usamos los pines por defecto de Google con colores semánticos
    switch (priority) {
        case 'CRITICAL': return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'; // Rojo Marca
        case 'HIGH': return 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png'; // Amarillo Marca aprox
        default: return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'; // Navy aprox
    }
  }

  const heatmapData = React.useMemo(() => {
    if (!window.google || requests.length === 0) return [];
    return requests.map(req => new window.google.maps.LatLng(req.lat!, req.lng!));
  }, [requests]);


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
            position={{ lat: req.lat!, lng: req.lng! }}
            onClick={() => setSelectedRequest(req)}
            icon={{ url: getMarkerColor(req.priority) }}
          />
        ))}

        {selectedRequest && (
          <InfoWindowF
            position={{ lat: selectedRequest.lat!, lng: selectedRequest.lng! }}
            onCloseClick={() => setSelectedRequest(null)}
          >
            {/* Pop-up Personalizado con Tailwind */}
            <div className="min-w-[220px] max-w-[250px] p-1 font-sans">
              <div className="flex items-start gap-2 mb-2">
                 <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                     selectedRequest.priority === 'CRITICAL' ? 'bg-destructive' : 'bg-primary'
                 }`} />
                 <h3 className="font-bold text-sm text-primary leading-tight">
                    {selectedRequest.subject}
                 </h3>
              </div>
              
              <p className="text-xs text-muted-foreground mb-3 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">
                  {selectedRequest.description}
              </p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <Badge variant="outline" className={`text-[10px] px-1.5 h-5 border-0 font-bold ${
                  selectedRequest.priority === 'CRITICAL' 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-secondary/20 text-yellow-700'
                }`}>
                  {selectedRequest.priority}
                </Badge>
                
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    {selectedRequest.locality || 'Sin zona'}
                </span>
              </div>
            </div>
          </InfoWindowF>
        )}

        {heatmapData.length > 0 && (
            <HeatmapLayerF
              data={heatmapData}
              options={{
                radius: 20,
                opacity: 0.6,
                // Gradiente personalizado (Opcional): Azul -> Amarillo -> Rojo
                gradient: [
                    'rgba(0, 255, 255, 0)',
                    'rgba(0, 255, 255, 1)',
                    'rgba(0, 191, 255, 1)',
                    'rgba(0, 127, 255, 1)',
                    'rgba(0, 63, 255, 1)',
                    'rgba(0, 0, 255, 1)',
                    'rgba(0, 0, 223, 1)',
                    'rgba(0, 0, 191, 1)',
                    'rgba(0, 0, 159, 1)',
                    'rgba(0, 0, 127, 1)',
                    'rgba(63, 0, 91, 1)',
                    'rgba(127, 0, 63, 1)',
                    'rgba(191, 0, 31, 1)',
                    'rgba(255, 0, 0, 1)'
                ]
              }}
            />
        )}
      </GoogleMap>
    </div>
  );
}