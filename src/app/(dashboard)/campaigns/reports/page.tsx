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
  Smartphone, Download, FileText 
} from 'lucide-react';

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CampaignReportsPage() {
  const [activeTab, setActiveTab] = useState("sms"); // 'sms' | 'email' | 'whatsapp'
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Cargar lista al cambiar pestaña
  useEffect(() => {
    loadCampaigns(activeTab);
    setStats(null);
    setSelectedId(null);
  }, [activeTab]);

  // 2. Cargar detalles al seleccionar campaña
  useEffect(() => {
    if (selectedId) loadStats(selectedId, activeTab);
  }, [selectedId]);

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

  const loadStats = async (id: string, type: string) => {
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
        } else {
            // Para SMS/Email consultamos el reporte detallado
            const endpoint = type === 'sms' ? `/campaigns/sms/report/${id}` : `/campaigns/email/report/${id}`;
            const { data } = await api.get(endpoint);
            setStats(data);
        }
    } catch (e) { console.error(e); }
  };

  // Botón descarga WhatsApp
  const handleDownloadWaReport = (campaignId: string) => {
     const filename = `report_${campaignId}.csv`;
     // Ajusta la URL base si es necesario
     const url = `https://api.uscateguicol.com/api/download-report/${filename}`;
     window.open(url, '_blank');
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
            <h1 className="text-3xl font-black text-[#1B2541]">Centro de Reportes</h1>
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
                            ? 'bg-[#1B2541] text-white border-[#1B2541] shadow-md' 
                            : 'hover:bg-slate-50 bg-white border-transparent hover:border-slate-200'
                    }`}
                  >
                      <div className="font-bold text-sm truncate flex items-center gap-2">
                          {activeTab === 'whatsapp' ? <Smartphone className="h-3 w-3 opacity-70"/> : null}
                          {c.name}
                      </div>
                      <div className={`text-xs flex justify-between mt-1 ${selectedId === c.id ? 'text-slate-300' : 'text-slate-400'}`}>
                        <span>{format(new Date(c.date), "d MMM HH:mm", {locale: es})}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-white/10 text-current">
                            {c.totalMessages} msgs
                        </Badge>
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
                            Resultados: <span className="text-[#1B2541] font-mono">{selectedId}</span>
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
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-6 flex items-center gap-4 shadow-sm border-slate-200 relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-green-500"/>
                        <div className="bg-green-100 p-3 rounded-full text-green-700"><CheckCircle2/></div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase">Tasa de Éxito</p>
                            <h3 className="text-3xl font-black text-slate-800">{stats.summary.successRate}%</h3>
                            <p className="text-xs text-green-600 font-medium">{stats.summary.sent} entregados</p>
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

                {/* TABLA DETALLE (Solo SMS/Email) */}
                {activeTab !== 'whatsapp' ? (
                    <Card className="shadow-sm border-slate-200 flex flex-col flex-1 min-h-[400px]">
                        <CardHeader className="bg-slate-50 py-3 border-b flex flex-row justify-between items-center">
                            <CardTitle className="text-sm font-bold text-slate-700">Bitácora de Envíos (Muestra Reciente)</CardTitle>
                            <Badge variant="outline" className="bg-white">Total Logs: {stats.logs.length}</Badge>
                        </CardHeader>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 pl-6">{activeTab === 'sms' ? 'Teléfono' : 'Email'}</th>
                                        <th className="p-3">Estado</th>
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