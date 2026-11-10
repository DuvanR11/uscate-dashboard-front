'use client';

// Plan hacia la versión estable, Fase 5 (2026-11-10): «Jornada electoral —
// Conteo en vivo». Mesas reportadas, votos por renglón, por municipio y por
// puesto, E-14 por revisar e incidentes abiertos. El Coordinador ve solo los
// puestos de su territorio (lo recorta el servidor).
import { ContestPicker, ElectionDayOff, useSelectedContest } from '@/components/dashboard/election-day/contest-picker';
import { LiveCountView } from '@/components/dashboard/election-day/live-count';

export default function ElectionLivePage() {
  const { enabled, contests, contest, select, error } = useSelectedContest();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Conteo en vivo</h1>
        <p className="text-sm text-muted-foreground">
          Lo que reportan tus testigos desde las mesas, sumado por puesto y municipio.
        </p>
      </div>
      {enabled === false ? (
        <ElectionDayOff />
      ) : (
        <>
          <ContestPicker contests={contests} contest={contest} onSelect={select} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {contest && <LiveCountView contestId={contest.id} />}
        </>
      )}
    </div>
  );
}
