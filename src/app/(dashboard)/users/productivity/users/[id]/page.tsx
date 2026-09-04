'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Star, TrendingUp, TrendingDown } from 'lucide-react';

export default function UserProductivityPage() {
  const params = useParams();
  const userId = params.id as string;

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get(`/productivity/users/${userId}`).then((res) => {
      setData(res.data);
    });
  }, [userId]);

  if (!data) return <div>Cargando productividad...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
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
          {data.events.map((event: any) => (
            <div
              key={event.id}
              className="flex justify-between border rounded-lg p-3"
            >
              <div>
                <p className="font-bold">{event.type}</p>
                <p className="text-sm text-slate-500">
                  {event.description || event.module}
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
                  {new Date(event.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}