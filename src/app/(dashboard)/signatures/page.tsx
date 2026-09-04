'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  PlusCircle, Download, History, Wallet, AlertCircle, 
  CheckCircle2, Megaphone, PenTool, FileText, PenLine, Search, Target, 
  Map, Pencil, X, DollarSign, Clock 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

// --- TARJETA DE MÉTRICAS ---
const MetricCard = ({ title, value, sub, icon, color, progress }: any) => (
  <Card className="border-slate-100 shadow-sm relative overflow-hidden">
    <CardContent className="p-4 flex items-center gap-4 relative z-10">
      <div className={`p-3 rounded-full ${color} text-white shrink-0 shadow-sm`}>{icon}</div>
      <div className="overflow-hidden flex-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{title}</p>
        <h3 className="text-2xl font-black text-primary truncate">{value}</h3>
        {sub && <p className="text-[10px] text-slate-500 truncate font-medium">{sub}</p>}
      </div>
    </CardContent>
    {progress !== undefined && (
        <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full">
            <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%` }}></div>
        </div>
    )}
  </Card>
);

export default function SignaturesPage() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY' | 'SECTOR'>('PENDING');
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCut, setSelectedCut] = useState<any>(null);
  
  // Estado de Edición
  const [editingId, setEditingId] = useState<string | null>(null);

  // Datos
  const [metrics, setMetrics] = useState<any>(null);
  const [pendingPayroll, setPendingPayroll] = useState<any[]>([]);
  const [historyCuts, setHistoryCuts] = useState<any[]>([]);
  const [sectorStats, setSectorStats] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const GOAL = 40000; 

  const [formData, setFormData] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    hoursWorked: '8', 
    planillasCount: '',   
    signaturesCount: '',  
    baseValue: '40000',
    sector: '',
    activity: 'SIGNATURES', 
  });

  useEffect(() => { loadAllData(); }, []);

  // --- AUTO-RELLENAR FIRMAS (SOLO GUÍA) ---
  // Mantenemos esto para ayudar al usuario a llenar el campo de firmas rápido,
  // pero ya no afecta el cobro.
  useEffect(() => {
    if (formData.activity === 'SIGNATURES' && formData.planillasCount) {
        const currentSigs = Number(formData.signaturesCount);
        const suggestion = Number(formData.planillasCount) * 15;
        
        // Solo sugerimos si el campo de firmas está vacío 
        // o si coincide matemáticamente (para no sobrescribir correcciones manuales)
        if (!formData.signaturesCount || (currentSigs % 15 === 0 && !editingId)) {
            setFormData(prev => ({ ...prev, signaturesCount: suggestion.toString() }));
        }
    }
  }, [formData.planillasCount]);

  const loadAllData = async () => {
    try {
      const [mRes, pRes, hRes, uRes, sRes] = await Promise.all([
        api.get('/signatures/metrics'),
        api.get('/signatures/pending'),
        api.get('/signatures/history'),
        api.get('/users/team'),
        api.get('/signatures/stats/sector')
      ]);
      setMetrics(mRes.data);
      setPendingPayroll(pRes.data);
      setHistoryCuts(hRes.data);
      setUsers(uRes.data);
      setSectorStats(sRes.data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

    const downloadAuditCSV = () => {
    if (!selectedCut) return;

    const headers = [
      "Fecha", "Cédula", "Nombre Colaborador", "Dirección", "Actividad", 
      "Sector", "Horas Trab.", "Planillas", "Firmas", "Valor Base", 
      "Comisión", "TOTAL A PAGAR"
    ];

    const rows: string[] = [];

    selectedCut.details.forEach((userBlock: any) => {
        userBlock.details.forEach((log: any) => {
            const baseEarned = (log.baseValue / 8) * log.hoursWorked;
            const commission = log.total - baseEarned;

            const row = [
                `"${new Date(log.date).toLocaleDateString('es-CO')}"`,
                `"${userBlock.user.documentNumber}"`,
                `"${userBlock.user.fullName}"`,
                `"${userBlock.user.address}"`,
                `"${log.activity === 'FLYERS' ? 'Volanteo' : 'Firmas'}"`,
                `"${log.sector}"`,
                log.hoursWorked,
                Number(log.planillas).toFixed(1),
                log.signatures,
                Math.round(baseEarned),
                Math.round(commission),
                Math.round(log.total)
            ];
            rows.push(row.join(","));
        });
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const fileName = `Nomina_${formatDate(selectedCut.meta.date).replace(/ /g, '_')}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const openAudit = async (cutId: string) => {
    try {
        const { data } = await api.get(`/signatures/history/${cutId}`);
        setSelectedCut(data);
        setIsModalOpen(true);
    } catch (error) { toast.error("No se pudo cargar el detalle."); }
  };

  const handleEditClick = (detail: any, userId: string) => {
      setEditingId(detail.id); 
      setFormData({
          userId: userId,
          date: new Date(detail.date).toISOString().split('T')[0],
          hoursWorked: detail.hoursWorked ? detail.hoursWorked.toString() : '8', 
          baseValue: detail.baseValue ? detail.baseValue.toString() : '40000',
          planillasCount: detail.planillas ? detail.planillas.toString() : '',
          signaturesCount: detail.signatures ? detail.signatures.toString() : '',
          sector: detail.sector || '',
          activity: detail.activity || 'SIGNATURES',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.info("Modo edición activado");
  };

  const cancelEdit = () => {
      setEditingId(null);
      setFormData({
        userId: '',
        date: new Date().toISOString().split('T')[0],
        hoursWorked: '8',
        planillasCount: '',   
        signaturesCount: '',  
        baseValue: '40000',
        sector: '',
        activity: 'SIGNATURES', 
      });
  };

  const handleRegister = async () => {
    if (!formData.userId || !formData.sector) return toast.error("Faltan datos obligatorios.");
    
    // VALIDACIÓN ACTUALIZADA: Ahora validamos planillas, no firmas
    if (formData.activity === 'SIGNATURES' && !formData.planillasCount) return toast.error("Indica la cantidad de planillas para cobrar.");

    const payload = { 
        ...formData, 
        date: new Date(formData.date + 'T12:00:00').toISOString(),
        hoursWorked: Number(formData.hoursWorked),
        planillasCount: formData.activity === 'SIGNATURES' ? Number(formData.planillasCount) : 0, 
        signaturesCount: formData.activity === 'SIGNATURES' ? Number(formData.signaturesCount) : 0,
        baseValue: Number(formData.baseValue),
    };

    try {
      if (editingId) {
          await api.put(`/signatures/daily/${editingId}`, payload);
          toast.success("Registro actualizado");
      } else {
          await api.post('/signatures/daily', payload);
          toast.success("Registro guardado");
      }
      cancelEdit(); 
      loadAllData(); 
    } catch { toast.error("Error al guardar la operación"); }
  };

  const handleCutoff = async (userId: string | null = null) => {
    const message = userId 
        ? "¿Confirmas liquidar y pagar SOLO a este colaborador?" 
        : "¿Cerrar nómina y LIQUIDAR todo lo pendiente para TODOS?";
    
    if (!window.confirm(message)) return;

    try {
      await api.post('/signatures/cutoff', { userId });
      toast.success("¡Liquidación realizada con éxito!");
      loadAllData(); 
    } catch { toast.error("Error al realizar el corte"); }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  // --- CÁLCULO DE PAGO EN TIEMPO REAL (LÓGICA ACTUALIZADA) ---
  const calculatePreviewPayment = () => {
      const baseStandard = Number(formData.baseValue) || 0;
      const hours = Number(formData.hoursWorked) || 0;
      
      // 1. Base Proporcional: (Base / 8) * Horas
      const baseEarned = (baseStandard / 8) * hours;

      if (formData.activity === 'FLYERS') return baseEarned;

      // 2. Comisión: AHORA SE PAGA POR PLANILLA (15 firmas = 5000, ergo 1 planilla = 5000)
      const pricePerPlanilla = 5000; 
      const planillas = Number(formData.planillasCount) || 0;
      
      const commissionEarned = planillas * pricePerPlanilla;

      return baseEarned + commissionEarned;
  };

  const totalFirmas = metrics ? metrics.totalFirmas : 0;
  const faltan = Math.max(0, GOAL - totalFirmas);
  const porcentaje = Math.min(100, (totalFirmas / GOAL) * 100);
  const maxSignatures = sectorStats.length > 0 ? Math.max(...sectorStats.map(s => s.firmas)) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 bg-slate-50 min-h-screen pb-20">
      
      {/* 1. MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3 md:gap-4">
        <MetricCard title="Recolección Total" value={totalFirmas?.toLocaleString()} sub={`${porcentaje.toFixed(1)}% de la Meta`} icon={<PenLine size={24}/>} color="bg-primary" progress={porcentaje} />
        <MetricCard title="Faltan para 40k" value={faltan.toLocaleString()} sub={faltan === 0 ? "¡META SUPERADA!" : "Firmas restantes"} icon={<Target size={24}/>} color={faltan === 0 ? "bg-green-500" : "bg-red-500"} />
        <MetricCard title="Total Planillas" value={metrics ? metrics.totalPlanillas?.toLocaleString() : '...'} sub="Físicas" icon={<FileText size={24}/>} color="bg-slate-500" />
        <MetricCard title="Deuda Pendiente" value={metrics ? formatMoney(metrics.debt) : '...'} sub="Por pagar" icon={<AlertCircle size={24}/>} color="bg-orange-500" />
        <MetricCard title="Total Gastado" value={metrics ? formatMoney(metrics.totalSpent) : '...'} sub="Histórico" icon={<Wallet size={24}/>} color="bg-green-600" />
        <MetricCard title="Inv. Volanteo" value={metrics ? formatMoney(metrics.spentFlyers) : '...'} sub="Publicidad" icon={<Megaphone size={24}/>} color="bg-purple-600" />
        <MetricCard title="Inv. Firmas" value={metrics ? formatMoney(metrics.spentSignatures) : '...'} sub="Operativo" icon={<PenTool size={24}/>} color="bg-blue-600" />
      </div>

      {/* 2. FORMULARIO DE REGISTRO / EDICIÓN */}
      <Card className={`border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${editingId ? 'ring-2 ring-orange-400 scale-[1.01]' : ''}`}>
        <CardHeader className={`${editingId ? 'bg-orange-500' : 'bg-primary'} text-white py-3 px-4 md:px-6 transition-colors duration-300`}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    {editingId ? <Pencil size={16}/> : <PlusCircle size={16} className="text-secondary"/>} 
                    {editingId ? "Editando Actividad" : "Registro Diario"}
                </h3>
                
                <div className="bg-white/10 p-1 rounded-lg flex w-full sm:w-auto">
                    <button onClick={() => setFormData({...formData, activity: 'SIGNATURES'})} className={`flex-1 sm:flex-none text-xs font-bold px-3 py-1.5 rounded transition-colors flex justify-center items-center gap-2 ${formData.activity === 'SIGNATURES' ? 'bg-secondary text-primary' : 'text-slate-200 hover:bg-white/20'}`}>
                        <PenTool size={12}/> Firmas
                    </button>
                    <button onClick={() => setFormData({...formData, activity: 'FLYERS'})} className={`flex-1 sm:flex-none text-xs font-bold px-3 py-1.5 rounded transition-colors flex justify-center items-center gap-2 ${formData.activity === 'FLYERS' ? 'bg-secondary text-primary' : 'text-slate-200 hover:bg-white/20'}`}>
                        <Megaphone size={12}/> Volanteo
                    </button>
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="p-4 bg-white">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            
            {/* Colaborador */}
            <div className="w-full lg:flex-1 min-w-[200px]">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Colaborador</label>
              <Select onValueChange={(val) => setFormData({...formData, userId: val})} value={formData.userId} disabled={!!editingId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                          <span className="font-bold">{u.fullName}</span>
                          <span className="text-xs text-slate-400 ml-1">({u.documentNumber})</span>
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sector */}
            <div className="w-full lg:flex-1 min-w-[150px]">
               <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sector / Barrio</label>
               <Input className="w-full" placeholder={formData.activity === 'SIGNATURES' ? "Barrio recolección" : "Zona de volanteo"} value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} />
            </div>

            {/* Configuración Jornada */}
            <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
                <div className="w-full">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fecha</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="px-2" />
                </div>
                <div className="w-full">
                   <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Base (8h)</label>
                   <Input type="number" value={formData.baseValue} onChange={e => setFormData({...formData, baseValue: e.target.value})} className="px-2" />
                </div>
                <div className="w-full">
                   <label className="text-[10px] font-black text-orange-600 uppercase block mb-1 flex items-center gap-1"><Clock size={10}/> Horas</label>
                   <Input 
                      type="number" 
                      max={24} min={0} 
                      value={formData.hoursWorked} 
                      onChange={e => setFormData({...formData, hoursWorked: e.target.value})} 
                      className="border-orange-200 text-orange-700 font-bold px-2 bg-orange-50 focus:bg-white"
                   />
                </div>
            </div>

            {/* Inputs de Producción - CAMBIO VISUAL */}
            {formData.activity === 'SIGNATURES' && (
                <div className="flex gap-2 w-full lg:w-auto animate-in fade-in zoom-in duration-300 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="w-1/2 lg:w-24">
                        <label className="text-[10px] font-black text-green-700 uppercase block mb-1">Planillas</label>
                        {/* AHORA ES EL CAMPO VERDE (EL QUE PAGA) */}
                        <Input type="number" step="0.1" placeholder="0" className="border-green-300 bg-white text-lg font-bold text-green-800" value={formData.planillasCount} onChange={e => setFormData({...formData, planillasCount: e.target.value})} />
                        <span className="text-[9px] text-green-600 font-bold">Base de Pago</span>
                    </div>
                    <div className="w-1/2 lg:w-24">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Firmas</label>
                        {/* AHORA ES EL CAMPO GRIS (SOLO GUIA) */}
                        <Input type="number" placeholder="0" className="border-slate-200 bg-white text-slate-500" value={formData.signaturesCount} onChange={e => setFormData({...formData, signaturesCount: e.target.value})} />
                        <span className="text-[9px] text-slate-400">Solo Guía</span>
                    </div>
                </div>
            )}

            {/* Botones */}
            <div className="flex gap-2 w-full lg:w-auto">
                {editingId && (
                    <Button onClick={cancelEdit} variant="outline" className="h-10 text-red-500 border-red-200 hover:bg-red-50" title="Cancelar Edición">
                        <X size={18}/>
                    </Button>
                )}
                <Button onClick={handleRegister} className={`${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary hover:bg-slate-800'} text-white font-bold flex-1 lg:flex-none min-w-[100px] h-10 transition-colors`}>
                  {editingId ? "Actualizar" : "Guardar"}
                </Button>
            </div>
          </div>

          {/* Footer: Preview de Pago */}
          <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 pt-3">
              <div></div>
              
              {/* CÁLCULO VISUAL ACTUALIZADO */}
              {formData.activity === 'SIGNATURES' && formData.planillasCount && (
                  <div className="text-xs text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 text-right">
                      <div>
                          <span className="text-slate-400 mr-1">Base ({formData.hoursWorked}h):</span>
                          <b>{formatMoney((Number(formData.baseValue)/8) * Number(formData.hoursWorked))}</b>
                      </div>
                      <span className="hidden sm:inline text-slate-300">|</span>
                      <div>
                          {/* CAMBIADO: Se muestra cálculo por planillas */}
                          <span className="text-slate-400 mr-1">Comisión ({formData.planillasCount} planillas):</span>
                          <b>{formatMoney(Number(formData.planillasCount) * 5000)}</b>
                      </div>
                      <span className="hidden sm:inline text-slate-300">|</span>
                      <div className="text-lg">
                          Total: <b className="text-green-600">{formatMoney(calculatePreviewPayment())}</b>
                      </div>
                  </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* 3. LISTADOS Y TABLAS */}
      <div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
           <Button variant={activeTab === 'PENDING' ? 'default' : 'outline'} onClick={() => setActiveTab('PENDING')} className={`whitespace-nowrap ${activeTab === 'PENDING' ? 'bg-primary' : ''}`}><AlertCircle size={16} className="mr-2"/> Nómina Actual</Button>
           <Button variant={activeTab === 'HISTORY' ? 'default' : 'outline'} onClick={() => setActiveTab('HISTORY')} className={`whitespace-nowrap ${activeTab === 'HISTORY' ? 'bg-primary' : ''}`}><History size={16} className="mr-2"/> Historial</Button>
           <Button variant={activeTab === 'SECTOR' ? 'default' : 'outline'} onClick={() => setActiveTab('SECTOR')} className={`whitespace-nowrap ${activeTab === 'SECTOR' ? 'bg-primary' : ''}`}><Map size={16} className="mr-2"/> Territorio / Sectores</Button>
        </div>

        {/* TABLA PENDIENTE */}
        {activeTab === 'PENDING' && (
           <Card className="shadow-lg border-0 overflow-hidden">
             <CardHeader className="border-b pb-4 bg-orange-50 px-4 md:px-6">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div><CardTitle className="text-orange-900 text-lg">Acumulado Semanal</CardTitle><p className="text-xs text-orange-700 mt-1">Valores pendientes por liquidar.</p></div>
                 <Button onClick={() => handleCutoff(null)} variant="outline" className="border-orange-200 text-orange-800 hover:bg-orange-100 font-bold w-full md:w-auto shadow-sm text-xs">
                     Liquidar Todo el Equipo
                 </Button>
               </div>
             </CardHeader>
             <CardContent className="p-0 overflow-x-auto">
               <Table className="min-w-[800px] md:min-w-full">
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-[250px]">Colaborador / Detalle</TableHead>
                     <TableHead className="text-center w-[80px]">Días</TableHead>
                     <TableHead className="text-right">Base</TableHead>
                     <TableHead className="text-center">Prod.</TableHead>
                     <TableHead className="text-right">Comisión</TableHead>
                     <TableHead className="text-right font-black bg-slate-50">TOTAL</TableHead>
                     <TableHead className="text-center w-[100px]">Acción</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {pendingPayroll.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400">Todo al día. No hay deuda.</TableCell></TableRow>
                   ) : pendingPayroll.map((row) => (
                     <TableRow key={row.user.id} className="hover:bg-slate-50 border-b">
                       <TableCell className="align-top py-4">
                         <Link href={`/users/${row.user.id}`} className="font-bold text-primary text-base hover:text-blue-600 hover:underline transition-colors block">
                            {row.user.fullName}
                         </Link>
                         <div className="text-[10px] text-slate-500 mt-2 flex flex-col gap-1.5 border-l-2 border-slate-200 pl-2">
                            {row.details.map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 group">
                                    <button 
                                        onClick={() => handleEditClick(d, row.user.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-orange-500"
                                        title="Editar este registro"
                                    >
                                        <Pencil size={10} />
                                    </button>

                                    <span className="font-bold w-5 text-slate-700">{new Date(d.date).getDate()}</span>
                                    {d.activity === 'FLYERS' ? (
                                        <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[9px] font-bold border border-purple-200 flex items-center gap-1"><Megaphone size={10}/> Volanteo</span>
                                    ) : (
                                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-200 flex items-center gap-1"><PenTool size={10}/> {d.signatures} Firmas</span>
                                    )}
                                    <span className="text-slate-400 italic truncate max-w-[100px]">{d.sector}</span>
                                </div>
                            ))}
                         </div>
                       </TableCell>
                       <TableCell className="text-center align-top py-4 text-slate-600 font-medium">{row.daysWorked}</TableCell>
                       <TableCell className="text-right align-top py-4 text-slate-600">{formatMoney(row.totalBase)}</TableCell>
                       <TableCell className="text-center align-top py-4 font-bold text-slate-800 bg-yellow-50/50">{Number(row.totalPlanillas).toFixed(1)}</TableCell>
                       <TableCell className="text-right align-top py-4 text-slate-600 bg-yellow-50/50">{formatMoney(row.totalCommission)}</TableCell>
                       <TableCell className="text-right align-top py-4 font-black text-lg text-primary bg-slate-50">{formatMoney(row.grandTotal)}</TableCell>
                       <TableCell className="align-middle text-center">
                           <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm h-8 px-2" onClick={() => handleCutoff(row.user.id)} title="Pagar solo a esta persona">
                               <DollarSign size={14} className="mr-1"/> Pagar
                           </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        )}

        {/* ... (Las otras pestañas se mantienen igual) ... */}
        {activeTab === 'HISTORY' && (
            <div className="flex flex-col gap-4">
                {historyCuts.length === 0 && <div className="text-center text-slate-400 py-10">Sin historial.</div>}
                {historyCuts.map((cut) => (
                    <Card key={cut.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500 cursor-pointer group active:scale-[0.99] transition-transform" onClick={() => openAudit(cut.id)}>
                        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2.5 rounded-full text-green-700 shrink-0 group-hover:bg-green-200 transition-colors"><CheckCircle2 size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-primary capitalize">{formatDate(cut.cutDate)}</h4>
                                    <p className="text-xs text-slate-500 flex items-center gap-1"><Search size={10}/> Ver auditoría ({cut.usersCount} personas)</p>
                                </div>
                            </div>
                            <div className="flex justify-between w-full sm:w-auto sm:justify-end gap-6 sm:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                <div><p className="text-[10px] uppercase text-slate-400 font-bold">Total Pl.</p><p className="font-bold text-slate-700 text-lg">{Number(cut.totalPlanillas).toFixed(1)}</p></div>
                                <div className="text-right"><p className="text-[10px] uppercase text-slate-400 font-bold">Liquidado</p><p className="font-black text-xl text-green-600">{formatMoney(cut.totalPaid)}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}

        {activeTab === 'SECTOR' && (
           <Card className="shadow-lg border-0 overflow-hidden">
             <CardHeader className="border-b pb-4 bg-blue-50 px-4 md:px-6">
               <div><CardTitle className="text-blue-900 text-lg">Rendimiento por Barrio</CardTitle><p className="text-xs text-blue-700 mt-1">Acumulado histórico de firmas y planillas por zona.</p></div>
             </CardHeader>
             <CardContent className="p-0 overflow-x-auto">
               <Table className="min-w-[650px] md:min-w-full">
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-[50px] text-center">#</TableHead>
                     <TableHead className="min-w-[200px]">Sector / Barrio</TableHead>
                     <TableHead className="w-[300px]">Progreso Visual</TableHead>
                     <TableHead className="text-center">Planillas</TableHead>
                     <TableHead className="text-right font-black">Total Firmas</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {sectorStats.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">No hay datos registrados aún.</TableCell></TableRow>) : sectorStats.map((row, index) => (
                     <TableRow key={index} className="hover:bg-slate-50 border-b">
                       <TableCell className="text-center font-bold text-slate-400">{index + 1}</TableCell>
                       <TableCell className="font-medium text-primary uppercase">{row.sector}</TableCell>
                       <TableCell>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                             <div className="bg-primary h-2.5 rounded-full transition-all duration-1000" style={{ width: `${(row.firmas / maxSignatures) * 100}%` }}></div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 text-right">{((row.firmas / (metrics?.totalFirmas || 1)) * 100).toFixed(1)}% del total</p>
                       </TableCell>
                       <TableCell className="text-center font-mono text-slate-600">{Number(row.planillas).toFixed(1)}</TableCell>
                       <TableCell className="text-right"><span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full font-bold text-sm">{row.firmas}</span></TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-[95%] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-2">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2 text-xl text-primary">
                  <div className="p-2 bg-slate-100 rounded-lg">
                      <FileText className="text-primary h-5 w-5"/>
                  </div>
                  <span>Auditoría de Pago</span>
                </DialogTitle>
                <DialogDescription className="mt-1 text-slate-500 ml-1">
                  Corte del {selectedCut && formatDate(selectedCut.meta.date)}
                </DialogDescription>
              </div>

              {selectedCut && (
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto">
                  <Button 
                    onClick={downloadAuditCSV} 
                    variant="outline" 
                    className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 gap-2 h-10 px-4 font-bold shadow-sm transition-all"
                  >
                    <Download size={18} /> Exportar Reporte
                  </Button>
                  <div className="flex flex-col items-end border-l-2 border-slate-100 pl-4 py-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Total Liquidado
                    </span>
                    <span className="text-2xl font-black text-green-600 leading-none mt-0.5">
                      {formatMoney(selectedCut.meta.totalPaid)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedCut ? (
             <div className="mt-2">
                <Table>
                    <TableHeader className="bg-slate-100/50">
                        <TableRow>
                            <TableHead className="font-bold text-primary">Colaborador</TableHead>
                            <TableHead className="text-center font-bold text-primary">Detalle Actividades</TableHead>
                            <TableHead className="text-right font-bold text-primary">Pago</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedCut.details.map((row: any) => (
                            <TableRow key={row.user.id} className="border-b">
                                <TableCell className="align-top font-medium text-primary py-4">
                                    <Link href={`/users/${row.user.id}`} className="hover:text-blue-600 hover:underline transition-colors">{row.user.fullName}</Link>
                                    <div className="text-xs text-slate-400">{row.user.documentNumber}</div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="space-y-3">
                                        {row.details.map((d: any, i: number) => (
                                            <div key={i} className="flex flex-wrap sm:flex-nowrap items-center text-xs gap-3 border-b border-slate-50 pb-2 last:border-0">
                                                <span className="font-bold text-slate-600 w-12 shrink-0">{new Date(d.date).toLocaleDateString('es-CO', {day:'numeric', month:'short'})}</span>
                                                {d.activity === 'FLYERS' ? (
                                                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded flex items-center gap-1 min-w-[90px] justify-center border border-purple-100 font-bold"><Megaphone size={12}/> Volanteo</span>
                                                ) : (
                                                    <div className="flex flex-col items-center bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 min-w-[90px]">
                                                        <span className="font-bold flex items-center gap-1 text-[11px]"><PenTool size={10}/> {d.signatures || 0} Firmas</span>
                                                        <span className="text-[9px] text-blue-400 leading-none mt-0.5">({Number(d.planillas).toFixed(1)} Pl. pagadas)</span>
                                                    </div>
                                                )}
                                                <span className="text-slate-500 italic truncate max-w-[120px]">📍 {d.sector}</span>
                                                <span className="ml-auto font-mono text-slate-700 font-bold bg-slate-50 px-2 py-1 rounded">{formatMoney(d.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-black align-top text-green-700 py-4 text-base">{formatMoney(row.grandTotal)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
          ) : (
            <div className="py-10 text-center text-slate-400 flex flex-col items-center"><Search className="mb-2 opacity-50"/>Cargando información...</div>
          )}
        
        </DialogContent>
      </Dialog>
    </div>
  );
}