'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Map, Shield, Brain, TrendingDown, Loader2, AlertCircle, RefreshCw, PenTool } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// El mapa debe cargarse dinámicamente en Next.js
const PredictiveMap = dynamic(() => import('@/components/dashboard/intelligence/PredictiveMap'), { 
  ssr: false, 
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" /></div>
});

export default function IntelligenceDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('TODOS');
  const [syncingOfficial, setSyncingOfficial] = useState(false);

  // Cargar datos reales del Backend
  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      const res = await api.get('/intelligence/heatmap');
      setEvents(res.data);
    } catch (error) {
      toast.error("Error al cargar los datos de inteligencia");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, []);

  // Botón mágico para forzar al Cron Job a buscar noticias YA MISMO
  const handleManualSync = async () => {
    setSyncing(true);
    toast.info("Rastreando noticias en Bogotá y Cundinamarca...");
    try {
      await api.post('/intelligence/sync');
      toast.success("¡Base de datos actualizada con las últimas noticias!");
      fetchIntelligence(); // Recargar el mapa con los nuevos datos
    } catch (error) {
      toast.error("Error al sincronizar fuentes");
    } finally {
      setSyncing(false);
    }
  };

  // NUEVA FUNCIÓN: Llama a datos.gov.co
  const handleOfficialSync = async () => {
    setSyncingOfficial(true);
    toast.info("Conectando con datos.gov.co (Policía Nacional)...");
    try {
      const res = await api.post('/intelligence/sync/official');
      toast.success(`¡Sincronización exitosa! ${res.data.imported} reportes oficiales añadidos.`);
      fetchIntelligence(); // Recargar el mapa para ver los puntos nuevos
    } catch (error) {
      toast.error("Error al sincronizar datos oficiales");
    } finally {
      setSyncingOfficial(false);
    }
  };

  const filteredEvents = filter === 'TODOS' ? events : events.filter(e => e.CATEGORY === filter);

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <Search className="text-[#FFC400]" /> Inteligencia Territorial
          </h1>
          <p className="text-slate-500 text-sm mt-1">Monitoreo predictivo: Bogotá & Cundinamarca.</p>
        </div>
        
        {/* BOTONES DE ACCIÓN SUPERIOR */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          
          {/* Botón 1: Noticias IA */}
          <Button 
            onClick={handleManualSync} 
            disabled={syncing || syncingOfficial}
            variant="outline" 
            className="border-slate-300 text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw size={16} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} /> 
            {syncing ? 'Rastreando IA...' : 'Leer Noticias'}
          </Button>

          {/* Botón 2: Datos Oficiales Policía (NUEVO) */}
          <Button 
            onClick={handleOfficialSync} 
            disabled={syncing || syncingOfficial}
            variant="outline" 
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Shield size={16} className={`mr-2 ${syncingOfficial ? 'animate-pulse' : ''}`} /> 
            {syncingOfficial ? 'Descargando...' : 'Datos Oficiales (Policía)'}
          </Button>

          {/* Botón 3: Ir a Plenarias */}
          <Link href="/plenarias">
            <Button className="bg-[#1B2541] hover:bg-slate-800 text-white shadow-md">
              <PenTool size={16} className="mr-2 text-[#FFC400]" /> 
              Redactar Plenaria
            </Button>
          </Link>
        </div>        
      </div>

      {/* FILTROS RÁPIDOS */}
      <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto w-full mb-4 shrink-0">
          <Button variant={filter === 'TODOS' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('TODOS')} className={filter === 'TODOS' ? 'bg-[#1B2541]' : ''}>Todos</Button>
          <Button variant={filter === 'SEGURIDAD' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('SEGURIDAD')} className={`gap-2 ${filter === 'SEGURIDAD' ? 'bg-red-600 hover:bg-red-700' : 'text-slate-500'}`}><Shield size={14}/> Seguridad</Button>
          <Button variant={filter === 'SALUD_MENTAL' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('SALUD_MENTAL')} className={`gap-2 ${filter === 'SALUD_MENTAL' ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-500'}`}><Brain size={14}/> Salud Mental</Button>
          <Button variant={filter === 'POBREZA' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('POBREZA')} className={`gap-2 ${filter === 'POBREZA' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'text-slate-500'}`}><TrendingDown size={14}/> Pobreza</Button>
      </div>

      {/* ÁREA PRINCIPAL: MAPA + PANEL LATERAL */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* MAPA */}
        <div className="w-full lg:w-2/3 h-[50vh] lg:h-full relative rounded-xl shadow-lg bg-white">
          <PredictiveMap events={filteredEvents} />
        </div>

        {/* FEED DE NOTICIAS */}
        <Card className="w-full lg:w-1/3 flex flex-col shadow-lg border-0 h-[50vh] lg:h-full">
          <CardHeader className="bg-[#1B2541] text-white rounded-t-xl py-4 shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle size={16} className="text-[#FFC400]" /> 
              Alertas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
            {loading || syncing ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <Loader2 className="animate-spin mb-4" size={32}/> 
                {syncing ? 'La IA está leyendo y clasificando las noticias...' : 'Cargando inteligencia...'}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No hay alertas en esta categoría. Haz clic en "Sincronizar Noticias".
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-4 hover:bg-slate-50 transition-colors border-l-4 border-transparent hover:border-[#FFC400]">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        event.CATEGORY === 'SEGURIDAD' ? 'bg-red-100 text-red-700' : 
                        event.CATEGORY === 'SALUD_MENTAL' ? 'bg-blue-100 text-blue-700' : 
                        event.CATEGORY === 'PROPIEDAD_HORIZONTAL' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {event.CATEGORY.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Impacto: {event.IMPACT_SCORE}/10</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#1B2541] leading-snug mb-1">{event.TITLE}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                      <Map size={12} /> {event.LOCATION_NAME}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}