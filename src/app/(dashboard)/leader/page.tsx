'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, CheckCircle2, Share2, MessageCircle, 
  Trophy, TrendingUp, Info, ExternalLink, Copy, Phone 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- COMPONENTE AUXILIAR: TOOLTIP EDUCATIVO ---
const InfoTooltip = ({ content }: { content: string }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help ml-2 inline-flex items-center justify-center">
           <Info className="h-3.5 w-3.5 text-slate-400 hover:text-[#FFC400] transition-colors" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="bg-[#1B2541] text-white border-0 text-xs max-w-[200px] text-center leading-relaxed shadow-xl">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function LeaderDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Meta del Líder (Puedes traerla del backend si existe)
  const GOAL = 100; 

  useEffect(() => {
    api.get('/leader/dashboard/stats')
       .then(res => setStats(res.data))
       .catch(err => {
           console.error(err);
           toast.error("Error cargando estadísticas");
       })
       .finally(() => setLoading(false));
  }, []);

  const copyReferralLink = () => {
     // CORRECCIÓN: Validamos que exista el ID real
     const leaderId = stats?.leaderId;

     if (!leaderId) {
         toast.error("No se encontró tu código de líder. Recarga la página.");
         return;
     }

     const link = `${window.location.origin}/referido?ref=${leaderId}`;
     
     navigator.clipboard.writeText(link);
     toast.success("Enlace copiado. ¡Compártelo por WhatsApp!");
  };

  const sendWhatsApp = (phone: string, name: string) => {
      const msg = `Hola ${name}, gracias por sumarte a nuestro equipo. ¿Tienes dudas sobre tu puesto de votación?`;
      window.open(`https://wa.me/57${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B2541]"></div>
            <p className="text-sm text-slate-500 animate-pulse">Cargando tu comando...</p>
        </div>
    </div>
  );

  if (!stats) return <div className="p-8 text-center text-red-500">No se pudo cargar la información.</div>;

  // Calculo seguro del progreso para evitar NaN
  const progressValue = stats.kpi?.total > 0 ? (stats.kpi.total / GOAL) * 100 : 0;

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50/50 min-h-screen pb-20 fade-in animate-in">
      
      {/* 1. HEADER DE BIENVENIDA Y META */}
      <div className="relative overflow-hidden bg-[#1B2541] text-white p-6 md:p-8 rounded-3xl shadow-xl border border-white/10">
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-[#FFC400] rounded-full opacity-10 blur-3xl"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-6">
              <div>
                  <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">¡Hola, Líder! 👋</h1>
                  <p className="text-slate-300 text-sm md:text-base max-w-md leading-relaxed">
                      Tu gestión es el motor de esta campaña. Revisa tus métricas y sigue sumando votos.
                  </p>
              </div>
              
              <div className="w-full md:w-1/3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider mb-3">
                      <span className="text-[#FFC400] flex items-center gap-1">
                          Tu Meta <InfoTooltip content={`Tu objetivo personal es llegar a ${GOAL} votos confirmados.`} />
                      </span>
                      <span className="text-white">{stats.kpi?.total || 0} / {GOAL}</span>
                  </div>
                  
                  {/* BARRA DE PROGRESO */}
                  <Progress 
                    value={progressValue} 
                    className="h-3 bg-slate-700/50" 
                    indicatorClassName="bg-[#FFC400] shadow-[0_0_10px_rgba(255,196,0,0.5)]" 
                  />
                  
                  <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
                      <span>Progreso: {Math.round(progressValue)}%</span>
                      <span>Faltan {Math.max(0, GOAL - (stats.kpi?.total || 0))}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* 2. KPI CARDS (GRID RESPONSIVE) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {/* Card 1: Total */}
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
             <CardContent className="pt-6 relative">
                 <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold flex items-center">
                    Inscritos <InfoTooltip content="Total de personas registradas bajo tu código." />
                 </p>
                 <h3 className="text-2xl md:text-4xl font-black text-slate-800 mt-1">{stats.kpi?.total || 0}</h3>
                 <Users className="h-8 w-8 text-blue-100 absolute top-4 right-4" />
             </CardContent>
          </Card>

          {/* Card 2: Confirmados */}
          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all bg-green-50/30">
             <CardContent className="pt-6 relative">
                 <p className="text-[10px] md:text-xs text-green-700 uppercase font-bold flex items-center">
                    Votos Fijos <InfoTooltip content="Personas que ya confirmaron su intención de voto." />
                 </p>
                 <h3 className="text-2xl md:text-4xl font-black text-green-800 mt-1">{stats.kpi?.confirmed || 0}</h3>
                 <CheckCircle2 className="h-8 w-8 text-green-200 absolute top-4 right-4" />
             </CardContent>
          </Card>

          {/* Card 3: Efectividad */}
          <Card className="border-l-4 border-l-[#FFC400] shadow-sm hover:shadow-md transition-all">
             <CardContent className="pt-6 relative">
                 <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold flex items-center">
                    Efectividad <InfoTooltip content="% de tus inscritos que ya son Votos Confirmados." />
                 </p>
                 <h3 className="text-2xl md:text-4xl font-black text-slate-800 mt-1">{stats.kpi?.completionRate || 0}%</h3>
                 <TrendingUp className="h-8 w-8 text-yellow-100 absolute top-4 right-4" />
             </CardContent>
          </Card>
          
          {/* Card 4: Acción (Compartir) */}
          <Card 
            className="bg-[#1B2541] text-white shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all group border-0" 
            onClick={copyReferralLink}
          >
             <CardContent className="pt-0 flex flex-col items-center justify-center h-full text-center p-6 relative overflow-hidden">
                 {/* Efecto hover */}
                 <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 
                 <div className="bg-white/10 p-3 rounded-full mb-3 group-hover:bg-[#FFC400] group-hover:text-[#1B2541] transition-colors shadow-lg">
                    <Share2 className="h-6 w-6" />
                 </div>
                 <p className="text-xs font-bold uppercase tracking-wider relative z-10">Copiar Link</p>
                 <span className="text-[10px] text-slate-400 mt-1 relative z-10">Para enviar por WhatsApp</span>
             </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 3. GRÁFICA DE PIRÁMIDE */}
          <Card className="col-span-1 lg:col-span-2 shadow-md border-0 ring-1 ring-slate-100">
              <CardHeader className="border-b border-slate-50 pb-4">
                  <CardTitle className="text-lg font-bold text-[#1B2541] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-[#FFC400]" /> 
                        Embudo de Gestión
                        <InfoTooltip content="Muestra el avance de tus inscritos: Captados -> Contactados -> Confirmados." />
                      </div>
                  </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] pt-6">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                          data={stats.pyramidData} 
                          layout="vertical" 
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                          <XAxis type="number" hide />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={110} 
                            tick={{fontSize: 11, fontWeight: 600, fill: '#64748b'}} 
                          />
                          <RechartsTooltip 
                              cursor={{fill: '#f1f5f9'}}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={35} animationDuration={1500}>
                            {stats.pyramidData?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
                  <div className="bg-slate-50 p-2 rounded-lg text-center mt-2">
                      <p className="text-xs text-slate-500">
                          💡 <strong>Tip:</strong> Llama a los "Captados" para convertirlos en "Confirmados".
                      </p>
                  </div>
              </CardContent>
          </Card>

          {/* 4. LISTA RÁPIDA DE GESTIÓN */}
          <Card className="shadow-md border-0 ring-1 ring-slate-100 flex flex-col">
              <CardHeader className="border-b border-slate-50 pb-4 bg-slate-50/50">
                  <CardTitle className="text-base font-bold text-[#1B2541] flex justify-between items-center">
                      Últimos Inscritos
                      <span className="text-[10px] font-normal text-slate-500 bg-white px-2 py-1 rounded-full border shadow-sm">
                          Recientes
                      </span>
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden flex flex-col p-4">
                  <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[300px] lg:max-h-none scrollbar-thin scrollbar-thumb-slate-200">
                      {stats.recent?.map((prospect: any) => (
                          <div key={prospect.id} className="group flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-3">
                                  {/* Indicador de Estado */}
                                  <div className={`w-1.5 h-10 rounded-full transition-colors ${prospect.voteConfirmed ? 'bg-green-500' : 'bg-slate-200 group-hover:bg-blue-400'}`}></div>
                                  
                                  <div>
                                      <p className="text-sm font-bold text-slate-700 leading-none mb-1">
                                          {prospect.firstName} {prospect.lastName}
                                      </p>
                                      {prospect.voteConfirmed ? (
                                          <span className="inline-flex items-center text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md">
                                              CONFIRMADO
                                          </span>
                                      ) : (
                                          <span className="text-[10px] font-medium text-slate-400">
                                              Pendiente validación
                                          </span>
                                      )}
                                  </div>
                              </div>
                              
                              {prospect.phone && (
                                  <Button 
                                    size="icon" 
                                    className="h-9 w-9 rounded-full bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border border-green-100 shadow-sm transition-all"
                                    onClick={() => sendWhatsApp(prospect.phone, prospect.firstName)}
                                    title="Contactar por WhatsApp"
                                  >
                                      <MessageCircle className="h-4 w-4" />
                                  </Button>
                              )}
                          </div>
                      ))}
                      
                      {(!stats.recent || stats.recent.length === 0) && (
                          <div className="text-center py-10 px-4">
                              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <Users className="h-8 w-8 text-slate-300" />
                              </div>
                              <p className="text-sm text-slate-600 font-bold">Aún no hay inscritos</p>
                              <p className="text-xs text-slate-400 mt-1 max-w-[180px] mx-auto">
                                  Comparte tu link para empezar a ver gente en esta lista.
                              </p>
                          </div>
                      )}
                  </div>

                  {stats.recent?.length > 0 && (
                      <Button variant="ghost" className="w-full text-xs mt-4 text-slate-500 hover:text-[#1B2541] border border-dashed border-slate-200 hover:bg-white">
                          Ver lista completa <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                  )}
              </CardContent>
          </Card>
      </div>
    </div>
  );
}