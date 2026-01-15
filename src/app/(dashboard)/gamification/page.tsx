'use client';

import React, { useEffect, useState } from 'react';
import { 
  Trophy, Star, TrendingUp, Users, Share2, Copy, 
  CheckCircle2, MessageCircle, ExternalLink, Info 
} from 'lucide-react';
import SocialTasksBoard from '@/components/dashboard/SocialTasksBoard';
import { GamificationService } from '@/services/gamification.service';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';

// --- TIPOS ---
interface UserStats {
  totalPoints: number;
  fullName: string;
  leaderId?: string;
  completedTasks: number;
  nextGoalPoints: number;
  nextLevelName: string;
}

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  voteConfirmed: boolean;
}

// --- COMPONENTE TOOLTIP ---
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

export default function GamificationPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [userLevel, setUserLevel] = useState('Cargando...');
  const [loading, setLoading] = useState(true);

  // Datos para la gráfica (Mockeados o calculados de prospects)
  // En un caso real, el backend debería devolver esto agrupado
  const chartData = [
    { name: 'Captados', value: prospects.length, fill: '#3b82f6' }, // Azul
    { name: 'Confirmados', value: prospects.filter(p => p.voteConfirmed).length, fill: '#22c55e' }, // Verde
  ];

  const fetchUserProfile = async () => {
    try {
      const data = await GamificationService.getMyStats();
      setStats(data);
      fetchProspects();
    } catch (error) {
      console.error("Error cargando perfil:", error);
    }
  };

  const fetchProspects = async () => {
    try {
      const { data } = await api.get('/leader/dashboard/stats'); 
      if (data.recent) {
        setProspects(data.recent);
      }
    } catch (error) {
      console.warn("No se pudieron cargar referidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (!stats) return;
    const points = stats.totalPoints;
    if (points >= 1000) setUserLevel('Búho Dorado 🏆');
    else if (points >= 500) setUserLevel('Búho Plateado 🥈');
    else if (points >= 100) setUserLevel('Búho de Bronce 🥉');
    else setUserLevel('Búho Novato 🐣');
  }, [stats]);

  const copyReferralLink = () => {
    const leaderId = stats?.leaderId;
    if (!leaderId) return toast.error("No tienes código de referido activo.");
    
    const link = `${window.location.origin}/referido?ref=${leaderId}`;
    navigator.clipboard.writeText(link);
    toast.success("Enlace copiado. ¡Compártelo!");
  };

  const sendWhatsApp = (phone: string, name: string) => {
    const msg = `Hola ${name}, gracias por sumarte. ¿Ya viste las nuevas misiones?`;
    window.open(`https://wa.me/57${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Calculo de progreso hacia el siguiente nivel
  const progressToNextLevel = stats 
    ? (stats.totalPoints / (stats.totalPoints + stats.nextGoalPoints)) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      
      {/* --- HERO SECTION CORPORATIVA --- */}
      <div className="relative overflow-hidden bg-[#1B2541] text-white pt-10 pb-24 px-6 rounded-b-[3rem] shadow-xl border-b border-white/10">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-64 h-64 bg-[#FFC400] rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500 rounded-full opacity-10 blur-2xl"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-white/10 text-[#FFC400] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                  Zona Búho
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">
                Hola, {stats?.fullName?.split(' ')[0] || 'Activista'} 👋
              </h1>
              <p className="text-slate-300 text-lg max-w-lg leading-relaxed">
                Tu influencia digital es clave. Completa misiones y suma votos a la causa.
              </p>
              
              <button 
                onClick={copyReferralLink}
                className="mt-6 bg-[#FFC400] hover:bg-[#ffd54f] text-[#1B2541] px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-yellow-900/20 active:scale-95 group"
              >
                <Share2 size={18} className="group-hover:scale-110 transition-transform"/> 
                Copiar Link de Referido
              </button>
            </div>

            {/* Tarjeta de Puntos Premium */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-6 min-w-[300px] shadow-2xl relative overflow-hidden group hover:bg-white/10 transition-colors">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy size={80} />
              </div>
              
              <div className="bg-gradient-to-br from-[#FFC400] to-orange-500 p-4 rounded-xl text-[#1B2541] shadow-lg">
                <Star size={32} fill="currentColor" className="animate-pulse-slow" />
              </div>
              
              <div className="relative z-10">
                <p className="text-xs text-slate-300 uppercase tracking-wider font-bold mb-1">Puntaje Total</p>
                <div className="flex flex-col">
                  <span className="text-5xl font-black tracking-tighter text-white">
                    {loading ? '...' : stats?.totalPoints || 0}
                  </span>
                  <span className="text-sm font-bold text-[#FFC400] mt-1 bg-[#FFC400]/10 px-2 py-0.5 rounded w-fit border border-[#FFC400]/20">
                    {userLevel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20 space-y-8">
        
        {/* --- KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            icon={<Users className="text-blue-500" />} 
            label="Mis Referidos" 
            value={String(prospects.length)} 
            sub="Personas registradas"
            tooltip="Total de personas que se han registrado usando tu enlace."
          />
          <StatCard 
            icon={<CheckCircle2 className="text-green-500" />} 
            label="Misiones Completadas" 
            value={loading ? "..." : String(stats?.completedTasks || 0)} 
            sub="Tareas verificadas"
            tooltip="Número de tareas que la IA o el administrador han aprobado."
          />
           <StatCard 
            icon={<TrendingUp className="text-[#FFC400]" />} 
            label="Próxima Meta" 
            value={loading ? "..." : (stats?.nextGoalPoints === 0 ? "¡Cima!" : `${stats?.nextGoalPoints} pts`)} 
            sub={stats?.nextGoalPoints === 0 ? "Nivel Leyenda alcanzado" : `Para ser ${stats?.nextLevelName}`}
            tooltip="Puntos necesarios para alcanzar el siguiente rango de Búho."
            progress={progressToNextLevel}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- COLUMNA IZQUIERDA (2/3): MISIONES --- */}
            <div className="lg:col-span-2 space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-[#1B2541] flex items-center gap-2">
                            <div className="bg-[#FFC400] p-1.5 rounded-lg text-[#1B2541]">
                                <Star size={18} fill="currentColor" /> 
                            </div>
                            Misiones Activas
                        </h2>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                            Gana Puntos Extra
                        </span>
                    </div>
                    {/* Le pasamos className para que se adapte al contenedor */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                        <SocialTasksBoard onTaskCompleted={fetchUserProfile} />
                    </div>
                </div>
            </div>

            {/* --- COLUMNA DERECHA (1/3): REFERIDOS Y GRÁFICA --- */}
            <div className="space-y-6">
                
                {/* 1. Gráfica de Rendimiento */}
                <Card className="shadow-sm border border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-[#1B2541]">Rendimiento de Referidos</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        {prospects.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false}/>
                                    <RechartsTooltip 
                                        cursor={{fill: '#f8fafc'}}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center px-4">
                                <Users size={32} className="mb-2 opacity-50" />
                                <p>Aún no hay datos para graficar. ¡Empieza a compartir tu link!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Lista de Referidos */}
                <Card className="shadow-sm border border-slate-200 flex flex-col max-h-[500px]">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                        <CardTitle className="text-base font-bold text-[#1B2541] flex justify-between items-center">
                            Últimos Referidos
                            <span className="text-[10px] font-normal bg-white border px-2 py-0.5 rounded text-slate-500">Recientes</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-hidden flex flex-col flex-1">
                        {prospects.length === 0 ? (
                            <div className="text-center py-10 px-4">
                                <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Users className="h-6 w-6 text-slate-300" />
                                </div>
                                <p className="text-slate-500 text-sm font-medium">Sin referidos aún.</p>
                                <button onClick={copyReferralLink} className="text-[#1B2541] font-bold text-xs hover:underline mt-1">
                                    Copiar link
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                                {prospects.map((prospect) => (
                                    <div key={prospect.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-10 rounded-full transition-colors ${prospect.voteConfirmed ? 'bg-green-500' : 'bg-slate-200 group-hover:bg-blue-300'}`}></div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">
                                                    {prospect.firstName} {prospect.lastName}
                                                </p>
                                                <p className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">
                                                    {prospect.voteConfirmed ? (
                                                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={10}/> Confirmado</span>
                                                    ) : (
                                                        <span className="text-slate-400">Pendiente</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {prospect.phone && (
                                            <Button 
                                                size="icon" 
                                                variant="ghost"
                                                className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700 border border-transparent hover:border-green-100"
                                                onClick={() => sendWhatsApp(prospect.phone!, prospect.firstName)}
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {prospects.length > 0 && (
                            <div className="p-3 bg-slate-50 text-center border-t border-slate-100 mt-auto">
                                <Button variant="link" className="text-[#1B2541] text-xs font-bold h-auto p-0">
                                    Ver listado completo <ExternalLink size={10} className="ml-1"/>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENT: STAT CARD ---
function StatCard({ icon, label, value, sub, tooltip, progress }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4 hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Barra de progreso superior si aplica */}
      {progress !== undefined && (
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
            <div className="h-full bg-[#FFC400]" style={{ width: `${Math.min(100, progress)}%` }}></div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            {icon}
        </div>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-black text-[#1B2541]">{value}</p>
        <p className="text-xs text-slate-400 font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}