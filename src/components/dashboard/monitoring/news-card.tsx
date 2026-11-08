'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  EyeOff,
  FilePlus2,
  Info,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  RotateCcw,
  Star,
  StickyNote,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { InboxNews, ReviewChange } from '@/lib/api/news-inbox';
import { formatScore } from '@/lib/format';

export interface NewsCardPermissions {
  /** Solicitud interna (`SOLICITUDES_INTERNAS` canWrite). */
  request: boolean;
  /** Caso de investigación (`OSINT_CASOS` canWrite). */
  osintCase: boolean;
  /** Derecho de petición (`PETICIONES` canWrite). */
  petition: boolean;
}

interface NewsCardProps {
  item: InboxNews;
  /** Zyron Prensa: la urgencia se lee como relevancia noticiosa (D5). */
  press: boolean;
  assignees: { id: string; fullName: string }[];
  can: NewsCardPermissions;
  onChange: (item: InboxNews, change: ReviewChange) => Promise<void>;
}

// ─── Lecturas de los datos ────────────────────────────────────────────

export function urgencyLevel(score: number | null) {
  if (score === null) return { label: 'Sin estimar', tone: 'border-slate-200 bg-slate-50 text-slate-500', icon: Info };
  if (score >= 8) return { label: 'Crítica', tone: 'border-red-200 bg-red-50 text-red-700', icon: AlertTriangle };
  if (score >= 4) return { label: 'Atención', tone: 'border-amber-200 bg-amber-50 text-amber-800', icon: AlertTriangle };
  return { label: 'Informativa', tone: 'border-slate-200 bg-slate-50 text-slate-600', icon: Info };
}

const SENTIMENT = {
  NEGATIVO: { label: 'Negativo', dot: 'bg-red-500' },
  NEUTRAL: { label: 'Neutral', dot: 'bg-slate-400' },
  POSITIVO: { label: 'Positivo', dot: 'bg-emerald-500' },
} as const;

/** «hace 25 min», «hace 3 h», «ayer 6:40 p. m.», «5 nov., 9:10 a. m.». */
export function newsTime(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 12 * 60) return `hace ${Math.round(minutes / 60)} h`;
  const time = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
  const day = (d: Date) => d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (day(date) === day(now)) return `hoy ${time}`;
  if (day(date) === day(yesterday)) return `ayer ${time}`;
  return `${date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })}, ${time}`;
}

/** Texto para compartir: medio, titular y enlace. */
export function shareText(item: Pick<InboxNews, 'outlet' | 'title' | 'url'>): string {
  return [`${item.outlet}: ${item.title}`, item.url].filter(Boolean).join('\n');
}

/** Lo que se lleva a una solicitud, un caso o una petición. */
function newsDescription(item: InboxNews): string {
  const lines = [
    `Noticia: ${item.title}`,
    `Medio: ${item.outlet}${item.publishedAt ? ` (${new Date(item.publishedAt).toLocaleDateString('es-CO')})` : ''}`,
  ];
  if (item.url) lines.push(`Enlace: ${item.url}`);
  if (item.summary) lines.push('', item.summary.slice(0, 600));
  return lines.join('\n');
}

function createLink(path: string, params: Record<string, string>): string {
  return `${path}?${new URLSearchParams({ from: 'monitoreo', ...params }).toString()}`;
}

// ─── Tarjeta ──────────────────────────────────────────────────────────

export function NewsCard({ item, press, assignees, can, onChange }: NewsCardProps) {
  const [busy, setBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(item.review.note ?? '');
  const level = urgencyLevel(item.urgencyScore);
  const LevelIcon = level.icon;
  const sentiment = item.sentiment ? SENTIMENT[item.sentiment] : null;
  const { review } = item;
  const description = newsDescription(item);
  const anyCreate = can.request || can.osintCase || can.petition;

  const change = async (next: ReviewChange) => {
    setBusy(true);
    try {
      await onChange(item, next);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText(item));
      toast.success('Copiada para compartir');
    } catch {
      toast.error('No se pudo copiar. Copia el enlace desde la noticia.');
    }
  };

  const titleClass = `text-base font-semibold leading-snug ${review.seen ? 'text-slate-600' : 'text-slate-900'}`;

  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
        review.dismissed ? 'opacity-70' : ''
      } ${review.seen ? 'border-slate-200' : 'border-l-4 border-l-secondary border-slate-200'}`}
    >
      {/* Medio, hora y urgencia */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{item.outlet}</span>
        <span aria-hidden>·</span>
        <time dateTime={item.publishedAt ?? item.fetchedAt} title={new Date(item.publishedAt ?? item.fetchedAt).toLocaleString('es-CO')}>
          {newsTime(item.publishedAt ?? item.fetchedAt)}
        </time>
        {!review.seen && <span className="rounded bg-secondary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-secondary-foreground">Nueva</span>}
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${level.tone}`}>
          <LevelIcon className="h-3 w-3" aria-hidden />
          {level.label}
          {item.urgencyScore !== null && <span className="font-normal">· {formatScore(item.urgencyScore)}</span>}
          <span className="sr-only">{press ? ' de relevancia noticiosa' : ' de urgencia'}</span>
        </span>
      </div>

      {/* Titular */}
      <h3 className="mt-2">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (!review.seen) void onChange(item, { seen: true });
            }}
            className={`${titleClass} hover:text-primary hover:underline`}
          >
            {item.title}
            <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-baseline text-slate-400" aria-hidden />
          </a>
        ) : (
          <span className={titleClass}>{item.title}</span>
        )}
      </h3>

      {item.urgencyReason && (
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-medium text-slate-700">{press ? 'Por qué es noticia: ' : 'Por qué importa: '}</span>
          {item.urgencyReason}
        </p>
      )}

      {/* Etiquetas, sentimiento, lugar y entidades */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        {item.keywords.map((keyword) => (
          <span key={keyword.id} className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {keyword.name}
          </span>
        ))}
        {sentiment && (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-slate-600">
            <span className={`h-2 w-2 rounded-full ${sentiment.dot}`} aria-hidden />
            {sentiment.label}
          </span>
        )}
        {item.locationNameRaw && (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <MapPin className="h-3 w-3" aria-hidden /> {item.locationNameRaw}
          </span>
        )}
      </div>
      {item.entities.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Menciona a: </span>
          {item.entities.slice(0, 5).join(' · ')}
        </p>
      )}

      {(review.assignedTo || review.note) && (
        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
          {review.assignedTo && (
            <p>
              <span className="font-medium text-slate-700">Asignada a:</span> {review.assignedTo.fullName}
            </p>
          )}
          {review.note && (
            <p className="whitespace-pre-line">
              <span className="font-medium text-slate-700">Nota:</span> {review.note}
            </p>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => change({ starred: !review.starred })}
          aria-pressed={review.starred}
          className={review.starred ? 'text-amber-600' : 'text-slate-600'}
        >
          <Star className={`mr-1 h-4 w-4 ${review.starred ? 'fill-amber-400' : ''}`} />
          {review.starred ? 'Destacada' : 'Destacar'}
        </Button>
        {review.dismissed ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => change({ dismissed: false })} className="text-slate-600">
            <RotateCcw className="mr-1 h-4 w-4" /> Restaurar
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => change({ dismissed: true })} className="text-slate-600">
            <EyeOff className="mr-1 h-4 w-4" /> Descartar
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={busy} className="text-slate-600">
              <UserPlus className="mr-1 h-4 w-4" /> Asignar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Asignar a</DropdownMenuLabel>
            {assignees.length === 0 && (
              <DropdownMenuItem disabled>Nadie más tiene Monitoreo</DropdownMenuItem>
            )}
            {assignees.map((person) => (
              <DropdownMenuItem key={person.id} onClick={() => change({ assignedToId: person.id })}>
                {review.assignedTo?.id === person.id && <Check className="mr-2 h-4 w-4" />}
                {person.fullName}
              </DropdownMenuItem>
            ))}
            {review.assignedTo && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => change({ assignedToId: null })}>Quitar asignación</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => {
            setNote(review.note ?? '');
            setNoteOpen(true);
          }}
          className="text-slate-600"
        >
          <StickyNote className="mr-1 h-4 w-4" /> Nota
        </Button>

        <Button variant="ghost" size="sm" asChild className="text-emerald-700">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText(item))}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
          </a>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-auto text-slate-600" aria-label="Más acciones">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={copy}>
              <Copy className="mr-2 h-4 w-4" /> Copiar para compartir
            </DropdownMenuItem>
            {anyCreate && <DropdownMenuSeparator />}
            {anyCreate && <DropdownMenuLabel>Crear desde la noticia</DropdownMenuLabel>}
            {can.request && (
              <DropdownMenuItem asChild>
                <Link href={createLink('/requests/new', { subject: item.title.slice(0, 200), description })}>
                  <FilePlus2 className="mr-2 h-4 w-4" /> Solicitud interna
                </Link>
              </DropdownMenuItem>
            )}
            {can.osintCase && (
              <DropdownMenuItem asChild>
                <Link href={createLink('/osint/casos', { title: item.title.slice(0, 200), description })}>
                  <FilePlus2 className="mr-2 h-4 w-4" /> Caso de investigación
                </Link>
              </DropdownMenuItem>
            )}
            {can.petition && (
              <DropdownMenuItem asChild>
                <Link href={createLink('/peticiones', { subject: item.title.slice(0, 240), facts: description })}>
                  <FilePlus2 className="mr-2 h-4 w-4" /> Derecho de petición
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nota del equipo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 line-clamp-2">{item.title}</p>
          <Textarea
            id={`news-note-${item.newsKey}`}
            value={note}
            maxLength={1000}
            rows={4}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Qué hacer con esta noticia, a quién llamar…"
          />
          <DialogFooter>
            {review.note && (
              <Button
                variant="ghost"
                onClick={async () => {
                  await change({ note: null });
                  setNoteOpen(false);
                }}
              >
                Borrar nota
              </Button>
            )}
            <Button
              disabled={busy}
              onClick={async () => {
                await change({ note: note.trim() || null });
                setNoteOpen(false);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
