'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserPlus, TrendingUp } from 'lucide-react';

interface FunnelData {
  convoked: number;
  registered: number;
  attended: number;
  responseRate: string;
  attendanceRate: string;
}

export function EventFunnelStats({ data }: { data: FunnelData }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#FFC400]" />
        Embudo de Conversión
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. CONVOCADOS */}
        <Card className="border-l-4 border-l-slate-400">
           <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Convocados</p>
                      <h4 className="text-3xl font-black text-slate-700">{data.convoked}</h4>
                      <p className="text-xs text-slate-400 mt-1">Impacto de difusión</p>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg"><Users className="h-5 w-5 text-slate-500"/></div>
              </div>
           </CardContent>
        </Card>

        {/* 2. INSCRITOS (Interés) */}
        <Card className="border-l-4 border-l-blue-500">
           <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-blue-600 uppercase">Inscritos Web</p>
                      <h4 className="text-3xl font-black text-blue-700">{data.registered}</h4>
                      <p className="text-xs text-blue-400 mt-1">Tasa Respuesta: {data.responseRate}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg"><UserPlus className="h-5 w-5 text-blue-600"/></div>
              </div>
           </CardContent>
        </Card>

        {/* 3. ASISTENTES (Efectividad) */}
        <Card className="border-l-4 border-l-[#FFC400]">
           <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-yellow-600 uppercase">Asistieron</p>
                      <h4 className="text-3xl font-black text-yellow-700">{data.attended}</h4>
                      <p className="text-xs text-yellow-500 mt-1">Efectividad: {data.attendanceRate}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg"><UserCheck className="h-5 w-5 text-yellow-600"/></div>
              </div>
           </CardContent>
        </Card>
      </div>

      {/* BARRA VISUAL */}
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
         <div style={{ width: data.responseRate }} className="h-full bg-blue-500" title="Inscritos"></div>
         <div style={{ width: data.attendanceRate }} className="h-full bg-[#FFC400] -ml-2 mix-blend-multiply" title="Asistieron"></div>
      </div>
    </div>
  );
}