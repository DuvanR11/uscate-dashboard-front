'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Search,
  UserSearch,
  Target,
  Activity,
  MapPin,
  AlertTriangle,
  Shield,
  FileText,
  ArrowLeft,
  Briefcase,
  DollarSign,
  ExternalLink,
  Network,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import ExportPdfButton from '@/components/dashboard/intelligence/ExportPdfButton';
import InvestigationGraph from '@/components/dashboard/intelligence/InvestigationGraph';

export default function ExpedientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [investigation, setInvestigation] = useState<any>(null);

  const fetchInvestigation = async (name: string) => {
    if (!name.trim()) return;

    setSearchTerm(name);
    setLoading(true);
    setInvestigation(null);

    try {
      const res = await api.get(
        `/investigation/search?q=${encodeURIComponent(name)}`,
      );

      setInvestigation(res.data);

      toast.success('Investigación generada correctamente');
    } catch (error) {
      toast.error('Error al generar la investigación');
    } finally {
      setLoading(false);
    }
  };

  const clearInvestigation = () => {
    setInvestigation(null);
    setSearchTerm('');
  };

  const secopRecords =
    investigation?.sources?.SECOP?.records || [];

  const newsRecords =
    investigation?.sources?.NEWS?.records || [];

  const policeRecords =
    investigation?.sources?.POLICIA?.records || [];

  const timelineEvents =
    investigation?.timeline?.events || [];

  const risk =
    investigation?.risk;


  const mergeById = (items: any[]) => {
    return Array.from(new Map(items.map((item) => [item.id, item])).values());
  };

  const mergeLinks = (items: any[]) => {
    return Array.from(
      new Map(
        items.map((item) => [
          `${item.source}-${item.target}-${item.type}`,
          item,
        ]),
      ).values(),
    );
  };

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <UserSearch className="text-[#FFC400]" />
            Expedientes Inteligentes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Investigación OSINT con SECOP, noticias, datos abiertos, grafo, riesgo y timeline.
          </p>
        </div>

        <Link href="/inteligencia">
          <Button
            variant="outline"
            className="border-[#1B2541] text-[#1B2541] hover:bg-slate-200 gap-2"
          >
            <ArrowLeft size={16} />
            Volver al Mapa
          </Button>
        </Link>
      </div>

      <Card className="mb-6 shadow-sm border-0">
        <CardContent className="p-4 flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <Input
              placeholder="Buscar persona, empresa, entidad pública, proveedor..."
              className="pl-10 h-12 text-lg bg-slate-50 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && fetchInvestigation(searchTerm)
              }
            />
          </div>

          <Button
            onClick={() => fetchInvestigation(searchTerm)}
            disabled={loading}
            className="h-12 px-8 bg-[#1B2541] hover:bg-slate-800 text-white font-bold"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              'Investigar'
            )}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 size={48} className="animate-spin text-[#FFC400] mb-4" />
          <p className="font-bold">
            Cruzando SECOP, noticias, datos abiertos y construyendo grafo...
          </p>
        </div>
      )}

      {!loading && investigation && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-2">
              <FileText className="text-blue-600" />
              Investigación: {investigation.query}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <ExportPdfButton
                targetId="reporte-expediente"
                fileName={`Investigacion_${investigation.query.replace(/\s+/g, '_')}`}
              />
              <Button
                variant="ghost"
                onClick={clearInvestigation}
                className="text-slate-500 hover:bg-slate-200"
              >
                Cerrar
              </Button>
            </div>
          </div>

          <div
            id="reporte-expediente"
            className="space-y-6 bg-slate-100 p-2 -m-2 rounded-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-[#1B2541] text-white border-0 shadow-md">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-white/10 rounded-full">
                    <Target size={32} className="text-[#FFC400]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 uppercase font-bold tracking-wider">
                      Nodos
                    </p>
                    <p className="text-4xl font-black">
                      {investigation.summary?.totalNodes || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-slate-100 rounded-full">
                    <Network size={32} className="text-[#1B2541]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                      Relaciones
                    </p>
                    <p className="text-4xl font-black text-[#1B2541]">
                      {investigation.summary?.totalLinks || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${
                  risk?.level === 'CRITICAL'
                    ? 'bg-red-700'
                    : risk?.level === 'HIGH'
                      ? 'bg-red-600'
                      : risk?.level === 'MEDIUM'
                        ? 'bg-yellow-500'
                        : 'bg-green-600'
                } text-white border-0 shadow-md`}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-white/20 rounded-full">
                    <AlertTriangle size={32} />
                  </div>
                  <div>
                    <p className="text-xs text-white/80 uppercase font-bold tracking-wider">
                      Riesgo
                    </p>
                    <p className="text-4xl font-black">
                      {risk?.score ?? 0}
                      <span className="text-lg"> / 10</span>
                    </p>
                    <p className="text-[10px] uppercase font-black tracking-widest">
                      {risk?.level || 'LOW'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
                    <Shield size={14} />
                    Fuentes
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>SECOP: {investigation.summary?.sources?.secop || 0}</span>
                    <span>News: {investigation.summary?.sources?.news || 0}</span>
                    <span>Policía: {investigation.summary?.sources?.police || 0}</span>
                    <span>OpenData: {investigation.summary?.sources?.openData || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {risk?.summary && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-[#1B2541] flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Análisis de riesgo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">
                    {risk.summary}
                  </p>

                  <div className="space-y-2">
                    {risk.factors?.slice(0, 6).map((factor: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-bold text-[#1B2541]">
                            {factor.category}
                          </span>
                          <span className="text-xs font-bold text-red-600">
                            +{factor.score}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {factor.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}


            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-[#1B2541] flex items-center gap-2">
                  <Network size={18} />
                  Grafo de relaciones
                </CardTitle>
              </CardHeader>

              <CardContent>
                <InvestigationGraph
                  graph={investigation.graph}
                  timeline={investigation.timeline}
                  onExpand={(expanded) => {
                    setInvestigation((prev: any) => ({
                      ...prev,
                      graph: {
                        nodes: mergeById([
                          ...(prev.graph?.nodes || []),
                          ...(expanded.graph?.nodes || []),
                        ]),
                        links: mergeLinks([
                          ...(prev.graph?.links || []),
                          ...(expanded.graph?.links || []),
                        ]),
                      },
                      timeline: {
                        events: mergeById([
                          ...(prev.timeline?.events || []),
                          ...(expanded.timeline?.events || []),
                        ]),
                      },
                    }));

                    toast.success('Investigación expandida correctamente');
                  }}
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-sm border-0 border-t-4 border-t-[#FFC400]">
                  <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
                    <CardTitle className="text-base text-[#1B2541] flex items-center gap-2">
                      <Briefcase size={18} className="text-[#FFC400]" />
                      Auditoría SECOP
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    {secopRecords.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No se encontraron registros SECOP.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto bg-slate-50">
                        {secopRecords.slice(0, 50).map((record: any, idx: number) => {
                          const valor = Number(
                            record.valor_del_contrato ||
                              record.precio_base ||
                              record.valor_estimado ||
                              0,
                          );

                          const entidad =
                            record.nombre_entidad ||
                            record.entidad ||
                            'Entidad no disponible';

                          const objeto =
                            record.descripcion_del_proceso ||
                            record.objeto_del_contrato ||
                            record.nom_del_proceso ||
                            record.nombre_del_procedimiento ||
                            'Sin descripción';

                          const modalidad =
                            record.modalidad_de_contratacion ||
                            record.modalidad_de_seleccion ||
                            'Modalidad N/A';

                          const estado =
                            record.estado_contrato ||
                            record.estado_del_procedimiento ||
                            record.estado_resumen ||
                            'Estado N/A';

                          const fecha =
                            record.fecha_de_firma ||
                            record.fecha_de_publicacion_del_proceso ||
                            record.fecha_de_publicacion;

                          const url =
                            typeof record.urlproceso === 'object'
                              ? record.urlproceso?.url
                              : record.urlproceso;

                          return (
                            <div
                              key={idx}
                              className="p-4 hover:bg-white transition-colors"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-white uppercase bg-[#1B2541] px-2 py-0.5 rounded">
                                  {modalidad}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                  {estado}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mb-1 text-[#1B2541]">
                                <DollarSign size={16} className="text-green-600" />
                                <span className="font-black text-lg">
                                  {new Intl.NumberFormat('es-CO', {
                                    style: 'currency',
                                    currency: 'COP',
                                    maximumFractionDigits: 0,
                                  }).format(valor)}
                                </span>
                              </div>

                              <h4 className="font-bold text-xs text-slate-600 mb-2">
                                {entidad}
                              </h4>

                              <p className="text-xs text-slate-500 mb-3 line-clamp-3">
                                {objeto}
                              </p>

                              <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-3">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Fecha:{' '}
                                  {fecha
                                    ? new Date(fecha).toLocaleDateString('es-CO')
                                    : 'N/A'}
                                </span>

                                {url && (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
                                  >
                                    Ver fuente <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
                    <CardTitle className="text-base text-[#1B2541] flex items-center gap-2">
                      <Clock size={18} />
                      Línea de tiempo
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    {timelineEvents.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No hay eventos con fecha para construir timeline.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                        {timelineEvents.slice(0, 30).map((ev: any) => (
                          <div key={ev.id} className="p-4 hover:bg-slate-50">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">
                                {ev.source} / {ev.type}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(ev.date).toLocaleDateString('es-CO')}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-800 mb-1">
                              {ev.title}
                            </h4>
                            {ev.description && (
                              <p className="text-xs text-slate-500">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Resumen de grafo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Nodos</span>
                      <strong>{investigation.graph?.nodes?.length || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Relaciones</span>
                      <strong>{investigation.graph?.links?.length || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeline</span>
                      <strong>{timelineEvents.length}</strong>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Noticias
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {newsRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin noticias relacionadas.
                      </p>
                    ) : (
                      newsRecords.slice(0, 5).map((n: any, idx: number) => (
                        <a
                          key={idx}
                          href={n.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs border-b pb-2 hover:text-blue-600"
                        >
                          <strong>{n.title}</strong>
                          <p className="text-slate-400">{n.source}</p>
                        </a>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Registros Policía / Datos Abiertos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-slate-500">
                      Policía: <strong>{policeRecords.length}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      Datos abiertos:{' '}
                      <strong>
                        {investigation.sources?.DATOS_ABIERTOS?.records?.length || 0}
                      </strong>
                    </p>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </div>
      )}

      {!loading && !investigation && (
        <Card className="shadow-sm border-0">
          <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
            <CardTitle className="text-base text-[#1B2541] flex items-center gap-2">
              <Shield size={18} />
              Módulo de Investigación OSINT
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8 text-center text-slate-500">
            Busca una persona, empresa o entidad para generar un expediente con
            grafo, riesgo, timeline y fuentes.
          </CardContent>
        </Card>
      )}
    </div>
  );
}