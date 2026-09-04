'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Info, Loader2, Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listOsintSources, extractErrorMessage, type OsintSourceReadOnly } from '@/lib/api/osint';

const RELIABILITY_LABEL: Record<string, string> = {
  OFFICIAL: 'Oficial',
  SEMI_OFFICIAL: 'Semi-oficial',
  THIRD_PARTY: 'Tercero',
};

const RELIABILITY_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  OFFICIAL: 'default',
  SEMI_OFFICIAL: 'secondary',
  THIRD_PARTY: 'outline',
};

export default function OsintSourcesPage() {
  const [sources, setSources] = useState<OsintSourceReadOnly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOsintSources(true)
      .then(setSources)
      .catch((err) => toast.error(extractErrorMessage(err) || 'No se pudo cargar el catálogo de fuentes'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
          <Radio className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Fuentes OSINT</h1>
          <p className="text-slate-500 text-sm">
            Catálogo global (compartido por todas las organizaciones) — su nivel de confiabilidad
            determina si un registro nuevo se deriva como hecho verificado o reportado.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>
          Este catálogo es global — un cambio afectaría a todas las organizaciones, no solo la tuya.
          Por eso esta vista es de solo lectura. Activar/desactivar una fuente o cambiar su nivel de
          confiabilidad se administra desde{' '}
          <Link href="/platform" className="underline font-medium">
            Plataforma
          </Link>{' '}
          (exclusivo del operador de plataforma).
        </p>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Acceso</TableHead>
                  <TableHead>Confiabilidad</TableHead>
                  <TableHead>Oficial</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id} className={s.isActive ? '' : 'opacity-50'}>
                    <TableCell>
                      <p className="font-bold text-primary">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.description}</p>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{s.accessType}</TableCell>
                    <TableCell>
                      <Badge variant={RELIABILITY_VARIANT[s.reliabilityLevel] ?? 'outline'}>
                        {RELIABILITY_LABEL[s.reliabilityLevel] ?? s.reliabilityLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.official ? 'Sí' : 'No'}</TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? 'default' : 'outline'} className="text-[10px]">
                        {s.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
