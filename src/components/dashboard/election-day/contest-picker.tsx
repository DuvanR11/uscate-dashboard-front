'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiErrorMessage } from '@/lib/api-error';
import {
  CONTEST_STATUS_LABEL,
  CONTEST_STATUS_TONE,
  electionDayApi,
  rememberContest,
  rememberedContest,
  useElectionDayEnabled,
  type ContestSummary,
} from '@/lib/api/election-day';

// Fase 5 (2026-11-10): la contienda que se mira en las pantallas de la
// campaña. Se recuerda la última elegida; si no hay, la abierta.

export function useSelectedContest() {
  const enabled = useElectionDayEnabled();
  const [contests, setContests] = useState<ContestSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      electionDayApi
        .contests()
        .then((list) => {
          setContests(list);
          setError(null);
          setSelectedId((current) => {
            const wanted = current ?? rememberedContest();
            if (wanted && list.some((c) => c.id === wanted)) return wanted;
            return (list.find((c) => c.status === 'OPEN') ?? list[0])?.id ?? null;
          });
        })
        .catch((e: unknown) => {
          setError(apiErrorMessage(e) ?? 'No se pudieron cargar las contiendas.');
          setContests([]);
        }),
    [],
  );

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const select = useCallback((id: string) => {
    rememberContest(id);
    setSelectedId(id);
  }, []);

  const contest = contests?.find((c) => c.id === selectedId) ?? null;
  return { enabled, contests, contest, select, reload, error };
}

export function ElectionDayOff() {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">
        La jornada electoral todavía no está activa en Zyron. Se enciende cuando el abogado apruebe el aviso de
        testigos y fotos.
      </CardContent>
    </Card>
  );
}

export function ContestPicker({
  contests,
  contest,
  onSelect,
}: {
  contests: ContestSummary[] | null;
  contest: ContestSummary | null;
  onSelect: (id: string) => void;
}) {
  if (contests === null)
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Cargando contiendas" />;
  if (contests.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay contiendas.{' '}
        <Link href="/jornada/configurar" className="font-medium text-primary underline">
          Crea la primera
        </Link>
        .
      </p>
    );
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="contest-picker">Contienda</Label>
        <Select value={contest?.id ?? ''} onValueChange={onSelect}>
          <SelectTrigger id="contest-picker" className="w-[min(22rem,calc(100vw-2rem))]">
            <SelectValue placeholder="Elige una contienda" />
          </SelectTrigger>
          <SelectContent>
            {contests.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {contest && <Badge className={CONTEST_STATUS_TONE[contest.status]}>{CONTEST_STATUS_LABEL[contest.status]}</Badge>}
    </div>
  );
}
