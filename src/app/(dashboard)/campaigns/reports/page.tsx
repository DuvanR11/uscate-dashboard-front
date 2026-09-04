'use client';

import React, { useEffect, useState } from 'react';
import api from "@/lib/api"; // Asegúrate de que apunte a tu backend (puerto 3100)
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import {
  Loader2, CheckCircle2, XCircle, Mail, MessageSquare,
  Smartphone, Download, FileText, MailOpen, MousePointerClick,
  TriangleAlert, RefreshCw, ChevronLeft, ChevronRight, CalendarClock, Ban
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cancelScheduledEmailCampaign, extractErrorMessage } from "@/lib/api/campaigns-email";

export default function CampaignReportsPage() {
  const [activeTab, setActiveTab] = useState("sms"); // 'sms' | 'email' | 'whatsapp'

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  // Auditoría de Email en Difusiones, Fase 4 (2026-09-03): estado real de
  // paginación (solo aplica a Email — SMS/WhatsApp no cambiaron en esta
  // fase), export y reintentar fallidos.
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // Auditoría de Email en Difusiones, Fase 5 (2026-09-03): estado real de
  // cancelación de un envío programado.
  const [cancelling, setCancelling] = useState(false);

  // 1. Cargar lista al cambiar pestaña
  useEffect(() => {
    loadCampaigns(activeTab);
    setStats(null);
    setSelectedId(null);
  }, [activeTab]);

  // 2. Volver a la página 1 cada vez que se selecciona OTRA campaña.
  useEffect(() => {
    setPage(1);
  }, [selectedId]);

  // 3. Cargar detalles reales (campaña seleccionada + página actual). Al
  // cambiar de campaña, este efecto corre junto con el de arriba — trae la
  // página vieja por un instante y enseguida la 1 real, sin estado roto.
  useEffect(() => {
    if (selectedId) loadStats(selectedId, activeTab, page);
  }, [selectedId, page]);

  const loadCampaigns = async (type: string) => {
    setLoading(true);
    setCampaigns([]);
    try {
        let data = [];
        
        if (type === 'whatsapp') {
            // Lógica específica para WhatsApp (Endpoint /api/history)
            const res = await api.get('/api/history');
            // Adaptamos la data para que coincida con la estructura de SMS/Email
            data = res.data.map((c: any) => ({
                id: c.id,
                name: c.id, // WhatsApp usa el ID como nombre
                date: c.date,
                totalMessages: c.total,
                // Guardamos datos extra para no tener que hacer otro fetch
                _extra: c 
            }));
        } else {
            // Lógica estándar SMS/Email
            const endpoint = type === 'sms' ? '/campaigns/sms/list' : '/campaigns/email/list';
            const res = await api.get(endpoint);
            data = res.data;
        }

        setCampaigns(data);
        if (data.length > 0) setSelectedId(data[0].id);

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadStats = async (id: string, type: string, currentPage: number) => {
    try {
        if (type === 'whatsapp') {
            // Para WhatsApp, la data ya vino en el listado (optimizacion)
            const campaign = campaigns.find(c => c.id === id);
            if (campaign && campaign._extra) {
                const { sent, failed, total } = campaign._extra;
                setStats({
                    summary: {
                        sent,
                        failed,
                        successRate: total > 0 ? Math.round((sent / total) * 100) : 0
                    },
                    logs: [] // No tenemos endpoint JSON de logs para WA, solo CSV
                });
            }
        } else if (type === 'sms') {
            const { data } = await api.get(`/campaigns/sms/report/${id}`);
            setStats(data);
        } else {
            // Auditoría de Email en Difusiones, Fase 4 (2026-09-03), hallazgo
            // P2-13: ahora la bitácora de Email pagina de verdad — antes
            // estaba fija a los últimos 100 logs, sin forma real de ver el
            // resto de una campaña grande.
            const { data } = await api.get(
              `/campaigns/email/report/${id}?page=${currentPage}&pageSize=50`,
            );
            setStats(data);
        }
    } catch (e) { console.error(e); }
  };

  // Auditoría de Email en Difusiones, Fase 4 (2026-09-03), hallazgo P2-13:
  // exporta TODAS las filas reales de la campaña (la pantalla solo muestra
  // una página a la vez).
  const handleExportEmailReport = async (campaignId: string) => {
    setExporting(true);
    try {
      const res = await api.get(`/campaigns/email/report/${campaignId}/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campana-${campaignId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(extractErrorMessage(e) || 'No se pudo exportar el reporte.');
    } finally {
      setExporting(false);
    }
  };

  // Auditoría de Email en Difusiones, Fase 4 (2026-09-03), hallazgo P2-13:
  // reintenta SOLO los destinatarios reales que fallaron.
  const handleRetryFailed = async (campaignId: string) => {
    setRetrying(true);
    try {
      const { data } = await api.post(
        `/campaigns/email/report/${campaignId}/retry-failed`,
      );
      toast.success(data.message || 'Reintentando destinatarios fallidos.');
      loadStats(campaignId, 'email', page);
    } catch (e) {
      // Auditoría de Email en Difusiones, Fase 5, hallazgo P2-11: mensaje
      // real del backend en vez de uno genérico.
      toast.error(extractErrorMessage(e) || 'No se pudieron reintentar los fallidos.');
    } finally {
      setRetrying(false);
    }
  };

  // Auditoría de Email en Difusiones, Fase 5 (2026-09-03), hallazgo P2-10:
  // cancela un envío programado que todavía no disparó.
  const handleCancelSchedule = async (campaignId: string) => {
    setCancelling(true);
    try {
      const data = await cancelScheduledEmailCampaign(campaignId);
      toast.success(data.message || 'Envío cancelado.');
      loadCampaigns('email');
      loadStats(campaignId, 'email', page);
    } catch (e) {
      toast.error(extractErrorMessage(e) || 'No se pudo cancelar el envío.');
    } finally {
      setCancelling(false);
    }
  };

  // Hallazgo real (2026-09-03): igual que en `/campaigns/whatsapp`, esto
  // abría una URL de producción hardcodeada con `window.open` — una
  // descarga así NUNCA puede llevar el header `Authorization`, y
  // `WhatsappController` exige JWT en esa ruta. Se pide el archivo real
  // autenticado como blob (mismo patrón que el PDF de Peticiones) y se
  // dispara la descarga desde el blob ya en memoria.
  const handleDownloadWaReport = async (campaignId: string) => {
     const filename = `report_${campaignId}.csv`;

     try {
       const res = await api.get(`/api/download-report/${filename}`, {
         responseType: 'blob',
       });

       const blob = new Blob([res.data], { type: 'text/csv' });
       const url = window.URL.createObjectURL(blob);
       const link = document.createElement('a');

       link.href = url;
       link.download = filename;
       document.body.appendChild(link);
       link.click();

       link.remove();
       window.URL.revokeObjectURL(url);
     } catch (error) {
       console.error(error);
     }
  };

  // Datos gráfica
  const chartData = stats ? [
    { name: 'Exitosos', value: stats.summary.sent, color: '#22c55e' },
    { name: 'Fallidos', value: stats.summary.failed, color: '#ef4444' },
  ] : [];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 h-[calc(100vh-100px)] flex flex-col animate-in fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-primary">Centro de Reportes</h1>
            <p className="text-slate-500">Métricas de campañas y entregabilidad.</p>
        </div>
        
        {/* TABS SELECTOR */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-[500px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sms" className="font-bold flex gap-2">
                <MessageSquare className="h-4 w-4"/> SMS
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="font-bold flex gap-2">
                <Smartphone className="h-4 w-4"/> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email" className="font-bold flex gap-2">
                <Mail className="h-4 w-4"/> Email
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* LISTA LATERAL */}
        <Card className="lg:col-span-1 border-slate-200 shadow-lg flex flex-col overflow-hidden">
           <div className="p-4 bg-slate-50 border-b">
             <h3 className="font-bold text-slate-700 capitalize">Historial {activeTab}</h3>
           </div>
           <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {loading ? <Loader2 className="mx-auto animate-spin mt-10 text-slate-400"/> : campaigns.length === 0 ? (
                  <p className="text-center text-slate-400 mt-10 text-sm">No hay campañas.</p>
              ) : campaigns.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all group ${
                        selectedId === c.id 
                            ? 'bg-primary text-white border-primary shadow-md' 
                            : 'hover:bg-slate-50 bg-white border-transparent hover:border-slate-200'
                    }`}
                  >
                      <div className="font-bold text-sm truncate flex items-center gap-2">
                          {activeTab === 'whatsapp' ? <Smartphone className="h-3 w-3 opacity-70"/> : null}
                          {c.name}
                      </div>
                      <div className={`text-xs flex justify-between mt-1 ${selectedId === c.id ? 'text-slate-300' : 'text-slate-400'}`}>
                        <span>{format(new Date(c.date), "d MMM HH:mm", {locale: es})}</span>
                        {/* Auditoría de Email en Difusiones, Fase 5 (2026-09-03),
                            hallazgo P2-10: una campaña programada aún no tiene
                            ningún mensaje real que contar — se distingue con
                            este badge en vez de mostrar "0 msgs" (confuso). */}
                        {c.scheduledFor ? (
                            <Badge variant="secondary" className={`text-[10px] h-5 px-1 gap-1 ${selectedId === c.id ? 'bg-white/10 text-current' : 'bg-blue-100 text-blue-700'}`}>
                                <CalendarClock className="h-2.5 w-2.5" /> Programado
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-white/10 text-current">
                                {c.totalMessages} msgs
                            </Badge>
                        )}
                      </div>
                  </button>
              ))}
           </div>
        </Card>

        {/* DASHBOARD PRINCIPAL */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
           {!stats ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                   <FileText className="h-12 w-12 mb-2 opacity-20"/>
                   <p>Selecciona una campaña para ver detalles</p>
               </div>
           ) : (
             <>
                {/* HEADLINE */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            Resultados: <span className="text-primary font-mono">{selectedId}</span>
                        </h2>
                        <p className="text-sm text-slate-500">Resumen de entrega en tiempo real.</p>
                    </div>
                    
                    {/* Botón especial para WhatsApp */}
                    {activeTab === 'whatsapp' && (
                        <Button
                            onClick={() => handleDownloadWaReport(selectedId!)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2 shadow-sm"
                        >
                            <Download className="h-4 w-4"/> Descargar CSV Detallado
                        </Button>
                    )}

                    {/* Auditoría de Email en Difusiones, Fase 4 (2026-09-03),
                        hallazgo P2-13: exportar todo + reintentar solo fallidos. */}
                    {activeTab === 'email' && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                disabled={exporting}
                                onClick={() => handleExportEmailReport(selectedId!)}
                                className="font-bold gap-2"
                            >
                                {exporting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
                                Exportar CSV
                            </Button>
                            {stats.summary.failed > 0 && (
                                <Button
                                    disabled={retrying}
                                    onClick={() => handleRetryFailed(selectedId!)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 shadow-sm"
                                >
                                    {retrying ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                                    Reintentar fallidos ({stats.summary.failed})
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Auditoría de Email en Difusiones, Fase 5 (2026-09-03),
                    hallazgo P2-10: un envío programado que aún no dispara
                    necesita ser visible y cancelable desde acá. */}
                {activeTab === 'email' && stats.scheduledFor && !stats.cancelledAt && (
                    <div className="flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <CalendarClock className="h-5 w-5 text-blue-600 shrink-0" />
                            <p className="text-sm text-blue-800">
                                Programado para el <span className="font-bold">{new Date(stats.scheduledFor).toLocaleString('es-CO')}</span>
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={cancelling}
                            onClick={() => handleCancelSchedule(selectedId!)}
                            className="border-red-300 text-red-700 hover:bg-red-50 gap-2"
                        >
                            {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                            Cancelar envío
                        </Button>
                    </div>
                )}
                {activeTab === 'email' && stats.cancelledAt && (
                    <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-xl p-4">
                        <Ban className="h-5 w-5 text-slate-500 shrink-0" />
                        <p className="text-sm text-slate-600">
                            Este envío fue cancelado el {new Date(stats.cancelledAt).toLocaleString('es-CO')}.
                        </p>
                    </div>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-6 flex items-center gap-4 shadow-sm border-slate-200 relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-green-500"/>
                        <div className="bg-green-100 p-3 rounded-full text-green-700"><CheckCircle2/></div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase">Tasa de Éxito</p>
                            <h3 className="text-3xl font-black text-slate-800">{stats.summary.successRate}%</h3>
                            <p className="text-xs text-green-600 font-medium">
                                {stats.summary.sent} {activeTab === 'email' ? 'aceptados por SendGrid' : 'entregados'}
                            </p>
                        </div>
                    </Card>

                    <Card className="p-6 flex items-center gap-4 shadow-sm border-slate-200 relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-red-500"/>
                        <div className="bg-red-100 p-3 rounded-full text-red-700"><XCircle/></div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase">Fallidos / Rebote</p>
                            <h3 className="text-3xl font-black text-slate-800">{stats.summary.failed}</h3>
                            <p className="text-xs text-red-500 font-medium">No entregados</p>
                        </div>
                    </Card>

                    {/* Gráfica Mini */}
                    <Card className="p-2 shadow-sm border-slate-200 h-[120px] bg-slate-50/50">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <Bar dataKey="value" radius={[4,4,0,0]} barSize={40}>
                                  {chartData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                                </Bar>
                                <Tooltip
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>

                {/* Auditoría de Email en Difusiones, Fase 4 (2026-09-03),
                    hallazgo P2-12: "Entregado" ya NO es un alias de "Enviado" —
                    estos 4 números vienen de los webhooks reales de SendGrid. */}
                {activeTab === 'email' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="p-4 flex items-center gap-3 shadow-sm border-slate-200">
                            <div className="bg-emerald-100 p-2 rounded-full text-emerald-700"><CheckCircle2 className="h-4 w-4"/></div>
                            <div>
                                <p className="text-slate-500 text-[10px] font-bold uppercase">Entregados</p>
                                <h4 className="text-lg font-black text-slate-800">{stats.summary.delivered}</h4>
                            </div>
                        </Card>
                        <Card className="p-4 flex items-center gap-3 shadow-sm border-slate-200">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-700"><MailOpen className="h-4 w-4"/></div>
                            <div>
                                <p className="text-slate-500 text-[10px] font-bold uppercase">Abiertos</p>
                                <h4 className="text-lg font-black text-slate-800">{stats.summary.opened}</h4>
                            </div>
                        </Card>
                        <Card className="p-4 flex items-center gap-3 shadow-sm border-slate-200">
                            <div className="bg-purple-100 p-2 rounded-full text-purple-700"><MousePointerClick className="h-4 w-4"/></div>
                            <div>
                                <p className="text-slate-500 text-[10px] font-bold uppercase">Clics</p>
                                <h4 className="text-lg font-black text-slate-800">{stats.summary.clicked}</h4>
                            </div>
                        </Card>
                        <Card className="p-4 flex items-center gap-3 shadow-sm border-slate-200">
                            <div className="bg-orange-100 p-2 rounded-full text-orange-700"><TriangleAlert className="h-4 w-4"/></div>
                            <div>
                                <p className="text-slate-500 text-[10px] font-bold uppercase">Rebotes</p>
                                <h4 className="text-lg font-black text-slate-800">{stats.summary.bounced}</h4>
                            </div>
                        </Card>
                    </div>
                )}

                {/* TABLA DETALLE (Solo SMS/Email) */}
                {activeTab !== 'whatsapp' ? (
                    <Card className="shadow-sm border-slate-200 flex flex-col flex-1 min-h-[400px]">
                        <CardHeader className="bg-slate-50 py-3 border-b flex flex-row justify-between items-center">
                            <CardTitle className="text-sm font-bold text-slate-700">Bitácora de Envíos{activeTab === 'sms' ? ' (Muestra Reciente)' : ''}</CardTitle>
                            <Badge variant="outline" className="bg-white">
                                Total: {stats.pagination?.total ?? stats.logs.length}
                                {stats.pagination && stats.pagination.lastPage > 1 ? ` · página ${stats.pagination.page}/${stats.pagination.lastPage}` : ''}
                            </Badge>
                        </CardHeader>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 pl-6">{activeTab === 'sms' ? 'Teléfono' : 'Email'}</th>
                                        <th className="p-3">Estado</th>
                                        {activeTab === 'email' && <th className="p-3">Entrega real</th>}
                                        <th className="p-3 text-right pr-6">Hora</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.logs.map((log: any) => (
                                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3 pl-6 font-mono text-slate-600 text-xs">
                                                {activeTab === 'sms' ? log.phone : log.email}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-col items-start">
                                                    <Badge
                                                        variant={log.status === 'SENT' ? 'default' : 'destructive'}
                                                        className={`text-[10px] h-5 ${log.status === 'SENT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
                                                    >
                                                        {log.status}
                                                    </Badge>
                                                    {log.errorMessage && (
                                                        <span className="text-[10px] text-red-400 mt-1 max-w-[200px] truncate" title={log.errorMessage}>
                                                            {log.errorMessage}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {activeTab === 'email' && (
                                                <td className="p-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {log.deliveredAt && <Badge variant="outline" className="text-[9px] h-5 border-emerald-300 text-emerald-700">Entregado</Badge>}
                                                        {log.openCount > 0 && <Badge variant="outline" className="text-[9px] h-5 border-blue-300 text-blue-700">{log.openCount}x abierto</Badge>}
                                                        {log.clickCount > 0 && <Badge variant="outline" className="text-[9px] h-5 border-purple-300 text-purple-700">{log.clickCount}x clic</Badge>}
                                                        {log.bouncedAt && <Badge variant="outline" className="text-[9px] h-5 border-orange-300 text-orange-700" title={log.bounceReason}>Rebotó</Badge>}
                                                        {log.unsubscribedAt && <Badge variant="outline" className="text-[9px] h-5 border-slate-300 text-slate-500">Baja</Badge>}
                                                        {!log.deliveredAt && !log.openCount && !log.clickCount && !log.bouncedAt && !log.unsubscribedAt && (
                                                            <span className="text-[10px] text-slate-300">Sin eventos aún</span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="p-3 text-right pr-6 text-slate-400 text-xs font-mono">
                                                {format(new Date(log.createdAt), "HH:mm:ss")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {stats.logs.length === 0 && (
                                <div className="text-center py-10 text-slate-400 italic text-sm">
                                    No hay registros disponibles para mostrar.
                                </div>
                            )}
                        </div>

                        {/* Auditoría de Email en Difusiones, Fase 4 (2026-09-03),
                            hallazgo P2-13: paginación real de la bitácora. */}
                        {activeTab === 'email' && stats.pagination && stats.pagination.lastPage > 1 && (
                            <div className="flex items-center justify-between gap-3 border-t bg-slate-50 px-4 py-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="gap-1"
                                >
                                    <ChevronLeft className="h-3 w-3" /> Anterior
                                </Button>
                                <span className="text-xs text-slate-500">
                                    Página {stats.pagination.page} de {stats.pagination.lastPage}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page >= stats.pagination.lastPage}
                                    onClick={() => setPage((p) => Math.min(stats.pagination.lastPage, p + 1))}
                                    className="gap-1"
                                >
                                    Siguiente <ChevronRight className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </Card>
                ) : (
                    // VIEW ESPECIAL PARA WHATSAPP (SIN TABLA DE LOGS JSON)
                    <Card className="flex flex-col items-center justify-center p-12 border-slate-200 border-dashed bg-slate-50/50 flex-1 min-h-[300px]">
                        <div className="bg-green-100 p-4 rounded-full mb-4">
                            <FileText className="h-8 w-8 text-green-600"/>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Detalle de Registros WhatsApp</h3>
                        <p className="text-slate-500 text-center max-w-md mt-2 mb-6">
                            Debido al alto volumen de mensajes de WhatsApp, los registros detallados (log por log) 
                            se almacenan en archivos CSV optimizados para descarga.
                        </p>
                        <Button 
                            variant="outline"
                            onClick={() => handleDownloadWaReport(selectedId!)}
                            className="border-green-600 text-green-700 hover:bg-green-50 font-bold"
                        >
                            <Download className="mr-2 h-4 w-4"/> Descargar Reporte Completo (.csv)
                        </Button>
                    </Card>
                )}
             </>
           )}
        </div>

      </div>
    </div>
  );
}