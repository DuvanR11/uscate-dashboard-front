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
import { Layers, Info } from "lucide-react";
import { useState, useMemo } from 'react';

// Paleta extendida para múltiples segmentos
const COLORS = [
  '#1B2541', // 1. Navy Blue
  '#FFC400', // 2. Amarillo
  '#E11D48', // 3. Rojo
  '#0ea5e9', // 4. Sky Blue
  '#64748b', // 5. Slate
];

interface SegmentData {
  name: string;
  value: number;
  [key: string]: any;
}

// --- FORMA ACTIVA (Efecto Expansión y Texto Central) ---
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;

  return (
    <g>
      {/* Texto Central Dinámico (Nombre del Segmento) */}
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#1B2541" className="font-bold text-xs uppercase tracking-wider">
        {payload.name}
      </text>
      {/* Texto Central Dinámico (Valor) */}
      <text x={cx} y={cy} dy={20} textAnchor="middle" fill={fill} className="font-black text-2xl">
        {value}
      </text>

      {/* Sector Principal Expandido */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8} // Crece 8px
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-md transition-all duration-300"
      />
      
      {/* Anillo Decorativo Exterior */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        fill={fill}
        opacity={0.4}
      />
    </g>
  );
};

// --- TOOLTIP FLOTANTE (Opcional, ya que tenemos el centro dinámico) ---
const CustomGraphTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white/95 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2 mb-1 border-b border-slate-50 pb-1">
            <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: data.payload.fill }} 
            />
            <p className="font-bold text-[#1B2541] text-xs uppercase tracking-wide">
                {data.name}
            </p>
        </div>
        <div className="flex justify-between items-end gap-3">
            <span className="text-xs text-slate-500">Registros</span>
            <span className="font-bold text-base" style={{ color: data.payload.fill }}>
                {data.value}
            </span>
        </div>
      </div>
    );
  }
  return null;
};

// --- LEYENDA ---
const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center text-xs font-medium text-slate-600">
          <span 
            className="block w-2.5 h-2.5 rounded-sm mr-2" 
            style={{ backgroundColor: entry.color }} 
          />
          {entry.value}
        </li>
      ))}
    </ul>
  );
};

export function SegmentsChart({ data }: { data: SegmentData[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Calcular total para mostrar en el centro cuando no hay hover
  const totalValue = useMemo(() => data.reduce((acc, cur) => acc + cur.value, 0), [data]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <Card className="col-span-3 border-t-4 border-t-[#E11D48] shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 rounded-xl shadow-inner">
                    <Layers className="h-5 w-5 text-[#E11D48]" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-xl text-[#1B2541]">Población por Segmento</CardTitle>
                        
                        {/* Tooltip de Información (Header) */}
                        <TooltipProvider>
                            <ShadTooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help opacity-50 hover:opacity-100 transition-opacity">
                                        <Info className="h-4 w-4 text-slate-400" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px] bg-[#1B2541] text-white border-0">
                                    <p>Desglose estratégico de la base de datos según categorías o segmentos de interés político.</p>
                                </TooltipContent>
                            </ShadTooltip>
                        </TooltipProvider>
                    </div>
                    <CardDescription>Distribución estratégica de la base de datos.</CardDescription>
                </div>
            </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[300px] mt-2 relative">
        
        {/* Texto Central por Defecto (Total General) - Solo visible si no hay hover */}
        {activeIndex === null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-12 pointer-events-none z-0">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total</span>
                <span className="text-3xl font-black text-[#1B2541]">{totalValue}</span>
            </div>
        )}

        <div className="h-[300px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                // activeIndex={activeIndex !== null ? activeIndex : undefined}
                activeShape={renderActiveShape} // Activa la forma dinámica
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                animationDuration={1000}
                animationBegin={100}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    style={{
                        opacity: activeIndex !== null && activeIndex !== index ? 0.5 : 1, // Atenúa los no seleccionados
                        transition: 'opacity 0.3s ease-in-out',
                        cursor: 'pointer'
                    }}
                  />
                ))}
              </Pie>
              {/* Tooltip flotante (opcional, ya que tenemos el centro dinámico, pero útil para precisión) */}
              {activeIndex !== null && <Tooltip content={<CustomGraphTooltip />} offset={20} />}
              <Legend content={renderLegend} verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}