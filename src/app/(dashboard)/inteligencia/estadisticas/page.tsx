'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, TrendingUp, Map, ArrowLeft, BarChart3, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import ExportPdfButton from '@/components/dashboard/intelligence/ExportPdfButton';

// Colores para el gráfico de dona
const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#64748b'];

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/intelligence/analytics');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (error) {
        toast.error("Error cargando los datos estadísticos");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-[#1B2541]">
        <Loader2 size={48} className="animate-spin mb-4 text-[#FFC400]" />
        <h2 className="text-xl font-black tracking-tight">Consolidando Estadísticas...</h2>
      </div>
    );
  }

  if (!data) return null;

  const highestLocation = data.locations[0]?.name || 'N/A';

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen">
      
      {/* HEADER */}
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <BarChart3 className="text-[#FFC400]" /> Dashboard Analítico
          </h1>
          <p className="text-slate-500 text-sm mt-1">Comparativas, métricas y zonas críticas.</p>
        </div>
        
        {/* BOTONERA DE ACCIONES */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Link href="/inteligencia">
            <Button variant="outline" className="border-[#1B2541] text-[#1B2541] hover:bg-slate-200 gap-2">
              <ArrowLeft size={16} /> Volver al Mapa
            </Button>
          </Link>

          {/* <-- AQUÍ PONEMOS EL BOTÓN DE EXPORTAR --> */}
          <ExportPdfButton 
            targetId="reporte-dashboard" 
            fileName="Reporte_Inteligencia_C5i" 
          />
        </div>
      </div>
    
        <div id="reporte-dashboard" className="bg-slate-100 p-2 rounded-xl">
            {/* TARJETAS DE RESUMEN (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="border-0 shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-4 bg-blue-100 text-blue-600 rounded-full"><TrendingUp size={24} /></div>
                    <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Eventos Registrados</p>
                    <p className="text-3xl font-black text-[#1B2541]">{data.summary.total}</p>
                    </div>
                </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-4 bg-red-100 text-red-600 rounded-full"><AlertTriangle size={24} /></div>
                    <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Impacto Promedio (1-10)</p>
                    <p className="text-3xl font-black text-[#1B2541]">{data.summary.avgImpact}</p>
                    </div>
                </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-[#1B2541] text-white">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-4 bg-white/10 rounded-full"><Map size={24} className="text-[#FFC400]" /></div>
                    <div>
                    <p className="text-xs text-white/70 uppercase font-bold tracking-wider">Zona de Mayor Cuidado</p>
                    <p className="text-xl font-black leading-tight">{highestLocation}</p>
                    </div>
                </CardContent>
                </Card>
            </div>

            {/* ZONA DE GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* GRÁFICO DE BARRAS: Zonas más afectadas */}
                <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="bg-white border-b rounded-t-xl pb-4">
                    <CardTitle className="text-base text-[#1B2541]">Top 10: Localidades y Municipios con más reportes</CardTitle>
                </CardHeader>
                <CardContent className="p-6 h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.locations} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <RechartsTooltip 
                        cursor={{ fill: '#f8fafc' }} 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="eventos" fill="#1B2541" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                    </ResponsiveContainer>
                </CardContent>
                </Card>

                {/* GRÁFICO DE DONA: Distribución de problemáticas */}
                <Card className="border-0 shadow-sm">
                <CardHeader className="bg-white border-b rounded-t-xl pb-4">
                    <CardTitle className="text-base text-[#1B2541]">Tipología de Problemáticas</CardTitle>
                </CardHeader>
                <CardContent className="p-6 h-[400px] flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                        data={data.categories}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="cantidad"
                        >
                        {data.categories.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Leyenda personalizada */}
                    <div className="w-full mt-4 flex flex-col gap-2">
                    {data.categories.map((cat: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="text-slate-600 font-medium">{cat.name}</span>
                        </div>
                        <span className="font-bold text-[#1B2541]">{cat.cantidad}</span>
                        </div>
                    ))}
                    </div>
                </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}