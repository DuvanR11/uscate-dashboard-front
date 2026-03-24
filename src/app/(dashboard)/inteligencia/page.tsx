'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Map, Shield, Brain, TrendingDown, Loader2, AlertCircle, BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import Link from 'next/link';

// Importación dinámica obligatoria para Leaflet en Next.js
const PredictiveMap = dynamic(() => import('@/components/dashboard/intelligence/PredictiveMap'), { 
  ssr: false, 
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" /></div>
});

export default function IntelligenceDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('TODOS');

    // LLAMADA REAL A TU BACKEND
    useEffect(() => {
      const fetchIntelligence = async () => {
        try {
          // Asegúrate de tener este endpoint expuesto en el Controller de NestJS
          // que devuelva: this.intelligenceService.getEventsForHeatmap()
          const res = await api.get('/intelligence/heatmap'); 
          setEvents(res.data);
        } catch (error) {
          toast.error("Error al cargar inteligencia predictiva");
        } finally {
          setLoading(false);
        }
      };

      fetchIntelligence();
    }, []);

  const filteredEvents = filter === 'TODOS' ? events : events.filter(e => e.CATEGORY === filter);

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <Search className="text-[#FFC400]" /> IA Predictiva & Averiguaciones
          </h1>
          <p className="text-slate-500 text-sm mt-1">Monitoreo en tiempo real de eventos de interés nacional.</p>
        </div>
        
        {/* FILTROS RÁPIDOS */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto w-full md:w-auto">
          <Button variant={filter === 'TODOS' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('TODOS')} className={filter === 'TODOS' ? 'bg-[#1B2541]' : ''}>Todos</Button>
          <Button variant={filter === 'SEGURIDAD' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('SEGURIDAD')} className={`gap-2 ${filter === 'SEGURIDAD' ? 'bg-red-600 hover:bg-red-700' : 'text-slate-500'}`}><Shield size={14}/> Seguridad</Button>
          <Button variant={filter === 'SALUD_MENTAL' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('SALUD_MENTAL')} className={`gap-2 ${filter === 'SALUD_MENTAL' ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-500'}`}><Brain size={14}/> Salud Mental</Button>
          <Button variant={filter === 'POBREZA' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('POBREZA')} className={`gap-2 ${filter === 'POBREZA' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'text-slate-500'}`}><TrendingDown size={14}/> Pobreza</Button>
        </div>

        <Link href="/inteligencia/plenarias">
            <Button className="bg-[#1B2541] text-white gap-2">
                <BrainCircuit size={16} /> Ir al Redactor de Plenarias
            </Button>
        </Link>
      </div>

      {/* ÁREA PRINCIPAL: MAPA + PANEL LATERAL */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* MAPA (70% de ancho) */}
        <div className="w-full lg:w-2/3 h-[50vh] lg:h-full relative rounded-xl shadow-lg bg-white">
          <PredictiveMap events={filteredEvents} />
          
          {/* Leyenda superpuesta */}
          <div className="absolute bottom-4 right-4 z-[400] bg-white/90 backdrop-blur p-3 rounded-lg border border-slate-200 shadow-lg pointer-events-none">
            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">Capas Activas</h4>
            <div className="flex items-center gap-2 text-xs mb-1"><div className="w-3 h-3 rounded-full bg-red-500 opacity-70"></div> Seguridad</div>
            <div className="flex items-center gap-2 text-xs mb-1"><div className="w-3 h-3 rounded-full bg-blue-500 opacity-70"></div> Salud Mental</div>
            <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-yellow-500 opacity-70"></div> Pobreza</div>
          </div>
        </div>

        {/* FEED DE NOTICIAS / ALERTAS (30% de ancho) */}
        <Card className="w-full lg:w-1/3 flex flex-col shadow-lg border-0 h-[50vh] lg:h-full">
          <CardHeader className="bg-[#1B2541] text-white rounded-t-xl py-4 shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle size={16} className="text-[#FFC400]" /> 
              Alertas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2"/> Analizando fuentes...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No hay alertas en esta categoría.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-transparent hover:border-[#FFC400]">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        event.CATEGORY === 'SEGURIDAD' ? 'bg-red-100 text-red-700' : 
                        event.CATEGORY === 'SALUD_MENTAL' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {event.CATEGORY}
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