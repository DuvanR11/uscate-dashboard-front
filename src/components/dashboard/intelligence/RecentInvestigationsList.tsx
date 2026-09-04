'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, History, Network, ArrowRight } from 'lucide-react';

// Plan de Mejora OSINT, Fase 6 — decisión de producto confirmada con el
// usuario: construir la pantalla real de "investigaciones recientes" en
// vez de dejar `/investigation/recent`/`/:id` sin ningún consumidor. Solo
// lista lo que la investigación persistida realmente guarda (query, fecha,
// score, conteos, quién la ejecutó) — nunca los registros crudos por
// fuente ni el timeline detallado, que no se persisten (ver el banner de
// "vista archivada" en la página que consume este componente).

const RISK_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CRITICAL: 'destructive',
  HIGH: 'destructive',
  MEDIUM: 'secondary',
  LOW: 'outline',
};

export function riskLevelFromScore(score: number | null | undefined): string {
  const s = score ?? 0;
  // Mismos umbrales que RiskScoreService.resolveLevel() (backend) —
  // duplicado acá solo para mostrar un badge, nunca para decidir nada.
  if (s >= 8.5) return 'CRITICAL';
  if (s >= 6.5) return 'HIGH';
  if (s >= 3.5) return 'MEDIUM';
  return 'LOW';
}

export interface RecentInvestigation {
  id: string;
  query: string;
  riskScore: number | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string } | null;
  _count?: { nodes: number; links: number };
}

export default function RecentInvestigationsList({
  investigations,
  loading,
  onReopen,
  reopeningId,
}: {
  investigations: RecentInvestigation[];
  loading: boolean;
  onReopen: (id: string) => void;
  reopeningId: string | null;
}) {
  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
        <CardTitle className="text-base text-primary flex items-center gap-2">
          <History size={18} />
          Búsquedas recientes
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="animate-spin text-slate-400" size={28} />
          </div>
        ) : investigations.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            Sin búsquedas recientes todavía — las que hagas quedan acá por 90 días.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {investigations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-primary truncate">{inv.query}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>{new Date(inv.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    {inv.user && <span>· {inv.user.fullName}</span>}
                    <span className="flex items-center gap-1">
                      <Network size={12} /> {inv._count?.nodes ?? 0} nodos, {inv._count?.links ?? 0} relaciones
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={RISK_VARIANT[riskLevelFromScore(inv.riskScore)]}>
                    {(inv.riskScore ?? 0).toFixed(1)}/10
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReopen(inv.id)}
                    disabled={reopeningId === inv.id}
                  >
                    {reopeningId === inv.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        Reabrir <ArrowRight size={14} className="ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
