'use client';

// Plan hacia la versión estable, Fase 3c (2026-11-10): visitas puerta a
// puerta. Arriba lo mío (para el líder en el celular); abajo la cobertura por
// zona: la de mi equipo o, con «Contactos (todos)», la de toda la
// organización. Fuera del menú (`UNLISTED_ROUTES`, módulo Contactos): se llega
// desde el portal del líder y desde Contactos cuando el servidor las tiene
// encendidas.
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DoorOpen, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermission } from '@/hooks/use-permission';
import {
  VISIT_RESULT_LABEL,
  VISIT_RESULT_ORDER,
  VISIT_RESULT_TONE,
  fieldVisitsApi,
  useFieldVisitsEnabled,
  visitTime,
  type MyVisits,
  type VisitCoverage,
} from '@/lib/api/field-visits';
import { VisitDialog } from '@/components/dashboard/field-visits/visit-dialog';

const CoverageMap = dynamic(() => import('@/components/dashboard/field-visits/coverage-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-slate-400" />
    </div>
  ),
});

const PERIODS = [7, 30, 90] as const;
const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);

export default function FieldVisitsPage() {
  const enabled = useFieldVisitsEnabled();
  const canWrite = usePermission('PROSPECTOS', 'canWrite');
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [mine, setMine] = useState<MyVisits | null>(null);
  const [coverage, setCoverage] = useState<VisitCoverage | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([fieldVisitsApi.mine(7), fieldVisitsApi.coverage(days)])
      .then(([myVisits, zones]) => {
        setFailed(false);
        setMine(myVisits);
        setCoverage(zones);
      })
      .catch(() => setFailed(true));
  }, [days]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  if (enabled === null) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6 text-sm text-slate-600">
        Las visitas puerta a puerta todavía no están activas en Zyron.{' '}
        <Link href="/prospects" className="font-medium text-primary hover:underline">
          Volver a Contactos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <DoorOpen className="h-7 w-7 text-primary" /> Visitas puerta a puerta
          </h1>
          <p className="text-muted-foreground">Lo que registras en terreno y cuánto se ha cubierto cada zona.</p>
        </div>
        {canWrite && (
          <Button className="hidden h-11 md:inline-flex" onClick={() => setOpen(true)}>
            Registrar visita
          </Button>
        )}
      </div>

      {failed && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          No se pudieron cargar las visitas.{' '}
          <button className="font-semibold underline" onClick={load}>
            Reintentar
          </button>
        </p>
      )}

      {/* Lo mío: últimos 7 días */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">Mis visitas de los últimos 7 días</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!mine ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Cargando tus visitas" />
          ) : (
            <>
              <p className="text-3xl font-black tabular-nums text-slate-800">
                {number(mine.total)}{' '}
                <span className="text-base font-medium text-slate-500">{mine.total === 1 ? 'visita' : 'visitas'}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {VISIT_RESULT_ORDER.filter((r) => mine.byResult[r] > 0).map((r) => (
                  <Badge key={r} variant="outline" className={`border-transparent ${VISIT_RESULT_TONE[r]}`}>
                    {VISIT_RESULT_LABEL[r]}: {number(mine.byResult[r])}
                  </Badge>
                ))}
              </div>
              {mine.visits.length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {mine.visits.slice(0, 10).map((visit) => (
                    <li key={visit.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        {visit.prospect ? (
                          <Link
                            href={`/prospects/${visit.prospect.id}`}
                            className="block truncate font-medium text-slate-800 hover:underline"
                          >
                            {visit.prospect.fullName}
                          </Link>
                        ) : (
                          <span className="block truncate font-medium text-slate-800">
                            {visit.addressLabel || 'Puerta sin contacto'}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {visitTime(visit.visitedAt)}
                          {visit.locality ? ` · ${visit.locality.name}` : ''}
                        </span>
                      </div>
                      <Badge variant="outline" className={`shrink-0 border-transparent ${VISIT_RESULT_TONE[visit.result]}`}>
                        {visit.resultLabel}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Cobertura por zona */}
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base text-foreground">Cobertura por zona</CardTitle>
            <p className="text-sm text-muted-foreground">
              {coverage?.scope === 'ORGANIZATION' ? 'Toda la organización.' : 'Tus visitas y las de tu equipo.'}
            </p>
          </div>
          <div className="flex gap-1" role="group" aria-label="Periodo">
            {PERIODS.map((value) => (
              <Button
                key={value}
                size="sm"
                variant={days === value ? 'default' : 'outline'}
                aria-pressed={days === value}
                onClick={() => setDays(value)}
              >
                {value} días
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!coverage ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Cargando la cobertura" />
          ) : coverage.total === 0 ? (
            <p className="text-sm text-muted-foreground">No hay visitas registradas en estos {coverage.days} días.</p>
          ) : (
            <>
              <div className="h-80 overflow-hidden rounded-lg border">
                <CoverageMap zones={coverage.zones} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <caption className="sr-only">Visitas por zona en los últimos {coverage.days} días</caption>
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3 font-semibold">Zona</th>
                      <th className="py-2 pr-3 text-right font-semibold">Visitas</th>
                      <th className="py-2 pr-3 text-right font-semibold">Apoya</th>
                      <th className="py-2 pr-3 text-right font-semibold">Indeciso</th>
                      <th className="py-2 pr-3 text-right font-semibold">No apoya</th>
                      <th className="py-2 pr-3 text-right font-semibold">No estaba</th>
                      <th className="py-2 font-semibold">Última</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.zones.map((zone) => (
                      <tr key={zone.localityId ?? 'none'} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium text-slate-800">{zone.name}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{number(zone.total)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{number(zone.byResult.SUPPORTS)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{number(zone.byResult.UNDECIDED)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{number(zone.byResult.OPPOSES)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{number(zone.byResult.NOT_HOME)}</td>
                        <td className="py-2 text-slate-500">{zone.lastVisitAt ? visitTime(zone.lastVisitAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canWrite && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <Button className="h-14 w-full text-base" onClick={() => setOpen(true)}>
            <DoorOpen className="mr-2 h-5 w-5" /> Registrar visita
          </Button>
        </div>
      )}

      <VisitDialog open={open} onOpenChange={setOpen} onSaved={load} />
    </div>
  );
}
