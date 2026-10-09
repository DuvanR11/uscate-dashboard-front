'use client';

import React from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/lib/google-maps';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem'
};

interface LocationMapProps {
  lat: number;
  lng: number;
}

export default function LocationMap({ lat, lng }: LocationMapProps) {
  const { isLoaded } = useGoogleMaps();

  const center = {
    lat: lat,
    lng: lng
  };

  if (!isLoaded) {
    return (
      <div className="h-[300px] w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 rounded-lg">
        Cargando Google Maps...
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full rounded-lg overflow-hidden border border-slate-200">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        <Marker position={center} />
      </GoogleMap>
    </div>
  );
}