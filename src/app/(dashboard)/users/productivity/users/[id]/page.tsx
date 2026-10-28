'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { productivityApi } from '@/lib/api/leaders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { eventTypeLabel } from '../../labels';

// Deuda técnica menor (2026-09-17) — forma real de `GET /productivity/
// users/:id`, verificada contra `ProductivityService#getUserProductivity()`.
interface ProductivityEventItem {
  id: string;
  type: string;
  module: string;
  description?: string | null;
  points: number;
  createdAt: string;
}

interface UserProductivityData {
  totalEvents: number;
  totalPoints: number;
  positivePoints: number;
  negativePoints: number;
  score: number;
  level: string;
  events: ProductivityEventItem[];
}

export default function UserProductivityPage() {
  const params = useParams();
  const userId = params.id as string;

  const [data, setData] = useState<UserProductivityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Fase 4 del análisis de punta a punta (2026-10-28, CRM-23): nombre y grupo
  // de cada acción, del catálogo del servidor. Si no carga, el historial se
  // muestra igual con el código legible.
  const [catalog, setCatalog] = useState<{ labels: Map<string, string>; groups: Map<string, string> }>(
    () => ({ labels: new Map(), groups: new Map() }),
  );

  useEffect(() => {
    let cancelled = false;
    productivityApi
      .rules()
      .then((rules) => {
        if (cancelled) return;
        setCatalog({
          labels: new Map(rules.map((rule) => [rule.type, rule.label])),
          groups: new Map(rules.map((rule) => [rule.type, rule.group])),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    api
      .get(`/productivity/users/${userId}`)
      .then((res) => {
        setError(null);
        setData(res.data);
      })
      .catch((err: { response?: { status?: number; data?: { message?: unknown } } }) => {
        // Fase 0 (2026-10-28, CRM-18): sin permiso de ver al equipo, el
        // servidor solo entrega la productividad propia (403 para otra
        // persona). Antes la pantalla se quedaba en «Cargando…».
        const message = err.response?.data?.message;
        setError(
          err.response?.status === 403
            ? typeof message === 'string' && message
              ? message
              : 'Solo puedes ver tu propia productividad.'
            : 'No se pudo cargar la productividad de esta persona.',
        );
      });
  }, [userId]);

  if (error) return <div className="text-sm text-slate-500">{error}</div>;
  if (!data) return <div>Cargando productividad...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
        <Activity className="h-7 w-7 text-blue-600" />
        Productividad del usuario
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Eventos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {data.totalEvents}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4" /> Puntos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {data.totalPoints}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Positivos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-600">
            {data.positivePoints}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Penalizaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">
            {data.negativePoints}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de eventos</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {data.events.length === 0 && (
            <p className="text-sm text-slate-500">Todavía no hay acciones registradas.</p>
          )}
          {data.events.map((event) => (
            <div
              key={event.id}
              className="flex justify-between gap-3 border rounded-lg p-3"
            >
              <div className="min-w-0">
                <p className="font-bold">{eventTypeLabel(event.type, catalog.labels)}</p>
                {/* El módulo es un código de permiso (`DENUNCIAS_DEMANDAS`):
                    sin descripción se muestra el grupo del catálogo. */}
                <p className="text-sm text-slate-500">
                  {event.description || catalog.groups.get(event.type) || ''}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={
                    event.points >= 0
                      ? 'font-bold text-emerald-600'
                      : 'font-bold text-red-600'
                  }
                >
                  {event.points} pts
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleDateString('es-CO')}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}