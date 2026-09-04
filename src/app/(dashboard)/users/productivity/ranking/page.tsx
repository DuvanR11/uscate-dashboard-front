'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function ProductivityRankingPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    api.get('/productivity/ranking').then((res) => {
      setData(res.data.data || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <Trophy className="h-7 w-7 text-yellow-500" />
        Ranking de Productividad
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Mejores usuarios</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {data.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              <div>
                <p className="font-bold">
                  #{index + 1} {item.fullName}
                </p>
                <p className="text-sm text-slate-500">
                  {item.role} · {item.locality || 'Sin localidad'}
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold text-blue-700">{item.totalPoints} pts</p>
                <p className="text-xs text-slate-500">{item.level}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}