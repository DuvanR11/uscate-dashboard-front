'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Trophy, Medal, Users, Target, Calendar, 
  Filter, Download, ArrowUpRight, Award 
} from 'lucide-react';
import { toast } from 'sonner';
import { GamificationService } from '@/services/gamification.service'; // Ajusta tu import
import { useBrandColors } from '@/hooks/use-brand-colors';

// --- TIPOS ---
interface RankingUser {
  rank: number;
  id: string;
  fullName: string;
  email: string;
  totalPoints: number;      // Histórico
  periodPoints: number;     // Del periodo seleccionado
  completedTasksCount: number;
  tasksByPlatform: Record<string, number>;
}

interface StatsResponse {
  period: 'weekly' | 'monthly' | 'all';
  totalParticipants: number;
  ranking: RankingUser[];
}

// Colores para las gráficas
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: '#E1306C',
  FACEBOOK: '#1877F2',
  TIKTOK: '#000000',
  X: '#1DA1F2',
  YOUTUBE: '#FF0000'
};

export default function AdminStatsPage() {
  const brand = useBrandColors();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('weekly');
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    try {
      setLoading(true);
      // Asumiendo que agregaste este método en el frontend service como te indiqué antes
      const response = await GamificationService.getLeaderboardStats(period);
      setData(response);
    } catch (error) {
      console.error(error);
      toast.error('Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  };

  // --- CÁLCULOS PARA GRÁFICAS ---
  
  // 1. Datos para Gráfica de Barras (Top 10)
  const barData = useMemo(() => {
    if (!data) return [];
    return data.ranking.slice(0, 10).map(u => ({
      name: u.fullName.split(' ')[0], // Solo primer nombre para que quepa
      points: u.periodPoints,
      full: u.fullName
    }));
  }, [data]);

  // 2. Datos para Gráfica Circular (Plataformas)
  const pieData = useMemo(() => {
    if (!data) return [];
    const aggregator: Record<string, number> = {};
    
    data.ranking.forEach(user => {
      Object.entries(user.tasksByPlatform).forEach(([platform, count]) => {
        aggregator[platform] = (aggregator[platform] || 0) + count;
      });
    });

    return Object.entries(aggregator).map(([name, value]) => ({ name, value }));
  }, [data]);

  // 3. Totales
  const totalPeriodPoints = useMemo(() => {
    if (!data) return 0;
    return data.ranking.reduce((acc, curr) => acc + curr.periodPoints, 0);
  }, [data]);

  const totalTasks = useMemo(() => {
    if (!data) return 0;
    return data.ranking.reduce((acc, curr) => acc + curr.completedTasksCount, 0);
  }, [data]);


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* --- HEADER --- */}
      <div className="bg-primary text-white pt-8 pb-20 px-6 relative overflow-hidden shadow-lg">
         <div className="absolute top-0 right-0 -mt-4 -mr-4 w-64 h-64 bg-secondary rounded-full opacity-5 blur-3xl"></div>
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end relative z-10 gap-4">
            <div>
                <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                    📊 Tablero de Mando Gamificación
                </h1>
                <p className="text-slate-300 text-sm max-w-lg">
                    Analiza el rendimiento de tus Búhos, mide el impacto de las misiones y detecta a los líderes.
                </p>
            </div>

            {/* Selector de Periodo */}
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-lg flex items-center border border-white/10">
                <button 
                    onClick={() => setPeriod('weekly')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${period === 'weekly' ? 'bg-secondary text-primary shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                >
                    Semanal
                </button>
                <button 
                    onClick={() => setPeriod('monthly')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${period === 'monthly' ? 'bg-secondary text-primary shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                >
                    Mensual
                </button>
                <button 
                    onClick={() => setPeriod('all')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${period === 'all' ? 'bg-secondary text-primary shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                >
                    Histórico
                </button>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-20 space-y-6">

        {/* --- 1. KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard 
                title="Búhos Activos" 
                value={data?.totalParticipants || 0} 
                icon={Users} 
                color="blue"
            />
            <KpiCard 
                title="Puntos Generados" 
                value={totalPeriodPoints} 
                icon={Trophy} 
                color="yellow"
                suffix=" pts"
            />
            <KpiCard 
                title="Misiones Completadas" 
                value={totalTasks} 
                icon={Target} 
                color="green"
            />
            <KpiCard 
                title="Líder Actual" 
                value={data?.ranking[0]?.fullName || 'N/A'} 
                icon={Award} 
                color="purple"
                isText
            />
        </div>

        {/* --- 2. GRÁFICAS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfica de Barras (Top Users) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-primary text-lg flex items-center gap-2">
                        <Trophy size={20} className="text-secondary"/> Top 10 Búhos (Por Puntos)
                    </h3>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false}/>
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            />
                            <Bar dataKey="points" fill={brand.primary} radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gráfica Circular (Plataformas) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-primary text-lg mb-6 flex items-center gap-2">
                    <Target size={20} className="text-blue-500"/> Impacto por Red
                </h3>
                <div className="h-64 w-full relative">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={PLATFORM_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            No hay datos suficientes
                        </div>
                    )}
                    {/* Centro del Donut */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                        <div className="text-center">
                            <span className="block text-2xl font-black text-primary">{totalTasks}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Misiones</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- 3. TABLA DE RANKING DETALLADA --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-primary text-lg">Ranking Detallado</h3>
                <button className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
                    <Download size={14}/> Exportar CSV
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Rank</th>
                            <th className="px-6 py-4">Búho</th>
                            <th className="px-6 py-4 text-center">Pts. Periodo</th>
                            <th className="px-6 py-4 text-center">Pts. Totales</th>
                            <th className="px-6 py-4 text-center">Misiones</th>
                            <th className="px-6 py-4 text-center">Eficacia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data?.ranking.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                                        user.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                        user.rank === 2 ? 'bg-slate-200 text-slate-600' :
                                        user.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                        'bg-white text-slate-400 border border-slate-200'
                                    }`}>
                                        {user.rank <= 3 ? <Medal size={16}/> : user.rank}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-primary">{user.fullName}</span>
                                        <span className="text-xs text-slate-400">{user.email}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-block px-3 py-1 bg-green-50 text-green-700 font-bold rounded-full">
                                        +{user.periodPoints}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center font-medium text-slate-600">
                                    {user.totalPoints}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {user.completedTasksCount}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {/* Un cálculo dummy de eficacia (puntos promedio por misión) */}
                                    {user.completedTasksCount > 0 
                                        ? Math.round(user.periodPoints / user.completedTasksCount) 
                                        : 0} pts/misión
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {data?.ranking.length === 0 && (
                <div className="p-10 text-center text-slate-400">
                    No hay datos registrados en este periodo.
                </div>
            )}
        </div>

      </div>
    </div>
  );
}

// --- SUBCOMPONENTE DE KPI ---
function KpiCard({ title, value, icon: Icon, color, suffix = '', isText = false }: any) {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{title}</p>
                <p className={`font-black text-primary ${isText ? 'text-lg leading-tight' : 'text-2xl'}`}>
                    {value}{!isText && suffix}
                </p>
            </div>
        </div>
    );
}