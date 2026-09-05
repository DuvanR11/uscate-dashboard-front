'use client';

// Mejora del Dashboard de Analítica (2026-09-04): funnel Prospectos →
// Solicitudes → Resueltas, reusando los mismos 3 números que ya trae
// `dashboard-kpis` — sin ningún costo de backend nuevo.
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBrandColors } from '@/hooks/use-brand-colors';
import { Filter } from 'lucide-react';

interface ConversionFunnelProps {
  totalProspects: number;
  totalRequests: number;
  closedRequests: number;
}

export function ConversionFunnel({ totalProspects, totalRequests, closedRequests }: ConversionFunnelProps) {
  const brand = useBrandColors();
  const max = Math.max(totalProspects, 1);

  const stages = [
    { label: 'Prospectos', value: totalProspects, color: brand.primary },
    { label: 'Solicitudes', value: totalRequests, color: brand.secondary },
    { label: 'Resueltas', value: closedRequests, color: '#10b981' },
  ];

  return (
    <Card className="border-t-4 border-t-slate-400 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 rounded-xl shadow-inner">
            <Filter className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <CardTitle className="text-xl text-primary">Embudo de Conversión</CardTitle>
            <CardDescription>De prospecto a solicitud resuelta.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, i) => {
          const widthPercent = Math.max((stage.value / max) * 100, stage.value > 0 ? 4 : 0);
          const prevValue = i > 0 ? stages[i - 1].value : null;
          const conversionFromPrev = prevValue && prevValue > 0
            ? ((stage.value / prevValue) * 100).toFixed(0)
            : null;
          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{stage.label}</span>
                <span className="text-sm font-black" style={{ color: stage.color }}>{stage.value}</span>
              </div>
              <div className="h-8 w-full bg-slate-50 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                  style={{ width: `${widthPercent}%`, backgroundColor: stage.color }}
                >
                  {conversionFromPrev !== null && (
                    <span className="text-[10px] font-bold text-white/90">{conversionFromPrev}%</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
