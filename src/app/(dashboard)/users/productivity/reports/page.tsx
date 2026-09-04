'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Activity, Star } from 'lucide-react';

export default function ProductivityReportsPage() {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    api.get('/productivity/reports').then((res) => {
      setReport(res.data);
    });
  }, []);

  if (!report) return <div>Cargando reporte...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
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
            {report.summary.averagePoints}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios evaluados</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {report.users.map((user: any) => (
            <div
              key={user.id}
              className="flex justify-between border rounded-lg p-3"
            >
              <div>
                <p className="font-bold">{user.fullName}</p>
                <p className="text-sm text-slate-500">{user.role}</p>
              </div>

              <div className="text-right">
                <p className="font-bold">{user.totalPoints} pts</p>
                <p className="text-xs text-slate-500">{user.level}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}