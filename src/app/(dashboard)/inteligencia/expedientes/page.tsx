'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, UserSearch, Target, Activity, MapPin, AlertTriangle, Shield, FileText, ArrowLeft, Briefcase, DollarSign, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import ExportPdfButton from '@/components/dashboard/intelligence/ExportPdfButton';

export default function ExpedientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingDossier, setLoadingDossier] = useState(false);
  
  const [topEntities, setTopEntities] = useState<any[]>([]);
  const [dossier, setDossier] = useState<any>(null);

  const [secopData, setSecopData] = useState<any[]>([]);
  const [loadingSecop, setLoadingSecop] = useState(false);

  useEffect(() => {
    fetchTopEntities();
  }, []);

  const fetchTopEntities = async () => {
    try {
      const res = await api.get('/intelligence/entities/top');
      setTopEntities(res.data);
    } catch (error) {
      toast.error("Error al cargar las tendencias de entidades");
    } finally {
      setLoadingTop(false);
    }
  };

  const fetchDossier = async (name: string) => {
    if (!name.trim()) return;
    
    setSearchTerm(name);
    setLoadingDossier(true);
    setLoadingSecop(true);
    setDossier(null);
    setSecopData([]);

    try {
      // 1. Buscar en tu base de datos de Inteligencia
      const res = await api.get(`/intelligence/dossier?name=${encodeURIComponent(name)}`);
      if (res.data.success) {
        setDossier(res.data.profile);
      } else {
        toast.info(res.data.message);
      }

      // 2. Buscar en SECOP II simultáneamente
      const secopRes = await api.get(`/intelligence/secop/search?name=${encodeURIComponent(name)}`);
      setSecopData(secopRes.data);

    } catch (error) {
      toast.error("Error al generar el expediente.");
    } finally {
      setLoadingDossier(false);
      setLoadingSecop(false);
    }
  };

  const clearDossier = () => {
    setDossier(null);
    setSearchTerm('');
  };

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <UserSearch className="text-[#FFC400]" /> Expedientes Inteligentes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Perfilamiento automático de actores y entidades.</p>
        </div>
        
        <Link href="/inteligencia">
          <Button variant="outline" className="border-[#1B2541] text-[#1B2541] hover:bg-slate-200 gap-2">
            <ArrowLeft size={16} /> Volver al Mapa
          </Button>
        </Link>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <Card className="mb-6 shadow-sm border-0">
        <CardContent className="p-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Buscar nombre de funcionario, organización, banda criminal..."
              className="pl-10 h-12 text-lg bg-slate-50 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchDossier(searchTerm)}
            />
          </div>
          <Button 
            onClick={() => fetchDossier(searchTerm)}
            className="h-12 px-8 bg-[#1B2541] hover:bg-slate-800 text-white font-bold"
          >
            Investigar
          </Button>
        </CardContent>
      </Card>

      {/* ESTADO 1: CARGANDO DOSSIER */}
      {loadingDossier && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 size={48} className="animate-spin text-[#FFC400] mb-4" />
          <p className="font-bold">Cruzando bases de datos y consolidando información...</p>
        </div>
      )}

      {/* ESTADO 2: EXPEDIENTE CARGADO */}
      {!loadingDossier && dossier && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-2">
              <FileText className="text-blue-600"/> Dossier: {dossier.name}
            </h2>
            
            {/* BOTONERA DE ACCIÓN DEL DOSSIER */}
            <div className="flex flex-wrap items-center gap-2">
              <ExportPdfButton 
                targetId="reporte-expediente" 
                fileName={`Expediente_${dossier.name.replace(/\s+/g, '_')}`} 
              />
              <Button variant="ghost" onClick={clearDossier} className="text-slate-500 hover:bg-slate-200">Cerrar Expediente</Button>
            </div>
          </div>

          {/* CONTENEDOR EXPORTABLE (Todo lo que esté aquí saldrá en el PDF) */}
          <div id="reporte-expediente" className="space-y-6 bg-slate-100 p-2 -m-2 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Métricas Rápidas */}
              <Card className="bg-[#1B2541] text-white border-0 shadow-md">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-white/10 rounded-full"><Target size={32} className="text-[#FFC400]"/></div>
                  <div>
                    <p className="text-xs text-slate-300 uppercase font-bold tracking-wider">Apariciones Totales</p>
                    <p className="text-4xl font-black">{dossier.totalMentions}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${dossier.riskLevel === 'CRÍTICO' ? 'bg-red-600' : dossier.riskLevel === 'MODERADO' ? 'bg-yellow-500' : 'bg-green-600'} text-white border-0 shadow-md`}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-white/20 rounded-full"><AlertTriangle size={32} /></div>
                  <div>
                    <p className="text-xs text-white/80 uppercase font-bold tracking-wider">Nivel de Riesgo / Impacto</p>
                    <p className="text-4xl font-black">{dossier.averageImpact} <span className="text-lg">/ 10</span></p>
                    <p className="text-[10px] uppercase font-black tracking-widest">{dossier.riskLevel}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1"><MapPin size={14}/> Zonas de Operación / Mención</p>
                  <div className="flex flex-wrap gap-1">
                    {dossier.stats.operatingZones.slice(0, 5).map((zone: string, i: number) => (
                      <span key={i} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">
                        {zone}
                      </span>
                    ))}
                    {dossier.stats.operatingZones.length > 5 && <span className="text-xs text-slate-400 font-bold ml-1">+{dossier.stats.operatingZones.length - 5} más</span>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Actividad Reciente y SECOP (Columna Izquierda) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Tarjeta de Movimientos Reportados */}
                <Card className="shadow-sm border-0">
                  <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
                    <CardTitle className="text-base text-[#1B2541] flex items-center gap-2"><Activity size={18}/> Últimos Movimientos Reportados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {dossier.recentActivity.map((ev: any) => (
                        <div key={ev.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{ev.CATEGORY}</span>
                            <span className="text-[10px] text-slate-400">{new Date(ev.EVENT_DATE).toLocaleDateString('es-CO')}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-800 mb-1">{ev.TITLE}</h4>
                          <p className="text-xs text-slate-500 mb-2">{ev.SUMMARY}</p>
                          <div className="flex gap-2">
                            {ev.ENTITIES.filter((e:string) => e !== dossier.name).slice(0,3).map((ent:string, idx:number) => (
                              <span key={idx} className="text-[9px] text-slate-400 border border-slate-200 px-1 rounded">Vínculo: {ent}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* TARJETA CAZADOR DE CONTRATOS SECOP II */}
                <Card className="shadow-sm border-0 border-t-4 border-t-[#FFC400]">
                  <CardHeader className="bg-white border-b pb-4 rounded-t-xl flex flex-row justify-between items-center">
                    <CardTitle className="text-base text-[#1B2541] flex items-center gap-2">
                      <Briefcase size={18} className="text-[#FFC400]"/> Auditoría de Contratación (SECOP II)
                    </CardTitle>
                    {loadingSecop && <Loader2 size={16} className="animate-spin text-slate-400" />}
                  </CardHeader>
                  <CardContent className="p-0">
                    {!loadingSecop && secopData.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No se encontraron contratos adjudicados bajo este nombre exacto en SECOP II.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar bg-slate-50">
                        {secopData.map((contrato: any) => (
                          <div key={contrato.id} className="p-4 hover:bg-white transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold text-white uppercase bg-[#1B2541] px-2 py-0.5 rounded">
                                {contrato.modalidad}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${contrato.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                                {contrato.estado}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1 text-[#1B2541]">
                              <DollarSign size={16} className="text-green-600" />
                              <span className="font-black text-lg">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(contrato.valor)}
                              </span>
                            </div>
                            
                            <h4 className="font-bold text-xs text-slate-600 mb-2">{contrato.entidad} ({contrato.departamento})</h4>
                            <p className="text-xs text-slate-500 mb-3 line-clamp-3">{contrato.objeto}</p>
                            
                            <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-3">
                              <span className="text-[10px] text-slate-400 font-mono">Firma: {contrato.fecha ? new Date(contrato.fecha).toLocaleDateString('es-CO') : 'N/A'}</span>
                              {contrato.url && (
                                <a 
                                  href={contrato.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
                                >
                                  Ver en SECOP <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>

              {/* Análisis de Sentimiento y Categorías (Derecha) */}
              <div className="space-y-6">
                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Tipología de Eventos</CardTitle></CardHeader>
                  <CardContent>
                    {Object.entries(dossier.stats.categories).map(([cat, count]: any) => (
                      <div key={cat} className="mb-2">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-600">{cat}</span>
                          <span className="text-[#1B2541]">{count}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#1B2541] h-full" style={{ width: `${(count / dossier.totalMentions) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Sentimiento Público</CardTitle></CardHeader>
                  <CardContent className="flex justify-between text-center">
                    <div>
                      <p className="text-xl font-black text-red-500">{dossier.stats.sentiments.NEGATIVO || 0}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Negativo</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-400">{dossier.stats.sentiments.NEUTRAL || 0}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Neutral</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-green-500">{dossier.stats.sentiments.POSITIVO || 0}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Positivo</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ESTADO 3: INICIO (Mostrar Top Entidades) */}
      {!loadingDossier && !dossier && (
        <Card className="shadow-sm border-0">
          <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
            <CardTitle className="text-base text-[#1B2541] flex items-center gap-2">
              <Shield size={18}/> Actores Más Relevantes en el Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loadingTop ? (
              <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2"/> Cargando radar...</div>
            ) : topEntities.length === 0 ? (
              <div className="py-10 text-center text-slate-400">No hay entidades suficientes en la base de datos aún.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topEntities.map((entity, idx) => (
                  <button 
                    key={idx}
                    onClick={() => fetchDossier(entity.name)}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:border-[#1B2541] hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg transition-all text-sm text-left group"
                  >
                    <span className="font-bold text-[#1B2541] group-hover:text-blue-600">{entity.name}</span>
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-mono">
                      {entity.count} eventos
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}