'use client';

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip, 
  Sector 
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
import { PieChart as PieIcon, Info } from "lucide-react";
import { useState, useMemo } from 'react';

// Paleta Corporativa
const COLORS = ['#1B2541', '#FFC400', '#E11D48'];

// --- TOOLTIP DEL GRÁFICO ---
const CustomGraphTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
            <div 
                className="w-3 h-3 rounded-full shadow-sm" 
                style={{ backgroundColor: payload[0].payload.fill }} 
            />
            <p className="font-bold text-[#1B2541] text-sm">{payload[0].name}</p>
        </div>
        <div className="flex justify-between items-end gap-4">
            <span className="text-xs text-slate-500 font-medium uppercase">Cantidad</span>
            <span className="font-black text-lg" style={{ color: payload[0].payload.fill }}>
                {payload[0].value}
            </span>
        </div>
      </div>
    );
  }
  return null;
};

// --- LEYENDA PERSONALIZADA ---
const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex justify-center gap-6 mt-4">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center text-xs font-medium text-slate-600 cursor-default">
          <span 
            className="block w-3 h-3 rounded-full mr-2 shadow-sm" 
            style={{ backgroundColor: entry.color }} 
          />
          {entry.value}
        </li>
      ))}
    </ul>
  );
};

// --- FORMA ACTIVA (Efecto "Explosión") ---
const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  
    return (
      <g>
        {/* Texto Central Dinámico */}
        <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#1B2541" className="font-bold text-sm">
            {payload.name}
        </text>
        <text x={cx} y={cy} dy={20} textAnchor="middle" fill={fill} className="font-black text-2xl">
            {`${(percent * 100).toFixed(0)}%`}
        </text>

        {/* Sector Resaltado (Más grande y separado) */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10} // Crece 10px
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          className="drop-shadow-lg transition-all duration-300 ease-out" // Sombra y transición suave
        />
        {/* Borde exterior para más énfasis */}
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 15}
          fill={fill}
          opacity={0.3}
        />
      </g>
    );
};

export function GenderChart({ data }: { data: any[] }) {
  // Estado para controlar la sección activa
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Calculamos el total para el centro (si no hay hover)
  const totalValue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <Card className="col-span-3 border-t-4 border-t-[#FFC400] shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-50 rounded-xl shadow-inner">
                    <PieIcon className="h-5 w-5 text-[#FFC400]" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-xl text-[#1B2541]">Distribución por Género</CardTitle>
                        
                        {/* Tooltip de Información (El ícono 'i') */}
                        <TooltipProvider>
                            <ShadTooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help opacity-50 hover:opacity-100 transition-opacity">
                                        <Info className="h-4 w-4 text-slate-400" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px] bg-[#1B2541] text-white border-0">
                                    <p>Visualiza la proporción de hombres y mujeres en la base de datos de prospectos para equilibrar la estrategia.</p>
                                </TooltipContent>
                            </ShadTooltip>
                        </TooltipProvider>
                    </div>
                    <CardDescription>Composición demográfica del equipo.</CardDescription>
                </div>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-[320px] mt-2 relative">
        {/* Texto Central por Defecto (Total) */}
        {activeIndex === null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-12 pointer-events-none z-0">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total</span>
                <span className="text-3xl font-black text-[#1B2541]">{totalValue}</span>
            </div>
        )}

        <div className="h-[320px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={75}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                // activeIndex={activeIndex !== null ? activeIndex : undefined} // Define cuál está activo
                activeShape={renderActiveShape} // Usa nuestra forma dinámica
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                animationDuration={1000}
                animationBegin={200}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    // Si hay una activa y NO es esta, reduce su opacidad
                    style={{
                        opacity: activeIndex !== null && activeIndex !== index ? 0.6 : 1,
                        transition: 'all 0.3s ease-out',
                        cursor: 'pointer'
                    }}
                  />
                ))}
              </Pie>
              {/* El tooltip del gráfico solo aparece si hay un estado activo */}
              {activeIndex !== null && <Tooltip content={<CustomGraphTooltip />} offset={20} />}
              <Legend content={renderLegend} verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}