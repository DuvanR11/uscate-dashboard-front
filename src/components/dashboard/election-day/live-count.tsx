'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2, Siren } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVisibleInterval } from '@/hooks/use-visible-interval';
import { apiErrorMessage } from '@/lib/api-error';
import { electionDayApi, number, percent, type LiveCount } from '@/lib/api/election-day';

// Fase 5 (2026-11-10): el conteo en vivo de una contienda. Se usa en
// «Jornada electoral» y en el Día D. El servidor guarda el cálculo 10 s; aquí
// se pide cada 30 s con la pestaña visible.

const POLL_MS = 30_000;

function Tile({
  icon: Icon,
  label,
  value,
  detail,
  href,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  detail?: string;
  href?: string;
}) {
  const body = (
    <CardContent className="flex items-start gap-3 p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </CardContent>
  );
  return <Card>{href ? <Link href={href}>{body}</Link> : body}</Card>;
}

export function LiveCountView({ contestId, compact = false }: { contestId: string; compact?: boolean }) {
  // El conteo queda ligado a su contienda: al cambiarla se ve «cargando» y no
  // el conteo de la anterior.
  const [loaded, setLoaded] = useState<{ contestId: string; data: LiveCount } | null>(null);
  const data = loaded?.contestId === contestId ? loaded.data : null;
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    () =>
      electionDayApi
        .live(contestId)
        .then((value) => {
          setLoaded({ contestId, data: value });
          setError(null);
        })
        .catch((e: unknown) => setError(apiErrorMessage(e) ?? 'No se pudo cargar el conteo.')),
    [contestId],
  );

  useEffect(() => {
    void load();
  }, [load]);
  useVisibleInterval(load, POLL_MS);
  useVisibleInterval(() => setNow(Date.now()), 5_000);

  const countedLines = useMemo(
    () => (data?.lines ?? []).filter((l) => l.kind === 'CANDIDATE' || l.kind === 'LIST'),
    [data],
  );
  const maxVotes = Math.max(1, ...(data?.lines ?? []).map((l) => l.votes));
  const columns = countedLines.slice(0, 4);
  const stations = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (data?.byStation ?? []).filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [data, filter]);

  if (error && !data) return <p className="text-sm text-destructive">{error}</p>;
  if (!data)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Cargando conteo" />
      </div>
    );

  const t = data.totals;
  const progress = t.tables > 0 ? (t.reported / t.tables) * 100 : 0;
  const age = Math.max(0, Math.round((now - new Date(data.serverTime).getTime()) / 1000));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Actualizado hace {age < 60 ? `${age} s` : `${Math.round(age / 60)} min`}
        {error ? ' · sin conexión con el servidor, se reintenta' : ''}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Mesas reportadas</p>
            <p className="text-2xl font-semibold tabular-nums">
              {number(t.reported)} <span className="text-base font-normal text-muted-foreground">de {number(t.tables)}</span>
            </p>
            <Progress value={progress} className="mt-2 h-2" aria-label="Avance de mesas reportadas" />
            <p className="mt-1 text-xs text-muted-foreground">{percent(Math.round(progress * 10) / 10)}</p>
          </CardContent>
        </Card>
        <Tile icon={ClipboardCheck} label="Mesas instaladas" value={number(t.installed)} detail="Con testigo en su puesto" />
        <Tile
          icon={AlertTriangle}
          label="E-14 por revisar"
          value={number(t.toReview)}
          detail="Con alertas, sin revisar"
          href={compact ? undefined : '/jornada/mesas?estado=FLAGGED'}
        />
        <Tile
          icon={Siren}
          label="Incidentes abiertos"
          value={number(t.openIncidents)}
          href={compact ? undefined : '/jornada/incidentes'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Votos por renglón</CardTitle>
          <CardDescription>
            Suma de los E-14 enviados y revisados. El porcentaje es sobre los votos por candidatos o listas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {data.lines.map((line) => (
              <li key={line.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={line.isOwn ? 'font-semibold' : ''}>
                    {line.label}
                    {line.isOwn && <span className="ml-2 text-xs font-normal text-muted-foreground">(tu campaña)</span>}
                  </span>
                  <span className="tabular-nums">
                    {number(line.votes)}
                    {line.share !== null && <span className="ml-2 text-muted-foreground">{percent(line.share)}</span>}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${line.isOwn ? 'bg-primary' : 'bg-slate-400 dark:bg-slate-500'}`}
                    style={{ width: `${(line.votes / maxVotes) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {!compact && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por municipio</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <BucketTable rows={data.byMunicipality.map((m) => ({ key: String(m.id), ...m }))} columns={columns} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Por puesto</CardTitle>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar puesto"
                aria-label="Buscar puesto"
                className="sm:w-64"
              />
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <BucketTable rows={stations.map((s) => ({ key: String(s.id), ...s }))} columns={columns} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function BucketTable({
  rows,
  columns,
}: {
  rows: ({ key: string; name: string } & LiveCount['byStation'][number])[] | ({ key: string; name: string } & LiveCount['byMunicipality'][number])[];
  columns: LiveCount['lines'];
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Sin mesas para mostrar.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="text-right">Reportadas</TableHead>
          {columns.map((line) => (
            <TableHead key={line.id} className="text-right">
              {line.label}
            </TableHead>
          ))}
          <TableHead className="text-right">Por revisar</TableHead>
          <TableHead className="text-right">Incidentes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-right tabular-nums">
              {number(row.reported)} / {number(row.tables)}
            </TableCell>
            {columns.map((line) => (
              <TableCell key={line.id} className="text-right tabular-nums">
                {number(row.votes[line.id] ?? 0)}
              </TableCell>
            ))}
            <TableCell className="text-right tabular-nums">{number(row.toReview)}</TableCell>
            <TableCell className="text-right tabular-nums">{number(row.openIncidents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Para el Día D: el conteo de las jornadas abiertas, si quien mira administra
 * la jornada (con la jornada apagada no tiene el módulo y no se muestra nada).
 */
export function OpenContestsLive() {
  const [open, setOpen] = useState<{ id: string; name: string }[] | null>(null);
  useEffect(() => {
    electionDayApi
      .contests()
      .then((list) => setOpen(list.filter((c) => c.status === 'OPEN').slice(0, 3)))
      .catch(() => setOpen([]));
  }, []);
  if (!open || open.length === 0) return null;
  return (
    <div className="space-y-6">
      {open.map((contest) => (
        <section key={contest.id} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold">Conteo de testigos · {contest.name}</h3>
            <Link href="/jornada" className="text-sm font-medium text-primary hover:underline">
              Ver el conteo completo
            </Link>
          </div>
          <LiveCountView contestId={contest.id} compact />
        </section>
      ))}
    </div>
  );
}
