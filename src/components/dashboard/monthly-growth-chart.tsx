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
import { TrendingUp, Info } from "lucide-react";

// Colores de la marca
const COLORS = {
  primary: '#1B2541', // Navy Blue
  secondary: '#FFC400', // Amarillo
  grid: '#e2e8f0',
  text: '#64748b'
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur border border-slate-200 p-4 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200 min-w-[180px]">
        <p className="font-bold text-[#1B2541] mb-3 border-b border-slate-100 pb-2">{label}</p>
        
        {/* Dato 1: Prospectos */}
        <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#1B2541]" />
                <span className="text-xs text-slate-500 font-medium">Prospectos</span>
            </div>
            <span className="font-black text-lg text-[#1B2541]">{payload[0].value}</span>
        </div>

        {/* Dato 2: Eventos */}
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FFC400]" />
                <span className="text-xs text-slate-500 font-medium">Eventos</span>
            </div>
            <span className="font-black text-lg text-[#d97706]">{payload[1]?.value || 0}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function MonthlyGrowthChart({ data }: { data: any[] }) {
  return (
    <Card className="col-span-4 border-t-4 border-t-[#1B2541] shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader>
         <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl shadow-inner">
                   <TrendingUp className="h-5 w-5 text-[#1B2541]" />
                </div>
                <div>
                   <div className="flex items-center gap-2">
                       <CardTitle className="text-xl text-[#1B2541]">Crecimiento vs. Actividad</CardTitle>
                       
                       {/* Tooltip de Información (Header) */}
                       <TooltipProvider>
                            <ShadTooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help opacity-50 hover:opacity-100 transition-opacity">
                                        <Info className="h-4 w-4 text-slate-400" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[280px] bg-[#1B2541] text-white border-0 p-3 shadow-xl">
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
        <div className="h-[350px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              
              {/* Definición de Efectos Visuales */}
              <defs>
                {/* Gradiente para las Barras (Volumen) */}
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.9}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.4}/>
                </linearGradient>
                
                {/* Sombra para la Línea (Resplandor) */}
                <filter id="lineShadow" height="200%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={COLORS.secondary} floodOpacity="0.5"/>
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
                stroke={COLORS.secondary} 
                strokeWidth={4}
                filter="url(#lineShadow)" // Aplicamos el resplandor
                animationDuration={2000}
                animationBegin={300} // Empieza un poco después de las barras
                dot={{ r: 4, fill: "#fff", stroke: COLORS.secondary, strokeWidth: 3 }}
                activeDot={{ 
                    r: 8, 
                    fill: COLORS.secondary, 
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