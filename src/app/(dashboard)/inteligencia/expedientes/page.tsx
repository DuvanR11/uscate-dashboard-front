'use client';

import React, { useEffect, useState } from 'react';
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
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import ExportPdfButton from '@/components/dashboard/intelligence/ExportPdfButton';
import InvestigationGraph from '@/components/dashboard/intelligence/InvestigationGraph';
import AttachToCaseDialog from '@/components/dashboard/osint/AttachToCaseDialog';
import RecentInvestigationsList, {
  riskLevelFromScore,
  type RecentInvestigation,
} from '@/components/dashboard/intelligence/RecentInvestigationsList';

export default function ExpedientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [investigation, setInvestigation] = useState<any>(null);
  // Plan "OSINT Profesional" (2026-09-02), Fase 6 — progreso real en vivo:
  // la búsqueda ahora corre como job en segundo plano (no atada a la
  // fuente más lenta de las 12 conectadas), con polling real de su estado.
  const [searchProgress, setSearchProgress] = useState<{ completed: number; total: number; currentSource: string } | null>(null);

  // Plan de Mejora OSINT, Fase 6 — decisión de producto confirmada con el
  // usuario: `/investigation/recent`/`/:id` ya no quedan sin ningún
  // consumidor. Reabrir una lee lo que realmente se persiste (grafo +
  // score + conteos) — nunca los registros crudos por fuente ni el
  // timeline detallado, que no se guardan (ver el banner "archivado" en
  // el detalle de abajo).
  const [recentInvestigations, setRecentInvestigations] = useState<RecentInvestigation[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  const fetchRecent = async () => {
    setLoadingRecent(true);
    try {
      const res = await api.get('/investigation/recent?limit=10');
      setRecentInvestigations(res.data?.data || []);
    } catch (error) {
      // Silencioso a propósito: la lista de recientes es una ayuda de
      // navegación, no el flujo principal — un fallo acá no debe tapar la
      // pantalla de búsqueda con un error.
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  // Plan "OSINT Profesional" (2026-09-02), Fase 6 — encola la búsqueda
  // como job real en segundo plano y hace polling real de su estado
  // (progreso real vía `job.updateProgress()`, no simulado por tiempo).
  const pollJobStatus = (jobId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const POLL_INTERVAL_MS = 1200;
      const MAX_ATTEMPTS = 150; // ~3 minutos reales como tope, nunca espera indefinidamente
      let attempts = 0;

      const tick = async () => {
        attempts++;
        try {
          const res = await api.get(`/investigation/search/jobs/${jobId}`);
          const status = res.data?.data;

          if (status?.progress) setSearchProgress(status.progress);

          if (status?.state === 'completed') {
            resolve(status.result);
            return;
          }
          if (status?.state === 'failed') {
            reject(new Error(status.error || 'La investigación falló en segundo plano'));
            return;
          }
          if (attempts >= MAX_ATTEMPTS) {
            reject(new Error('La investigación está tardando demasiado — intenta de nuevo'));
            return;
          }

          setTimeout(tick, POLL_INTERVAL_MS);
        } catch (err) {
          reject(err);
        }
      };

      tick();
    });
  };

  const fetchInvestigation = async (name: string) => {
    if (!name.trim()) return;

    setSearchTerm(name);
    setLoading(true);
    setInvestigation(null);
    setSearchProgress(null);

    try {
      const enqueueRes = await api.post('/investigation/search/jobs', { query: name });
      const jobId = enqueueRes.data?.data?.jobId;
      if (!jobId) throw new Error('No se pudo encolar la investigación');

      const result = await pollJobStatus(jobId);
      setInvestigation(result);

      toast.success('Investigación generada correctamente');
      fetchRecent();
    } catch (error) {
      toast.error('Error al generar la investigación');
    } finally {
      setLoading(false);
      setSearchProgress(null);
    }
  };

  const reopenInvestigation = async (id: string) => {
    setReopeningId(id);
    try {
      const res = await api.get(`/investigation/${id}`);
      const inv = res.data.data;

      // El id real de InvestigationNode va prefijado (`investigationId:originalId`)
      // — el grafo se reconstruye con `originalId`, el mismo espacio de ids
      // que usa una búsqueda en vivo.
      const nodes = (inv.nodes || []).map((n: any) => ({
        id: n.originalId,
        label: n.label,
        type: n.type,
        source: n.source,
        risk: n.risk,
        properties: n.properties,
      }));

      const links = (inv.links || []).map((l: any) => ({
        source: l.sourceNode?.originalId,
        target: l.targetNode?.originalId,
        type: l.type,
        weight: l.weight,
        properties: l.properties,
      }));

      setSearchTerm(inv.query);
      setInvestigation({
        query: inv.query,
        archived: true,
        archivedAt: inv.createdAt,
        archivedBy: inv.user,
        summary: inv.summary,
        risk: {
          score: inv.riskScore ?? 0,
          level: riskLevelFromScore(inv.riskScore),
          factors: [],
          summary: '',
        },
        timeline: { events: [] },
        graph: { nodes, links },
        sources: {},
      });

      toast.success('Investigación archivada abierta');
    } catch (error) {
      toast.error('No se pudo reabrir esa investigación');
    } finally {
      setReopeningId(null);
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

  const procuraduriaRecords =
    investigation?.sources?.PROCURADURIA?.records || [];

  const contraloriaRecords =
    investigation?.sources?.CONTRALORIA?.records || [];

  const supersociedadesRecords =
    investigation?.sources?.SUPERSOCIEDADES?.records || [];

  const sigepRecords =
    investigation?.sources?.SIGEP?.records || [];

  const sicRecords =
    investigation?.sources?.SIC?.records || [];

  const superfinancieraRecords =
    investigation?.sources?.SUPERFINANCIERA?.records || [];

  // Plan "Pilar OSINT" (2026-09-02), Fase A — búsqueda web general.
  const webSearchRecords =
    investigation?.sources?.WEB_SEARCH?.records || [];

  // Plan "OSINT Profesional" (2026-09-02), Fase 3 — WHOIS/DNS + sanciones
  // internacionales.
  const whoisRecords =
    investigation?.sources?.WHOIS?.records || [];

  const intlSanctionsRecords =
    investigation?.sources?.INTL_SANCTIONS?.records || [];

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
          <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight flex items-center gap-2">
            <UserSearch className="text-secondary" />
            Expedientes Inteligentes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Investigación OSINT con SECOP, noticias, Policía, Procuraduría, Contraloría, Supersociedades, SIGEP, SIC, Superfinanciera, búsqueda web, grafo, riesgo y timeline.
          </p>
        </div>

        <Link href="/inteligencia">
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-slate-200 gap-2"
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
            className="h-12 px-8 bg-primary hover:bg-slate-800 text-white font-bold"
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
          <Loader2 size={48} className="animate-spin text-secondary mb-4" />
          <p className="font-bold">
            Cruzando SECOP, noticias, datos abiertos y construyendo grafo...
          </p>
          {/* Plan "OSINT Profesional" (2026-09-02), Fase 6 — progreso real
              en vivo (corre como job en segundo plano, ya no atado a la
              fuente más lenta de las 12 conectadas). */}
          {searchProgress && (
            <div className="w-full max-w-sm mt-4">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all"
                  style={{ width: `${(searchProgress.completed / searchProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-center mt-2 text-slate-400">
                {searchProgress.completed}/{searchProgress.total} fuentes — última: {searchProgress.currentSource}
              </p>
            </div>
          )}
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
            {investigation.archived && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <Archive size={14} className="shrink-0 mt-0.5" />
                <p>
                  Vista archivada
                  {investigation.archivedBy ? ` — buscada por ${investigation.archivedBy.fullName}` : ''}
                  {investigation.archivedAt
                    ? ` el ${new Date(investigation.archivedAt).toLocaleDateString('es-CO')}`
                    : ''}
                  . Solo se conserva el grafo y el score — los registros crudos por fuente y la línea de
                  tiempo detallada no se persisten (se purga a los 90 días). Para verlos completos,
                  repite la búsqueda en vivo.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-primary text-white border-0 shadow-md">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-white/10 rounded-full">
                    <Target size={32} className="text-secondary" />
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
                    <Network size={32} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                      Relaciones
                    </p>
                    <p className="text-4xl font-black text-primary">
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
                    <span>Procuraduría: {investigation.summary?.sources?.procuraduria || 0}</span>
                    <span>Contraloría: {investigation.summary?.sources?.contraloria || 0}</span>
                    <span>Supersociedades: {investigation.summary?.sources?.supersociedades || 0}</span>
                    <span>SIGEP (PEP): {investigation.summary?.sources?.sigep || 0}</span>
                    <span>SIC: {investigation.summary?.sources?.sic || 0}</span>
                    <span>Superfinanciera: {investigation.summary?.sources?.superfinanciera || 0}</span>
                    <span>Búsqueda web: {investigation.summary?.sources?.webSearch || 0}</span>
                    <span>WHOIS/DNS: {investigation.summary?.sources?.whois || 0}</span>
                    <span>Sanciones internacionales: {investigation.summary?.sources?.intlSanctions || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {risk?.summary && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-primary flex items-center gap-2">
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
                          <span className="font-bold text-primary">
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
                <CardTitle className="text-base text-primary flex items-center gap-2">
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
                <Card className="shadow-sm border-0 border-t-4 border-t-secondary">
                  <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
                    <CardTitle className="text-base text-primary flex items-center gap-2">
                      <Briefcase size={18} className="text-secondary" />
                      Auditoría SECOP
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    {secopRecords.length > 0 && (
                      <div className="flex justify-end p-3 border-b bg-white">
                        <AttachToCaseDialog sourceKey="SECOP" sourceLabel="Auditoría SECOP" records={secopRecords} />
                      </div>
                    )}
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
                                <span className="text-[10px] font-bold text-white uppercase bg-primary px-2 py-0.5 rounded">
                                  {modalidad}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                  {estado}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mb-1 text-primary">
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
                    <CardTitle className="text-base text-primary flex items-center gap-2">
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
                    <AttachToCaseDialog sourceKey="NEWS" sourceLabel="Noticias" records={newsRecords} />
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

                {/* Plan "Pilar OSINT" (2026-09-02), Fase A — búsqueda web
                    general. Vacío por diseño hasta que se configuren
                    GOOGLE_CSE_API_KEY/GOOGLE_CSE_CX en el backend (fail-open,
                    no un error real). */}
                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Búsqueda web
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AttachToCaseDialog sourceKey="WEB_SEARCH" sourceLabel="Búsqueda web" records={webSearchRecords} />
                    {webSearchRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin resultados de búsqueda web relacionados.
                      </p>
                    ) : (
                      webSearchRecords.slice(0, 5).map((r: any, idx: number) => (
                        <a
                          key={idx}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs border-b pb-2 hover:text-blue-600"
                        >
                          <strong>{r.title}</strong>
                          <p className="text-slate-400">{r.snippet}</p>
                          <p className="text-slate-300">{r.displayLink}</p>
                        </a>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Plan "OSINT Profesional" (2026-09-02), Fase 3 — WHOIS/DNS.
                    Solo aparece si el término buscado tiene forma de
                    dominio (fail-open silencioso en cualquier otro caso). */}
                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      WHOIS/DNS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AttachToCaseDialog sourceKey="WHOIS" sourceLabel="WHOIS/DNS" records={whoisRecords} />
                    {whoisRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        El término buscado no tiene forma de dominio, o no se encontró registro.
                      </p>
                    ) : (
                      whoisRecords.map((r: any, idx: number) => (
                        <div key={idx} className="text-xs border-b pb-2 space-y-0.5">
                          <strong>{r.domain}</strong>
                          <p className="text-slate-400">Registrador: {r.registrar || '—'}</p>
                          <p className="text-slate-400">Registrado: {r.registeredAt?.slice(0, 10) || '—'} · Expira: {r.expiresAt?.slice(0, 10) || '—'}</p>
                          {r.ips?.length > 0 && <p className="text-slate-300">IP: {r.ips.join(', ')}</p>}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Plan "OSINT Profesional" (2026-09-02), Fase 3 — listas de
                    sanciones internacionales OFAC/ONU/UE. */}
                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Sanciones internacionales (OFAC/ONU/UE)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AttachToCaseDialog sourceKey="INTL_SANCTIONS" sourceLabel="Sanciones internacionales" records={intlSanctionsRecords} />
                    {intlSanctionsRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin coincidencias en listas de sanciones internacionales.
                      </p>
                    ) : (
                      intlSanctionsRecords.map((r: any, idx: number) => (
                        <div key={idx} className="text-xs border-b pb-2 space-y-0.5">
                          <strong>{r.name}</strong>
                          <p className="text-slate-400">{r.listSource} · Programa: {r.program || '—'}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Estadísticas de criminalidad (Policía/MinDefensa)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-slate-500">
                      Registros: <strong>{policeRecords.length}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Datos agregados por municipio/fecha — un resultado indica
                      coincidencia con un territorio relacionado, no un
                      antecedente de la persona o empresa buscada.
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Sanciones disciplinarias (Procuraduría)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AttachToCaseDialog sourceKey="PROCURADURIA" sourceLabel="Sanciones disciplinarias (Procuraduría)" records={procuraduriaRecords} />
                    {procuraduriaRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin sanciones reportadas por la Procuraduría.
                      </p>
                    ) : (
                      procuraduriaRecords.slice(0, 5).map((r: any, idx: number) => {
                        const fullName = [
                          r.primer_nombre,
                          r.segundo_nombre,
                          r.primer_apellido,
                          r.segundo_apellido,
                        ]
                          .filter(Boolean)
                          .join(' ');

                        return (
                          <div key={idx} className="text-xs border-b pb-2">
                            <strong>{fullName || 'Sin nombre'}</strong>
                            <p className="text-slate-400">
                              {r.tipo_inhabilidad} — {r.sanciones}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Responsabilidad fiscal (Contraloría)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AttachToCaseDialog sourceKey="CONTRALORIA" sourceLabel="Responsabilidad fiscal (Contraloría)" records={contraloriaRecords} />
                    {contraloriaRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin hallazgos reportados por la Contraloría.
                      </p>
                    ) : (
                      contraloriaRecords.slice(0, 5).map((r: any, idx: number) => (
                        <div key={idx} className="text-xs border-b pb-2">
                          <strong>{r.raz_n_social_de_la_entidad || 'Sin nombre'}</strong>
                          <p className="text-slate-400">
                            {r.tipo_de_sanci_n_multa} — {r.monto_de_la_multa_o_sanci}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Sujetos obligados (Supersociedades)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AttachToCaseDialog sourceKey="SUPERSOCIEDADES" sourceLabel="Sujetos obligados (Supersociedades)" records={supersociedadesRecords} />
                    {supersociedadesRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin empresas supervisadas relacionadas.
                      </p>
                    ) : (
                      supersociedadesRecords.slice(0, 5).map((r: any, idx: number) => (
                        <div key={idx} className="text-xs border-b pb-2">
                          <strong>{r.razon_social || 'Sin nombre'}</strong>
                          <p className="text-slate-400">
                            NIT {r.nit} — {r.estado} — {r.ciudad_judicial}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Personas Expuestas Políticamente — PEP (SIGEP)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AttachToCaseDialog sourceKey="SIGEP" sourceLabel="Personas Expuestas Políticamente — PEP (SIGEP)" records={sigepRecords} />
                    {sigepRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin condición PEP registrada.
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px] text-slate-400 mb-1">
                          Condición legal (Decreto 830 de 2021) — no implica irregularidad.
                        </p>
                        {sigepRecords.slice(0, 5).map((r: any, idx: number) => (
                          <div key={idx} className="text-xs border-b pb-2">
                            <strong>{r.nombre_pep || 'Sin nombre'}</strong>
                            <p className="text-slate-400">
                              {r.denominacion_cargo} — {r.nombre_entidad}
                            </p>
                          </div>
                        ))}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Sanciones en firme (SIC)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AttachToCaseDialog sourceKey="SIC" sourceLabel="Sanciones en firme (SIC)" records={sicRecords} />
                    {sicRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin sanciones reportadas por la SIC.
                      </p>
                    ) : (
                      sicRecords.slice(0, 5).map((r: any, idx: number) => (
                        <div key={idx} className="text-xs border-b pb-2">
                          <strong>{r.multado || 'Sin nombre'}</strong>
                          <p className="text-slate-400">
                            {r.conducta} —{' '}
                            {new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                              maximumFractionDigits: 0,
                            }).format(Number(r.valor) || 0)}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">
                      Entidades vigiladas (Superfinanciera)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AttachToCaseDialog sourceKey="SUPERFINANCIERA" sourceLabel="Entidades vigiladas (Superfinanciera)" records={superfinancieraRecords} />
                    {superfinancieraRecords.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin entidades vigiladas relacionadas.
                      </p>
                    ) : (
                      superfinancieraRecords.slice(0, 5).map((r: any, idx: number) => (
                        <div key={idx} className="text-xs border-b pb-2">
                          <strong>{r.razon_social || 'Sin nombre'}</strong>
                          <p className="text-slate-400">
                            NIT {r.numeroidentificacion} — Rep. legal: {r.representante_legal || 'N/A'}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </div>
      )}

      {!loading && !investigation && (
        <div className="space-y-6">
          <Card className="shadow-sm border-0">
            <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
              <CardTitle className="text-base text-primary flex items-center gap-2">
                <Shield size={18} />
                Módulo de Investigación OSINT
              </CardTitle>
            </CardHeader>

            <CardContent className="p-8 text-center text-slate-500">
              Busca una persona, empresa o entidad para generar un expediente con
              grafo, riesgo, timeline y fuentes.
            </CardContent>
          </Card>

          <RecentInvestigationsList
            investigations={recentInvestigations}
            loading={loadingRecent}
            onReopen={reopenInvestigation}
            reopeningId={reopeningId}
          />
        </div>
      )}
    </div>
  );
}