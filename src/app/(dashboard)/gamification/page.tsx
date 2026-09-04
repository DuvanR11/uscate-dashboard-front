'use client';

import React, { useEffect, useState } from 'react';
import { 
  Trophy, Star, TrendingUp, Users, Copy, 
  CheckCircle2, MessageCircle, ExternalLink, Info,
  Vote, UserPlus, Briefcase 
} from 'lucide-react';
import SocialTasksBoard from '@/components/dashboard/SocialTasksBoard';
import { GamificationService } from '@/services/gamification.service';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useBrandColors } from '@/hooks/use-brand-colors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    id: string; 
    leaderId?: string;
    totalPoints: number;
    fullName: string;
    completedTasks: number;
    nextGoalPoints: number;
    nextLevelName: string;
}

interface TeamMember {
    id: string;
    fullName: string;
    joinDate: string;
    isActive: boolean;
}

// --- COMPONENTE TOOLTIP ---
const InfoTooltip = ({ content }: { content: string }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help ml-2 inline-flex items-center justify-center">
           <Info className="h-3.5 w-3.5 text-slate-400 hover:text-secondary transition-colors" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="bg-primary text-white border-0 text-xs max-w-[200px] text-center leading-relaxed shadow-xl">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function GamificationPage() {
  const brand = useBrandColors();
  const [stats, setStats] = useState<UserStats | null>(null);
  
  // Estado para Votantes (Prospects) y Equipo (Búhos)
  const [prospects, setProspects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]); // Nuevo estado para Búhos
  
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar qué gráfica ver: 'prospects' (Votantes) o 'team' (Búhos)
  const [activeTab, setActiveTab] = useState<'prospects' | 'team'>('prospects');

  // --- CARGA DE DATOS ---
  const fetchUserProfile = async () => {
    try {
      const data = await GamificationService.getMyStats();
      setStats(data);
      
      // Cargamos votantes
      fetchProspects();
      
      // Cargamos equipo (Simulado por ahora, conecta tu API aquí)
      fetchTeamMembers();

    } catch (error) {
      console.error(error);
      toast.error("Error al cargar perfil");
    }
  };

  const fetchProspects = async () => {
    try {
      const { data } = await api.get('/leader/dashboard/stats'); 
      if (data.recent) setProspects(data.recent);
    } catch (error) { console.warn("Error prospects"); } 
  };

  // Reemplaza tu función actual con esta:

const fetchTeamMembers = async () => {
    try {
        // 1. Llamada a la API Real
        const { data } = await api.get('/users/my-team');
        
        // 2. Transformación de datos (Backend -> Frontend Interface)
        const formattedMembers = data.map((member: any) => ({
            id: member.id,
            fullName: member.fullName,
            // Convertimos la fecha ISO a algo legible (Ej: 2026-01-20)
            joinDate: new Date(member.createdAt).toLocaleDateString('es-CO', {
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit'
            }),
            isActive: member.isActive,
            // Agrega puntos si quieres mostrarlos en el futuro
            // points: member.totalPoints 
        }));

        setTeamMembers(formattedMembers);
        
    } catch (error) {
        console.error("Error cargando equipo:", error);
        // Opcional: toast.error("No se pudo cargar tu equipo");
    } finally {
        setLoading(false);
    }
};

  useEffect(() => { fetchUserProfile(); }, []);

  // --- LÓGICA DE NIVELES ---
  const userLevel = !stats ? '...' : (
      stats.totalPoints >= 1000 ? 'Búho Dorado 🏆' : 
      stats.totalPoints >= 500 ? 'Búho Plateado 🥈' : 
      stats.totalPoints >= 100 ? 'Búho de Bronce 🥉' : 'Búho Novato 🐣'
  );

  const progressToNextLevel = stats 
    ? (stats.totalPoints / (stats.totalPoints + stats.nextGoalPoints)) * 100 
    : 0;

  // --- PREPARACIÓN DE DATOS PARA GRÁFICAS ---
  
  // Gráfica Votantes
  const chartDataProspects = [
    { name: 'Captados', value: prospects.length, fill: '#3b82f6' },
    { name: 'Confirmados', value: prospects.filter(p => p.voteConfirmed).length, fill: '#22c55e' },
  ];

  // Gráfica Búhos (Equipo)
  const chartDataTeam = [
    { name: 'Total Equipo', value: teamMembers.length, fill: brand.secondary },
    { name: 'Activos', value: teamMembers.filter(m => m.isActive).length, fill: brand.primary },
  ];

  // --- ACCIONES DE BOTONES (CORREGIDAS) ---

  const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : '';

  // A. Copiar Link Búho (Equipo)
  const handleCopyBuho = () => {
    if (!stats?.leaderId) return toast.error("Cargando ID de usuario...");
    const link = `${getOrigin()}/join?ref=${stats.leaderId}`;
    
    navigator.clipboard.writeText(link);
    toast.success('¡Enlace de EQUIPO copiado!', { description: 'Úsalo para invitar nuevos Búhos.' });
  };

  // B. WhatsApp Búho (Equipo)
  const handleWhatsAppBuho = () => {
    if (!stats?.leaderId) return toast.error("Cargando datos...");
    const link = `${getOrigin()}/join?ref=${stats.leaderId}`;
    
    const text = `¡Hola! Únete a mi equipo de Búhos Digitales 🦉. Tenemos misiones y premios exclusivos.\n\nRegístrate gratis aquí 👇\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // C. Copiar Link Votante
  const handleCopyVoter = () => {
    if (!stats?.leaderId) return toast.error("No tienes código de líder asignado aún.");
    const link = `${getOrigin()}/referido?ref=${stats.leaderId}`;
    
    navigator.clipboard.writeText(link);
    toast.success('¡Enlace de VOTANTE copiado!', { description: 'Compártelo para sumar votos.' });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden bg-primary text-white pt-10 pb-24 px-6 rounded-b-[3rem] shadow-xl border-b border-white/10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-64 h-64 bg-secondary rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500 rounded-full opacity-10 blur-2xl"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <span className="bg-white/10 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                  Zona Búho
                </span>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">
                Hola, {stats?.fullName?.split(' ')[0] || 'Activista'} 👋
              </h1>
              
              <p className="text-slate-300 text-lg max-w-lg leading-relaxed mb-8">
                Tienes dos formas de ganar: Recluta nuevos Búhos para tu equipo o refiere votantes directos.
              </p>
              
              {/* --- ZONA DE ACCIONES --- */}
              <div className="flex flex-col gap-4">
                
                {/* 1. GRUPO: INVITAR AL EQUIPO (BÚHOS) */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <p className="text-xs font-bold text-secondary uppercase mb-3 flex items-center gap-2">
                    <UserPlus size={14}/> Reclutar Equipo (Búhos)
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={handleWhatsAppBuho}
                      className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-lg active:scale-95 text-sm flex-1"
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </button>
                    <button 
                      onClick={handleCopyBuho}
                      className="bg-secondary hover:bg-[#ffd54f] text-primary px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-lg active:scale-95 text-sm flex-1"
                    >
                      <Copy size={16} /> Link Búho
                    </button>
                  </div>
                </div>

                {/* 2. GRUPO: REFERIR VOTANTES */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-colors">
                   <div className="bg-blue-500/20 p-2 rounded-lg">
                      <Vote size={20} className="text-blue-300" />
                   </div>
                   <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white">Referir Votante</p>
                      <p className="text-xs text-slate-400">Enlace para formulario de referidos</p>
                   </div>
                   <button 
                      onClick={handleCopyVoter}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition active:scale-95"
                   >
                      <Copy size={14} /> Copiar
                   </button>
                </div>

              </div>
            </div>

            {/* TARJETA DE PUNTOS */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-6 min-w-[300px] shadow-2xl relative overflow-hidden group hover:bg-white/10 transition-colors">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy size={80} />
              </div>
              <div className="bg-gradient-to-br from-secondary to-orange-500 p-4 rounded-xl text-primary shadow-lg">
                <Star size={32} fill="currentColor" className="animate-pulse-slow" />
              </div>
              <div className="relative z-10">
                <p className="text-xs text-slate-300 uppercase tracking-wider font-bold mb-1">Puntaje Total</p>
                <div className="flex flex-col">
                  <span className="text-5xl font-black tracking-tighter text-white">
                    {loading ? '...' : stats?.totalPoints || 0}
                  </span>
                  <span className="text-sm font-bold text-secondary mt-1 bg-secondary/10 px-2 py-0.5 rounded w-fit border border-secondary/20">
                    {userLevel}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- DASHBOARD CONTENT --- */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20 space-y-8">
        
        {/* 1. KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            icon={<Vote className="text-blue-500" />} 
            label="Mis Votantes" 
            value={String(prospects.length)} 
            sub="Referidos de voto"
            tooltip="Personas registradas como posibles votantes."
          />
          <StatCard 
            icon={<Briefcase className="text-secondary" />} 
            label="Mi Equipo" 
            value={String(teamMembers.length)} 
            sub="Búhos reclutados"
            tooltip="Personas que se han unido a tu equipo de trabajo."
          />
           <StatCard 
            icon={<TrendingUp className="text-green-500" />} 
            label="Próxima Meta" 
            value={loading ? "..." : (stats?.nextGoalPoints === 0 ? "¡Cima!" : `${stats?.nextGoalPoints} pts`)} 
            sub={stats?.nextGoalPoints === 0 ? "Nivel Leyenda" : `Para ser ${stats?.nextLevelName}`}
            tooltip="Puntos necesarios para subir de nivel."
            progress={progressToNextLevel}
          />
        </div>

        {/* 2. GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMNA IZQUIERDA (2/3): MISIONES */}
            <div className="lg:col-span-2 space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                            <div className="bg-secondary p-1.5 rounded-lg text-primary">
                                <Star size={18} fill="currentColor" /> 
                            </div>
                            Misiones Activas
                        </h2>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                        <SocialTasksBoard onTaskCompleted={fetchUserProfile} />
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA (1/3): GESTIÓN DE EQUIPO Y VOTANTES */}
            <div className="space-y-6">
                
                {/* SWITCHER DE PESTAÑAS (TABS) */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex">
                   <button 
                      onClick={() => setActiveTab('prospects')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                         activeTab === 'prospects' 
                         ? 'bg-primary text-white shadow' 
                         : 'text-slate-500 hover:bg-slate-50'
                      }`}
                   >
                      Referidos (Votantes)
                   </button>
                   <button 
                      onClick={() => setActiveTab('team')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                         activeTab === 'team' 
                         ? 'bg-secondary text-primary shadow' 
                         : 'text-slate-500 hover:bg-slate-50'
                      }`}
                   >
                      Mi Equipo (Búhos)
                   </button>
                </div>

                {/* CONTENIDO DINÁMICO SEGÚN PESTAÑA */}
                <Card className="shadow-sm border border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-primary">
                            {activeTab === 'prospects' ? 'Estadísticas Votantes' : 'Estadísticas de Equipo'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                         <ResponsiveContainer width="100%" height="100%">
                             <BarChart 
                               data={activeTab === 'prospects' ? chartDataProspects : chartDataTeam} 
                               margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                             >
                                 <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                 <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false}/>
                                 <RechartsTooltip 
                                     cursor={{fill: '#f8fafc'}}
                                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                 />
                                 <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                     {(activeTab === 'prospects' ? chartDataProspects : chartDataTeam).map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={entry.fill} />
                                     ))}
                                 </Bar>
                             </BarChart>
                         </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* LISTADO DINÁMICO */}
                <Card className="shadow-sm border border-slate-200 flex flex-col max-h-[500px]">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                        <CardTitle className="text-base font-bold text-primary flex justify-between items-center">
                            {activeTab === 'prospects' ? 'Últimos Votantes' : 'Miembros del Equipo'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-hidden flex flex-col flex-1">
                        
                        {/* RENDERIZADO CONDICIONAL DE LISTA */}
                        <div className="divide-y divide-slate-100 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                            
                            {/* CASO: VOTANTES */}
                            {activeTab === 'prospects' && prospects.map((prospect) => (
                                <div key={prospect.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-10 rounded-full transition-colors ${prospect.voteConfirmed ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{prospect.firstName} {prospect.lastName}</p>
                                            <p className="text-[10px] text-slate-500 uppercase">{prospect.voteConfirmed ? 'Confirmado' : 'Pendiente'}</p>
                                        </div>
                                    </div>
                                    {prospect.phone && (
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => window.open(`https://wa.me/57${prospect.phone}`, '_blank')}>
                                          <MessageCircle className="h-4 w-4" />
                                      </Button>
                                    )}
                                </div>
                            ))}

                            {/* CASO: EQUIPO (BÚHOS) */}
                            {activeTab === 'team' && teamMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-10 rounded-full bg-secondary`}></div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{member.fullName}</p>
                                            <p className="text-[10px] text-slate-500">Unido: {member.joinDate}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">Búho</span>
                                </div>
                            ))}

                            {/* ESTADOS VACÍOS */}
                            {activeTab === 'prospects' && prospects.length === 0 && (
                                <div className="p-8 text-center text-xs text-slate-400">No tienes referidos de voto aún.</div>
                            )}
                            {activeTab === 'team' && teamMembers.length === 0 && (
                                <div className="p-8 text-center text-xs text-slate-400">No tienes equipo reclutado aún.</div>
                            )}

                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENT (Igual que antes) ---
function StatCard({ icon, label, value, sub, tooltip, progress }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4 hover:shadow-md transition-shadow relative overflow-hidden">
      {progress !== undefined && (
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
            <div className="h-full bg-secondary" style={{ width: `${Math.min(100, progress)}%` }}></div>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">{icon}</div>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-black text-primary">{value}</p>
        <p className="text-xs text-slate-400 font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}