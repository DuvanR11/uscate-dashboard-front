'use client';

import GoogleMapView from "@/components/dashboard/map/google-map-view";
import { Map as MapIcon } from "lucide-react";

export default function MapPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Encabezado Corporativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
             <MapIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Mapa de Seguridad</h2>
            <p className="text-muted-foreground">Geo-referenciación de incidentes y solicitudes reportadas en tiempo real.</p>
          </div>
        </div>
      </div>
      
      {/* Contenedor del Mapa (Ocupando espacio restante si es necesario) */}
      <div className="flex-1 min-h-[600px] relative">
         <GoogleMapView />
      </div>
    </div>
  );
}