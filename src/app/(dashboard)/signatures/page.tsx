'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  PlusCircle, CalendarCheck, History, Wallet, AlertCircle, Trophy, 
  CheckCircle2, Megaphone, PenTool, FileText, PenLine, Search 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// --- IMPORTAMOS LOS COMPONENTES DE MODAL (DIALOG) ---
// Si usas shadcn/ui, asegúrate de tenerlos instalados o impórtalos de tu ruta correcta
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

// --- COMPONENTE AUXILIAR: TARJETA DE MÉTRICA ---
const MetricCard = ({ title, value, sub, icon, color }: any) => (
  <Card className="border-slate-100 shadow-sm">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-3 rounded-full ${color} text-white shrink-0`}>{icon}</div>
      <div className="overflow-hidden">
        <p className="text-xs font-bold text-slate-400 uppercase truncate">{title}</p>
        <h3 className="text-2xl font-black text-[#1B2541] truncate">{value}</h3>
        {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

export default function SignaturesPage() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [loading, setLoading] = useState(true);
  
  // Estados para Auditoría (Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCut, setSelectedCut] = useState<any>(null);

  // Datos Principales
  const [metrics, setMetrics] = useState<any>(null);
  const [pendingPayroll, setPendingPayroll] = useState<any[]>([]);
  const [historyCuts, setHistoryCuts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Formulario Registro
  const [formData, setFormData] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    planillasCount: '',
    baseValue: '40000',
    sector: '',
    activity: 'SIGNATURES'
  });

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    try {
      const [mRes, pRes, hRes, uRes] = await Promise.all([
        api.get('/signatures/metrics'),
        api.get('/signatures/pending'),
        api.get('/signatures/history'),
        api.get('/users/team')
      ]);
      setMetrics(mRes.data);
      setPendingPayroll(pRes.data);
      setHistoryCuts(hRes.data);
      setUsers(uRes.data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  // --- NUEVA FUNCIÓN: ABRIR AUDITORÍA ---
  const openAudit = async (cutId: string) => {
    try {
        // Hacemos la petición al endpoint de detalle que creamos en el backend
        const { data } = await api.get(`/signatures/history/${cutId}`);
        setSelectedCut(data);
        setIsModalOpen(true);
    } catch (error) {
        toast.error("No se pudo cargar el detalle del pago.");
    }
  };

  const handleRegister = async () => {
    if (!formData.userId || !formData.sector) return toast.error("Faltan datos obligatorios.");
    if (formData.activity === 'SIGNATURES' && !formData.planillasCount) {
        return toast.error("Indica la cantidad de planillas.");
    }
    try {
      await api.post('/signatures/daily', { 
        ...formData, 
        planillasCount: formData.activity === 'SIGNATURES' ? Number(formData.planillasCount) : 0, 
        baseValue: Number(formData.baseValue) 
      });
      toast.success("Registro guardado");
      setFormData({ ...formData, planillasCount: '' }); 
      loadAllData(); 
    } catch { toast.error("Error al guardar"); }
  };

  const handleCutoff = async () => {
    const confirm = window.confirm("¿Cerrar nómina y LIQUIDAR todo lo pendiente?");
    if (!confirm) return;
    try {
      await api.post('/signatures/cutoff');
      toast.success("¡Corte realizado! Deuda en cero.");
      loadAllData(); 
    } catch { toast.error("Error al realizar el corte"); }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 bg-slate-50 min-h-screen pb-20">
      
      {/* 1. SECCIÓN DE MÉTRICAS (GRID DE 6 COLUMNAS EN PANTALLAS GRANDES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        
        {/* --- NUEVO: TOTAL FIRMAS --- */}
        <MetricCard 
          title="Total Firmas" 
          value={metrics ? metrics.totalFirmas?.toLocaleString() : '...'} 
          sub="Meta Global"
          icon={<PenLine size={24}/>} 
          color="bg-[#1B2541]" 
        />

        {/* --- NUEVO: TOTAL PLANILLAS --- */}
        <MetricCard 
          title="Total Planillas" 
          value={metrics ? metrics.totalPlanillas?.toLocaleString() : '...'} 
          sub="Documentos Físicos"
          icon={<FileText size={24}/>} 
          color="bg-slate-500" 
        />

        <MetricCard 
          title="Deuda Pendiente" 
          value={metrics ? formatMoney(metrics.debt) : '...'} 
          sub="Por pagar"
          icon={<AlertCircle size={24}/>} color="bg-orange-500" 
        />
        <MetricCard 
          title="Total Gastado" 
          value={metrics ? formatMoney(metrics.totalSpent) : '...'} 
          sub="Histórico"
          icon={<Wallet size={24}/>} color="bg-green-600" 
        />
        
        {/* Agrupamos inversiones en movil para ahorrar espacio si quieres, o dejamos las 6 */}
        <MetricCard 
          title="Inv. Volanteo" 
          value={metrics ? formatMoney(metrics.spentFlyers) : '...'} 
          sub="Publicidad"
          icon={<Megaphone size={24}/>} color="bg-purple-600" 
        />
        <MetricCard 
          title="Inv. Firmas" 
          value={metrics ? formatMoney(metrics.spentSignatures) : '...'} 
          sub="Operativo"
          icon={<PenTool size={24}/>} color="bg-blue-600" 
        />
      </div>

      {/* 2. FORMULARIO DE REGISTRO */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-[#1B2541] text-white py-3 px-4 md:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <PlusCircle size={16} className="text-[#FFC400]"/> Registro Diario
                </h3>
                <div className="bg-slate-700 p-1 rounded-lg flex w-full sm:w-auto">
                    <button 
                        onClick={() => setFormData({...formData, activity: 'SIGNATURES'})}
                        className={`flex-1 sm:flex-none text-xs font-bold px-3 py-1.5 rounded transition-colors flex justify-center items-center gap-2 ${formData.activity === 'SIGNATURES' ? 'bg-[#FFC400] text-[#1B2541]' : 'text-slate-300 hover:bg-slate-600'}`}
                    >
                        <PenTool size={12}/> Firmas
                    </button>
                    <button 
                        onClick={() => setFormData({...formData, activity: 'FLYERS'})}
                        className={`flex-1 sm:flex-none text-xs font-bold px-3 py-1.5 rounded transition-colors flex justify-center items-center gap-2 ${formData.activity === 'FLYERS' ? 'bg-[#FFC400] text-[#1B2541]' : 'text-slate-300 hover:bg-slate-600'}`}
                    >
                        <Megaphone size={12}/> Volanteo
                    </button>
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="p-4 bg-white">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="w-full lg:flex-1 min-w-[200px]">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Colaborador</label>
              <Select onValueChange={(val) => setFormData({...formData, userId: val})}>
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

            <div className="w-full lg:flex-1 min-w-[150px]">
               <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sector / Barrio</label>
               <Input 
                 className="w-full"
                 placeholder={formData.activity === 'SIGNATURES' ? "Barrio recolección" : "Zona de volanteo"}
                 value={formData.sector} 
                 onChange={e => setFormData({...formData, sector: e.target.value})} 
               />
            </div>

            <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                <div className="w-full lg:w-36">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fecha</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="w-full lg:w-28">
                   <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Base Día</label>
                   <Input type="number" value={formData.baseValue} onChange={e => setFormData({...formData, baseValue: e.target.value})} />
                </div>
            </div>

            {formData.activity === 'SIGNATURES' && (
                <div className="w-full lg:w-28 animate-in fade-in zoom-in duration-300">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1"># Planillas</label>
                  <Input type="number" placeholder="0" value={formData.planillasCount} onChange={e => setFormData({...formData, planillasCount: e.target.value})} />
                </div>
            )}

            <Button onClick={handleRegister} className="bg-[#1B2541] hover:bg-slate-800 text-white font-bold w-full lg:w-auto min-w-[100px] h-10">
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. PESTAÑAS Y TABLAS */}
      <div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
           <Button variant={activeTab === 'PENDING' ? 'default' : 'outline'} onClick={() => setActiveTab('PENDING')} className={`whitespace-nowrap ${activeTab === 'PENDING' ? 'bg-[#1B2541]' : ''}`}>
             <AlertCircle size={16} className="mr-2"/> Nómina Actual
           </Button>
           <Button variant={activeTab === 'HISTORY' ? 'default' : 'outline'} onClick={() => setActiveTab('HISTORY')} className={`whitespace-nowrap ${activeTab === 'HISTORY' ? 'bg-[#1B2541]' : ''}`}>
             <History size={16} className="mr-2"/> Historial
           </Button>
        </div>

        {/* VISTA A: PENDIENTE */}
        {activeTab === 'PENDING' && (
           <Card className="shadow-lg border-0 overflow-hidden">
             <CardHeader className="border-b pb-4 bg-orange-50 px-4 md:px-6">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-orange-900 text-lg">Acumulado Semanal</CardTitle>
                    <p className="text-xs text-orange-700 mt-1">Valores pendientes por liquidar.</p>
                  </div>
                  <Button onClick={handleCutoff} className="bg-green-600 hover:bg-green-700 text-white font-bold w-full md:w-auto shadow-sm">
                     <CalendarCheck size={18} className="mr-2"/> LIQUIDAR TODO
                  </Button>
               </div>
             </CardHeader>
             <CardContent className="p-0 overflow-x-auto">
               <Table className="min-w-[650px] md:min-w-full">
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-[200px]">Colaborador / Detalle</TableHead>
                     <TableHead className="text-center w-[80px]">Días</TableHead>
                     <TableHead className="text-right">Base</TableHead>
                     <TableHead className="text-center">Prod.</TableHead>
                     <TableHead className="text-right">Comisión</TableHead>
                     <TableHead className="text-right font-black bg-slate-50">TOTAL</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {pendingPayroll.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">Todo al día. No hay deuda.</TableCell></TableRow>
                   ) : pendingPayroll.map((row) => (
                     <TableRow key={row.user.id} className="hover:bg-slate-50 border-b">
                       <TableCell className="align-top py-4">
                         <div className="font-bold text-[#1B2541] text-base">{row.user.fullName}</div>
                         <div className="text-[10px] text-slate-500 mt-2 flex flex-col gap-1.5 border-l-2 border-slate-200 pl-2">
                            {row.details.map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="font-bold w-5 text-slate-700">{new Date(d.date).getDate()}</span>
                                    {d.activity === 'FLYERS' ? (
                                        <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[9px] font-bold border border-purple-200 flex items-center gap-1">
                                            <Megaphone size={10}/> Volanteo
                                        </span>
                                    ) : (
                                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-200 flex items-center gap-1">
                                            <PenTool size={10}/> {d.planillas} Pl.
                                        </span>
                                    )}
                                    <span className="text-slate-400 italic truncate max-w-[100px]">{d.sector}</span>
                                </div>
                            ))}
                         </div>
                       </TableCell>
                       <TableCell className="text-center align-top py-4 text-slate-600 font-medium">{row.daysWorked}</TableCell>
                       <TableCell className="text-right align-top py-4 text-slate-600">{formatMoney(row.totalBase)}</TableCell>
                       <TableCell className="text-center align-top py-4 font-bold text-slate-800 bg-yellow-50/50">{row.totalPlanillas}</TableCell>
                       <TableCell className="text-right align-top py-4 text-slate-600 bg-yellow-50/50">{formatMoney(row.totalCommission)}</TableCell>
                       <TableCell className="text-right align-top py-4 font-black text-lg text-[#1B2541] bg-slate-50">{formatMoney(row.grandTotal)}</TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        )}

        {/* VISTA B: HISTORIAL (CLICKEABLE PARA AUDITORÍA) */}
        {activeTab === 'HISTORY' && (
            <div className="flex flex-col gap-4">
                {historyCuts.length === 0 && <div className="text-center text-slate-400 py-10">Sin historial.</div>}
                
                {historyCuts.map((cut) => (
                    <Card 
                        key={cut.id} 
                        // CLASE CURSOR-POINTER Y ONCLICK AGREGADOS
                        className="hover:shadow-md transition-shadow border-l-4 border-l-green-500 cursor-pointer group active:scale-[0.99] transition-transform"
                        onClick={() => openAudit(cut.id)}
                    >
                        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2.5 rounded-full text-green-700 shrink-0 group-hover:bg-green-200 transition-colors">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#1B2541] capitalize">{formatDate(cut.cutDate)}</h4>
                                    {/* Indicador visual de que es clickeable */}
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                       <Search size={10}/> Ver auditoría ({cut.usersCount} personas)
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-between w-full sm:w-auto sm:justify-end gap-6 sm:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Total Pl.</p>
                                    <p className="font-bold text-slate-700 text-lg">{cut.totalPlanillas}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Liquidado</p>
                                    <p className="font-black text-xl text-green-600">{formatMoney(cut.totalPaid)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>

      {/* === MODAL DE AUDITORÍA (DIALOG) === */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-[95%] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pr-8">
                <div className="flex items-center gap-2">
                    <FileText className="text-[#1B2541]"/>
                    <span>Auditoría de Pago</span>
                </div>
                {selectedCut && (
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-green-600">
                            {formatMoney(selectedCut.meta.totalPaid)}
                        </span>
                        <span className="text-xs text-slate-400 uppercase font-bold">Total Liquidado</span>
                    </div>
                )}
            </DialogTitle>
            <DialogDescription>
                Detalle de transacciones cerradas el día {selectedCut && formatDate(selectedCut.meta.date)}.
            </DialogDescription>
          </DialogHeader>

          {selectedCut ? (
             <div className="mt-2">
                <Table>
                    <TableHeader className="bg-slate-100/50">
                        <TableRow>
                            <TableHead className="font-bold text-[#1B2541]">Colaborador</TableHead>
                            <TableHead className="text-center font-bold text-[#1B2541]">Detalle Actividades</TableHead>
                            <TableHead className="text-right font-bold text-[#1B2541]">Pago</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedCut.details.map((row: any) => (
                            <TableRow key={row.user.id} className="border-b">
                                <TableCell className="align-top font-medium text-[#1B2541] py-4">
                                    {row.user.fullName}
                                    <div className="text-xs text-slate-400">{row.user.documentNumber}</div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="space-y-2">
                                        {row.details.map((d: any, i: number) => (
                                            <div key={i} className="flex flex-wrap sm:flex-nowrap items-center text-xs gap-2 border-b border-slate-50 pb-1 last:border-0">
                                                <span className="font-bold text-slate-600 w-12">{new Date(d.date).toLocaleDateString('es-CO', {day:'numeric', month:'short'})}</span>
                                                
                                                {d.activity === 'FLYERS' ? (
                                                    <span className="bg-purple-50 text-purple-700 px-1.5 rounded flex items-center gap-1 w-20 justify-center border border-purple-100">
                                                        <Megaphone size={10}/> Volanteo
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-50 text-blue-700 px-1.5 rounded flex items-center gap-1 w-20 justify-center border border-blue-100">
                                                        <PenTool size={10}/> {d.planillas} Pl.
                                                    </span>
                                                )}

                                                <span className="text-slate-400 italic truncate max-w-[100px] sm:max-w-[150px]">
                                                    {d.sector}
                                                </span>
                                                <span className="ml-auto font-mono text-slate-600 font-bold">
                                                    {formatMoney(d.total)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-black align-top text-slate-700 py-4 text-base">
                                    {formatMoney(row.grandTotal)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
          ) : (
            <div className="py-10 text-center text-slate-400 flex flex-col items-center">
                <Search className="mb-2 opacity-50"/>
                Cargando información...
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}