'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { QuerySection } from './query-section';
import {
  getActivityDetail,
  getActivitySummary,
  type ActivityDetail,
  type OrganizationActivity,
} from '@/lib/api/platform-activity';

// Fase 6 "Piloto y medición": responde "¿este cliente está usando lo que
// compró?" — cuánta gente entra, cuántos días y qué áreas no ha abierto nadie.

const PERIODS = [7, 30, 90] as const;

const bogota = { timeZone: 'America/Bogota' } as const;

function when(value: string | null) {
  if (!value) return 'Sin actividad';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  const date = new Date(value).toLocaleDateString('es-CO', { ...bogota, day: 'numeric', month: 'short' });
  if (days <= 0) return `Hoy (${date})`;
  if (days === 1) return `Ayer (${date})`;
  return `Hace ${days} días (${date})`;
}

const dayLabel = (value: string) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

function Meter({ value, total, label }: { value: number; total: number; label: string }) {
  const percent = total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0;
  return (
    <div className="min-w-28">
      <div className="text-sm tabular-nums">
        <span className="font-semibold">{value}</span> de {total}
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted" role="img" aria-label={`${label}: ${value} de ${total}`}>
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Detail({ data }: { data: ActivityDetail }) {
  const unused = data.areas.filter((area) => area.days === 0);
  const idle = data.users.filter((user) => user.days === 0);
  const peak = Math.max(1, ...data.daily.map((d) => d.users));
  return (
    <div className="space-y-6">
      {(unused.length > 0 || idle.length > 0) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          {unused.length > 0 && (
            <p>
              <span className="font-semibold">Áreas de su plan que nadie ha abierto:</span>{' '}
              {unused.map((area) => area.area).join(', ')}.
            </p>
          )}
          {idle.length > 0 && (
            <p className={unused.length > 0 ? 'mt-1' : undefined}>
              <span className="font-semibold">
                {idle.length} de {data.users.length} personas del equipo no han entrado
              </span>{' '}
              en los últimos {data.days} días.
            </p>
          )}
        </div>
      )}

      {data.daily.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Personas activas por día</h3>
          <div className="flex h-20 items-end gap-0.5" role="img" aria-label="Personas activas por día">
            {data.daily.map((d) => (
              <div
                key={d.day}
                title={`${dayLabel(d.day)}: ${d.users} ${d.users === 1 ? 'persona' : 'personas'}`}
                className="min-w-1 flex-1 rounded-t bg-primary/70"
                style={{ height: `${Math.max((d.users / peak) * 100, 6)}%` }}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Solo aparecen los días con actividad. Máximo: {peak} {peak === 1 ? 'persona' : 'personas'} en un día.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <h3 className="mb-2 text-sm font-semibold">Por área</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">Área</th>
              <th className="py-2 pr-4 font-medium">Personas</th>
              <th className="py-2 pr-4 font-medium">Días con uso</th>
              <th className="py-2 pr-4 font-medium">Consultas</th>
              <th className="py-2 pr-4 font-medium">Cambios</th>
              <th className="py-2 font-medium">Última vez</th>
            </tr>
          </thead>
          <tbody>
            {data.areas.map((area) => (
              <tr key={area.area} className={`border-t ${area.days === 0 ? 'text-muted-foreground' : ''}`}>
                <td className="py-2 pr-4 font-medium">{area.area}</td>
                <td className="py-2 pr-4 tabular-nums">{area.users}</td>
                <td className="py-2 pr-4 tabular-nums">{area.days}</td>
                <td className="py-2 pr-4 tabular-nums">{area.reads}</td>
                <td className="py-2 pr-4 tabular-nums">{area.writes}</td>
                <td className="py-2">{area.days === 0 ? 'Sin uso' : when(area.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <h3 className="mb-2 text-sm font-semibold">Por persona</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">Persona</th>
              <th className="py-2 pr-4 font-medium">Rol</th>
              <th className="py-2 pr-4 font-medium">Días con uso</th>
              <th className="py-2 pr-4 font-medium">Cambios</th>
              <th className="py-2 pr-4 font-medium">Áreas</th>
              <th className="py-2 font-medium">Última vez</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id} className={`border-t ${user.days === 0 ? 'text-muted-foreground' : ''}`}>
                <td className="py-2 pr-4 font-medium">{user.fullName}</td>
                <td className="py-2 pr-4">{user.role ?? '—'}</td>
                <td className="py-2 pr-4 tabular-nums">{user.days}</td>
                <td className="py-2 pr-4 tabular-nums">{user.writes}</td>
                <td className="py-2 pr-4">{user.areas.length > 0 ? user.areas.join(', ') : '—'}</td>
                <td className="py-2">{user.days === 0 ? 'No ha entrado' : when(user.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrganizationDetail({ organization, days, onClose }: { organization: OrganizationActivity; days: number; onClose: () => void }) {
  const load = useCallback(() => getActivityDetail(organization.id, days), [organization.id, days]);
  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={onClose}>
        ← Volver a todas las organizaciones
      </Button>
      <QuerySection title={`${organization.name} — últimos ${days} días`} load={load}>
        {(data) => <Detail data={data} />}
      </QuerySection>
    </div>
  );
}

export function ActivityBoard() {
  const [days, setDays] = useState<number>(30);
  const [selected, setSelected] = useState<OrganizationActivity | null>(null);
  const load = useCallback(() => getActivitySummary(days), [days]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Uso de la plataforma</h1>
          <p className="text-sm text-muted-foreground">
            Cuánta gente de cada organización entra y qué áreas de su plan usa de verdad.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Periodo">
          {PERIODS.map((period) => (
            <Button
              key={period}
              type="button"
              variant={period === days ? 'default' : 'outline'}
              aria-pressed={period === days}
              onClick={() => setDays(period)}
            >
              {period} días
            </Button>
          ))}
        </div>
      </div>

      {selected ? (
        <OrganizationDetail organization={selected} days={days} onClose={() => setSelected(null)} />
      ) : (
        <QuerySection title={`Organizaciones — últimos ${days} días`} load={load}>
          {(data) => {
            const organizations = [...data.organizations].sort(
              (a, b) =>
                Number(a.isDemo) - Number(b.isDemo) ||
                (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''),
            );
            return (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {data.trackingSince
                    ? `La medición empezó el ${dayLabel(String(data.trackingSince).slice(0, 10))}: antes de esa fecha no hay datos, así que "sin actividad" puede ser solo "todavía no se medía".`
                    : 'La medición acaba de activarse y todavía no hay actividad registrada. Los datos aparecen a medida que los equipos usan la plataforma.'}{' '}
                  No cuentan las sesiones de soporte (&ldquo;ver como&rdquo;).
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4 font-medium">Organización</th>
                        <th className="py-2 pr-4 font-medium">Personas que entraron</th>
                        <th className="py-2 pr-4 font-medium">Días con actividad</th>
                        <th className="py-2 pr-4 font-medium">Áreas usadas de su plan</th>
                        <th className="py-2 pr-4 font-medium">Sin abrir</th>
                        <th className="py-2 pr-4 font-medium">Última actividad</th>
                        <th className="py-2 font-medium">
                          <span className="sr-only">Detalle</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizations.map((organization) => {
                        const unused = organization.areasAvailable.filter((area) => !organization.areasUsed.includes(area));
                        return (
                          <tr key={organization.id} className="border-t align-top">
                            <td className="py-3 pr-4">
                              <div className="font-medium">{organization.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {organization.planCode ?? 'Sin plan'}
                                {organization.isDemo ? ' · Demo' : ''}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <Meter value={organization.activeUsers} total={organization.teamUsers} label="Personas que entraron" />
                            </td>
                            <td className="py-3 pr-4">
                              <Meter value={organization.activeDays} total={data.days} label="Días con actividad" />
                            </td>
                            <td className="py-3 pr-4">
                              <Meter value={organization.areasUsed.length} total={organization.areasAvailable.length} label="Áreas usadas" />
                            </td>
                            <td className="max-w-xs py-3 pr-4 text-muted-foreground">
                              {unused.length === 0 ? 'Nada' : unused.join(', ')}
                            </td>
                            <td className="py-3 pr-4">{when(organization.lastActivityAt)}</td>
                            <td className="py-3">
                              <Button type="button" variant="outline" onClick={() => setSelected(organization)}>
                                Ver detalle
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }}
        </QuerySection>
      )}
    </div>
  );
}
