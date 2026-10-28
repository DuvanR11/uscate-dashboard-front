'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/api/catalogs';
import { formatDecimal } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Activity, Star } from 'lucide-react';
import { levelLabel, roleLabel } from '../labels';

// Deuda técnica menor (2026-09-17) — forma real de `GET /productivity/
// reports`, verificada contra `ProductivityService#getReport()`.
interface ProductivityUser {
  id: string;
  fullName: string;
  email: string;
  role?: string;
  locality?: string;
  totalPoints: number;
  totalEvents: number;
  score: number;
  level: string;
}

interface ProductivityReport {
  summary: {
    totalUsers: number;
    totalEvents: number;
    totalPoints: number;
    averagePoints: number;
    bestUser: ProductivityUser | null;
    lowestUser: ProductivityUser | null;
  };
  users: ProductivityUser[];
}

export default function ProductivityReportsPage() {
  const [report, setReport] = useState<ProductivityReport | null>(null);
  // Fase 4 del análisis de punta a punta (2026-10-28, CRM-23): si la consulta
  // fallaba, la pantalla se quedaba en «Cargando…» para siempre.
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ProductivityReport>('/productivity/reports')
      .then((res) => {
        if (cancelled) return;
        setError(null);
        setReport(res.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = extractErrorMessage(err) || 'No se pudo cargar el reporte de productividad.';
        setError(message);
        toast.error(message);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (error && !report) {
    return (
      <div role="alert" className="space-y-3 text-sm text-slate-500">
        <p>{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }
  if (!report) return <div>Cargando reporte...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="h-7 w-7" />
        Reporte de Productividad
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {report.summary.totalUsers}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {report.summary.totalEvents}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4" /> Puntos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {report.summary.totalPoints}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Promedio</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatDecimal(report.summary.averagePoints)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios evaluados</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {report.users.length === 0 && (
            <p className="text-sm text-slate-500">
              Todavía no hay personas con acciones registradas en este periodo.
            </p>
          )}
          {report.users.map((user) => (
            <div
              key={user.id}
              className="flex justify-between gap-3 border rounded-lg p-3"
            >
              <div className="min-w-0">
                <p className="font-bold">{user.fullName}</p>
                <p className="text-sm text-slate-500">{roleLabel(user.role)}</p>
              </div>

              <div className="text-right">
                <p className="font-bold">{user.totalPoints} pts</p>
                <p className="text-xs text-slate-500">Nivel {levelLabel(user.level).toLowerCase()}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}