'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
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
} from "@/components/ui/tooltip"; // Asegúrate de tener este componente de Shadcn
import { Users, Info } from "lucide-react";
import { useState } from 'react';

// Tooltip del gráfico (Cuando pasas el mouse sobre la barra)
const CustomGraphTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur border border-slate-200 p-4 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <p className="font-bold text-[#1B2541] text-sm mb-2 pb-2 border-b border-slate-100">
            Rango: {label}
        </p>
        <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[#1B2541] rounded-full" />
            <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Prospectos</p>
                <p className="text-2xl font-black text-[#E11D48] leading-none mt-0.5">
                    {payload[0].value}
                </p>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

export function AgeChart({ data }: { data: any[] }) {
  // Estado para controlar el hover manual (para efectos visuales extras si quisieras)
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <Card className="col-span-3 border-t-4 border-t-[#1B2541] shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl shadow-inner">
                    <Users className="h-5 w-5 text-[#1B2541]" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-xl text-[#1B2541]">Clasificación por Edades</CardTitle>
                        
                        {/* Tooltip de Información (El ícono 'i') */}
                        <TooltipProvider>
                            <ShadTooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help opacity-50 hover:opacity-100 transition-opacity">
                                        <Info className="h-4 w-4 text-slate-400" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px] bg-[#1B2541] text-white border-0">
                                    <p>Este gráfico muestra la distribución de prospectos agrupados por rangos de edad, permitiendo identificar el público objetivo principal.</p>
                                </TooltipContent>
                            </ShadTooltip>
                        </TooltipProvider>
                    </div>
                    <CardDescription>Distribución demográfica de los prospectos.</CardDescription>
                </div>
            </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[320px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={data} 
                layout="horizontal" 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onMouseMove={(state: any) => {
                    if (state.isTooltipActive) {
                        setActiveIndex(state.activeTooltipIndex);
                    } else {
                        setActiveIndex(null);
                    }
                }}
            >
              {/* Definición de Gradiente para las barras */}
              <defs>
                <linearGradient id="colorNavy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B2541" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#1B2541" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="colorYellow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFC400" stopOpacity={1}/>
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0.8}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              
              <XAxis 
                dataKey="range" 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                allowDecimals={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
              />
              
              <Tooltip 
                content={<CustomGraphTooltip />} 
                cursor={{ fill: '#f8fafc', opacity: 0.8 }} 
              />
              
              <Bar 
                dataKey="count" 
                radius={[8, 8, 0, 0]} 
                barSize={45}
                animationDuration={1500} // Animación lenta al inicio
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    // Si la barra está activa (hover), se vuelve Amarilla (#FFC400). Si no, usa el gradiente Navy.
                    fill={index === activeIndex ? "url(#colorYellow)" : "url(#colorNavy)"}
                    className="transition-all duration-300 ease-out cursor-pointer"
                    // Efecto sutil de filtro al hacer hover
                    style={{ 
                        filter: index === activeIndex ? 'drop-shadow(0px 4px 6px rgba(255, 196, 0, 0.3))' : 'none',
                        transform: index === activeIndex ? 'scaleY(1.02)' : 'scaleY(1)',
                        transformOrigin: 'bottom'
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}