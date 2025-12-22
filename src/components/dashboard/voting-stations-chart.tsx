'use client';

import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid 
} from "recharts"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { 
  Tooltip as ShadTooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { MapPin, Info } from "lucide-react"
import { useState } from "react";

interface StationData {
  name: string;
  value: number;
}

// Tooltip del gráfico
const CustomGraphTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200 max-w-[220px]">
        <div className="flex items-start gap-2 mb-2 border-b border-slate-100 pb-2">
           <MapPin className="h-4 w-4 text-[#FFC400] shrink-0 mt-0.5" />
           <p className="font-bold text-[#1B2541] text-xs leading-snug">{label}</p>
        </div>
        <div className="flex justify-between items-end">
             <span className="text-xs text-slate-500 font-medium">Intención Voto</span>
             <span className="font-black text-lg text-[#1B2541]">{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function VotingStationsChart({ data }: { data: StationData[] }) {
  // Estado para controlar qué barra está activa
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <Card className="col-span-4 border-t-4 border-t-[#1B2541] shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-50 rounded-xl shadow-inner">
                   <MapPin className="h-5 w-5 text-[#FFC400]" />
                </div>
                <div>
                   <div className="flex items-center gap-2">
                       <CardTitle className="text-xl text-[#1B2541]">Top Puestos de Votación</CardTitle>
                       
                       {/* Tooltip de Información (Header) */}
                       <TooltipProvider>
                            <ShadTooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help opacity-50 hover:opacity-100 transition-opacity">
                                        <Info className="h-4 w-4 text-slate-400" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px] bg-[#1B2541] text-white border-0">
                                    <p>Identifica los lugares físicos con mayor concentración de votantes para priorizar la logística del Día D.</p>
                                </TooltipContent>
                            </ShadTooltip>
                       </TooltipProvider>
                   </div>
                   <CardDescription>Concentración de votos por ubicación.</CardDescription>
                </div>
            </div>
        </div>
      </CardHeader>

      <CardContent className="pl-2">
        <div className="h-[320px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={data} 
                layout="vertical" 
                margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                onMouseMove={(state: any) => {
                    if (state.isTooltipActive) {
                        setActiveIndex(state.activeTooltipIndex);
                    } else {
                        setActiveIndex(null);
                    }
                }}
            >
              {/* Definición de Gradientes Horizontales */}
              <defs>
                <linearGradient id="navyHorizontal" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1B2541" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#1B2541" stopOpacity={1}/>
                </linearGradient>
                <linearGradient id="yellowHorizontal" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FFC400" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              
              <XAxis type="number" hide />
              
              <YAxis 
                dataKey="name" 
                type="category" 
                width={140} 
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
                tickLine={false}
                axisLine={false}
              />
              
              <Tooltip 
                cursor={{ fill: '#f8fafc', opacity: 0.6 }} // Fondo sutil al pasar el mouse por la fila
                content={<CustomGraphTooltip />} 
              />
              
              <Bar 
                dataKey="value" 
                radius={[0, 6, 6, 0]} 
                barSize={28}
                animationDuration={1500}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    // Si está activo (hover), usa el gradiente amarillo. Si no, el navy.
                    fill={index === activeIndex ? "url(#yellowHorizontal)" : "url(#navyHorizontal)"}
                    className="transition-all duration-300 ease-out cursor-pointer"
                    style={{
                        filter: index === activeIndex ? 'drop-shadow(2px 2px 4px rgba(255, 196, 0, 0.3))' : 'none',
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}