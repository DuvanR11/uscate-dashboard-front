'use client';

// Mejora del Dashboard de Analítica (2026-09-04): primera UI real para
// `GET /reports/performance/secretaries` — el backend ya calculaba el
// cumplimiento mensual (EXCELLENT/GOOD/LAGGING) pero ninguna pantalla lo
// mostraba. Mismo lenguaje visual que leader-ranking.tsx (incluido su
// estado vacío).
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, UserX } from 'lucide-react';

interface SecretaryGoal {
  id: string;
  name: string;
  actual: number;
  goal: number;
  percentage: number;
  status: 'EXCELLENT' | 'GOOD' | 'LAGGING';
}

const STATUS_STYLES: Record<SecretaryGoal['status'], { label: string; badge: string; bar: string }> = {
  EXCELLENT: { label: 'Meta cumplida', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  GOOD: { label: 'En camino', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  LAGGING: { label: 'Rezagado', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
};

export function SecretariesGoals({ data }: { data: SecretaryGoal[] }) {
  return (
    <Card className="border-t-4 border-t-emerald-600 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl shadow-inner">
            <Target className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-xl text-primary">Cumplimiento de Metas</CardTitle>
            <CardDescription>Solicitudes cerradas por Secretario este mes.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((sec) => {
          const style = STATUS_STYLES[sec.status];
          return (
            <div key={sec.id} className="p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-bold text-slate-700">{sec.name}</p>
                <Badge className={`${style.badge} border-0 font-semibold`}>{style.label}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={sec.percentage} className="h-2 flex-1" indicatorClassName={style.bar} />
                <span className="text-xs font-mono text-slate-500 w-16 text-right shrink-0">
                  {sec.actual}/{sec.goal}
                </span>
              </div>
            </div>
          );
        })}

        {data.length === 0 && (
          <div className="text-center py-10 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-xl border border-dashed">
            <UserX className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm font-medium">Sin secretarios activos con metas asignadas.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
