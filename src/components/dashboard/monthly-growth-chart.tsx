'use client';

import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Tooltip as ShadTooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { TrendingUp, Info, LineChart as LineChartIcon } from "lucide-react";
import { useBrandColors } from '@/hooks/use-brand-colors';

// Neutros de grilla/texto — semánticos, no de marca (no se personalizan).
// Navy/Amarillo salían de acá antes; ahora vienen de useBrandColors() del
// lado de adentro del componente (necesitan ser dinámicos por organización).
const COLORS = {
  grid: '#e2e8f0',
  text: '#64748b'
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur border border-slate-200 p-4 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[180px]">
        <p className="font-bold text-primary mb-3 border-b border-slate-100 pb-2">{label}</p>
        
        {/* Dato 1: Prospectos */}
        <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-xs text-slate-500 font-medium">Prospectos</span>
            </div>
            <span className="font-black text-lg text-primary">{payload[0].value}</span>
        </div>

        {/* Dato 2: Eventos */}
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-xs text-slate-500 font-medium">Eventos</span>
            </div>
            <span className="font-black text-lg text-[#d97706]">{payload[1]?.value || 0}</span>
        </div>
      </div>
    );
  }
  return null;
};

interface MonthlyGrowthChartProps {
  data: any[];
  // Pulir UX (Mejora del Dashboard, 2026-09-04): antes el KPI "Total
  // Prospectos" decía "Histórico total" mientras esta gráfica, en silencio,
  // solo mostraba los últimos 30 días — dos alcances distintos sin avisar.
  // Cuando el usuario no eligió un rango explícito, se avisa acá.
  usingDefaultRange?: boolean;
}

export function MonthlyGrowthChart({ data, usingDefaultRange }: MonthlyGrowthChartProps) {
  const brand = useBrandColors();
  const hasData = data.some((d) => (d.prospects ?? 0) > 0 || (d.events ?? 0) > 0);
  return (
    <Card className="col-span-4 border-t-4 border-t-primary shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader>
         <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl shadow-inner">
                   <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <div className="flex items-center gap-2">
                       <CardTitle className="text-xl text-primary">Crecimiento vs. Actividad</CardTitle>
                       
                       {/* Tooltip de Información (Header) */}
                       <TooltipProvider>
                            <ShadTooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help opacity-50 hover:opacity-100 transition-opacity">
                                        <Info className="h-4 w-4 text-slate-400" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[280px] bg-primary text-white border-0 p-3 shadow-xl">
                                    <p className="leading-relaxed">
                                        Analiza la correlación entre el esfuerzo en terreno (<strong>Eventos</strong>) y los resultados obtenidos (<strong>Nuevos Prospectos</strong>) mes a mes.
                                    </p>
                                </TooltipContent>
                            </ShadTooltip>
                       </TooltipProvider>
                   </div>
                   <CardDescription>Comparativa mensual de nuevos registros y eventos de campaña.</CardDescription>
                </div>
            </div>
         </div>
      </CardHeader>
      
      <CardContent className="pl-0">
        {usingDefaultRange && (
          <p className="px-6 -mt-1 mb-2 text-xs text-slate-400 italic">
            Mostrando los últimos 30 días — selecciona un rango de fechas arriba para ver más historial.
          </p>
        )}
        {!hasData && (
          <div className="h-[350px] flex flex-col items-center justify-center text-center py-10 text-muted-foreground bg-slate-50 rounded-xl border border-dashed mx-6">
            <LineChartIcon className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm font-medium">Sin actividad para el periodo seleccionado.</p>
            <p className="text-xs text-slate-400">No hay prospectos ni eventos registrados en este rango.</p>
          </div>
        )}
        <div className={`h-[350px] w-full mt-2 ${!hasData ? 'hidden' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              
              {/* Definición de Efectos Visuales */}
              <defs>
                {/* Gradiente para las Barras (Volumen) */}
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={brand.primary} stopOpacity={0.9}/>
                  <stop offset="95%" stopColor={brand.primary} stopOpacity={0.4}/>
                </linearGradient>
                
                {/* Sombra para la Línea (Resplandor) */}
                <filter id="lineShadow" height="200%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={brand.secondary} floodOpacity="0.5"/>
                </filter>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
              
              <XAxis 
                dataKey="name" 
                tick={{ fill: COLORS.text, fontSize: 12, fontWeight: 500 }} 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                tick={{ fill: COLORS.text, fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
              />
              
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fill: '#d97706', fontSize: 12, fontWeight: 'bold' }} 
                tickLine={false}
                axisLine={false}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
              
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 500 }}
              />

              {/* BARRAS: Nuevos Prospectos (Con Gradiente) */}
              <Bar 
                yAxisId="left" 
                dataKey="prospects" 
                name="Nuevos Prospectos" 
                fill="url(#barGradient)" // Usamos el gradiente
                radius={[6, 6, 0, 0]} 
                barSize={32}
                animationDuration={1500}
                className="hover:opacity-80 transition-opacity"
              />

              {/* LÍNEA: Eventos (Con Sombra y Puntos Dinámicos) */}
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="events" 
                name="Eventos Realizados" 
                stroke={brand.secondary} 
                strokeWidth={4}
                filter="url(#lineShadow)" // Aplicamos el resplandor
                animationDuration={2000}
                animationBegin={300} // Empieza un poco después de las barras
                dot={{ r: 4, fill: "#fff", stroke: brand.secondary, strokeWidth: 3 }}
                activeDot={{ 
                    r: 8, 
                    fill: brand.secondary, 
                    stroke: "#fff", 
                    strokeWidth: 2,
                    className: "animate-pulse" // Pulso al pasar el mouse
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}