'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, FolderSearch, Loader2, Newspaper, Radar } from 'lucide-react';
import api from '@/lib/api';
import { WelcomeChecklist } from '@/components/dashboard/welcome-checklist';

// Zyron Prensa, Fase 2 (2026-11-08): la portada de quien investiga. `/dashboard`
// son números de campaña (contactos, territorio, metas) que una organización de
// prensa no tiene. Los datos salen de `GET /organization/press-home`; un bloque
// en `null` es un módulo que la persona no puede leer y no se muestra.

interface PressHome {
  radar: {
    bodies: { code: string; name: string }[];
    changedThisWeek: number;
    unreadAlerts: number;
    projects: {
      id: string;
      title: string;
      chamber: string;
      projectNumber: string | null;
      projectYear: number | null;
      currentStage: string | null;
      updatedAt: string;
    }[];
  } | null;
  mentions: {
    newThisWeek: number;
    latest: {
      id: string;
      title: string;
      url: string;
      publishedAt: string | null;
      fetchedAt: string;
      keywordName: string;
      sourceName: string;
    }[];
  } | null;
  investigations: {
    openCount: number;
    latest: { id: string; title: string; updatedAt: string }[];
    deepSearch: { used: number; limit: number; windowDays: number };
  } | null;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' });

function Block({
  title,
  icon: Icon,
  href,
  linkLabel,
  children,
}: {
  title: string;
  icon: typeof Radar;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border bg-card p-5" aria-label={title}>
      <div className="mb-3 flex items-center gap-2">
        <Icon aria-hidden className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="flex-1 space-y-3 text-sm">{children}</div>
      <Link href={href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        {linkLabel} <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </section>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <p>
      <span className="text-2xl font-semibold tabular-nums">{value.toLocaleString('es-CO')}</span>{' '}
      <span className="text-muted-foreground">{label}</span>
    </p>
  );
}

export default function PressHomePage() {
  const [home, setHome] = useState<PressHome | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PressHome>('/organization/press-home')
      .then(({ data }) => !cancelled && setHome(data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed)
    return <p className="p-6 text-sm text-muted-foreground md:p-10">No se pudo cargar la portada. Vuelve a intentar en un momento.</p>;
  if (!home)
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground md:p-10">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Cargando…
      </div>
    );

  const { radar, mentions, investigations } = home;
  const bodyName = (code: string) => radar?.bodies.find((b) => b.code === code)?.name ?? code;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-10">
      <header>
        <h1 className="text-2xl font-semibold">Inicio</h1>
        <p className="text-sm text-muted-foreground">Lo de los últimos 7 días en lo que sigues.</p>
      </header>

      {/* Recorrido 2026-11-08: «Primeros pasos» vivía solo en el Tablero. */}
      <WelcomeChecklist />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {radar && (
          <Block title="Radar Legislativo" icon={Radar} href="/projects" linkLabel="Ir al Radar">
            {radar.bodies.length === 0 ? (
              <p className="text-muted-foreground">Todavía no sigues ninguna corporación.</p>
            ) : (
              <>
                <p className="text-muted-foreground">{radar.bodies.map((b) => b.name).join(' · ')}</p>
                <Figure value={radar.changedThisWeek} label="proyectos con movimiento esta semana" />
                {radar.unreadAlerts > 0 && <Figure value={radar.unreadAlerts} label="alertas sin leer" />}
                <ul className="space-y-2">
                  {radar.projects.map((p) => (
                    <li key={p.id}>
                      <Link href={`/projects/${p.id}`} className="line-clamp-2 font-medium hover:underline">
                        {p.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {bodyName(p.chamber)}
                        {p.currentStage ? ` · ${p.currentStage}` : ''} · {shortDate(p.updatedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Block>
        )}

        {mentions && (
          <Block title="Menciones" icon={Newspaper} href="/inteligencia/hoy" linkLabel="Ver el monitoreo">
            <Figure value={mentions.newThisWeek} label="menciones nuevas esta semana" />
            {mentions.latest.length === 0 ? (
              <p className="text-muted-foreground">Sin menciones nuevas. Revisa tus fuentes y etiquetas en el monitoreo.</p>
            ) : (
              <ul className="space-y-2">
                {mentions.latest.map((m) => (
                  <li key={m.id}>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium hover:underline">
                      {m.title}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {m.sourceName} · {m.keywordName} · {shortDate(m.publishedAt ?? m.fetchedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        )}

        {investigations && (
          <Block title="Investigaciones" icon={FolderSearch} href="/osint/casos" linkLabel="Ver las investigaciones">
            <Figure value={investigations.openCount} label="investigaciones abiertas" />
            <p>
              Deep Search: <span className="font-medium tabular-nums">{investigations.deepSearch.used}</span> de{' '}
              <span className="tabular-nums">{investigations.deepSearch.limit}</span> en los últimos{' '}
              {investigations.deepSearch.windowDays} días
            </p>
            {investigations.latest.length > 0 && (
              <ul className="space-y-2">
                {investigations.latest.map((c) => (
                  <li key={c.id}>
                    <Link href={`/osint/casos/${c.id}`} className="line-clamp-2 font-medium hover:underline">
                      {c.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">Actualizada el {shortDate(c.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        )}
      </div>
    </div>
  );
}
