'use client';

// Fase 1C del recorrido de alta (2026-10-17): a quién va una difusión.
// "Mis contactos" arma la lista con los contactos del sistema (solo los que
// autorizaron y tienen el dato) y la cuenta en vivo; "Subir archivo" deja el
// flujo de siempre con un CSV.
import * as React from 'react';
import { Check, ChevronDown, FileSpreadsheet, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  getAudienceOptions,
  previewAudience,
  type AudienceChannel,
  type AudienceOptions,
  type AudiencePreview,
  type CampaignAudience,
} from '@/lib/api/campaign-audience';

export type AudienceMode = 'contacts' | 'file';

interface Props {
  channel: AudienceChannel;
  mode: AudienceMode;
  onModeChange: (mode: AudienceMode) => void;
  audience: CampaignAudience;
  onAudienceChange: (audience: CampaignAudience) => void;
  onOptionsLoaded?: (options: AudienceOptions) => void;
  /** Lo que se muestra cuando se elige "Subir archivo" (el selector del CSV). */
  fileInput: React.ReactNode;
}

type Item = { id: number | string; label: string };

function MultiPick({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: Item[];
  selected: (number | string)[];
  onChange: (ids: (number | string)[]) => void;
}) {
  const chosen = items.filter((i) => selected.includes(i.id));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full justify-between bg-white font-normal"
          disabled={items.length === 0}
          aria-label={label}
        >
          <span className="truncate text-left">
            {chosen.length === 0
              ? `${label}: ${items.length === 0 ? 'no hay' : 'todos'}`
              : chosen.length <= 2
                ? `${label}: ${chosen.map((c) => c.label).join(', ')}`
                : `${label}: ${chosen.length} elegidos`}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar ${label.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>No hay resultados.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const on = selected.includes(item.id);
                return (
                  <CommandItem
                    key={String(item.id)}
                    onSelect={() =>
                      onChange(on ? selected.filter((s) => s !== item.id) : [...selected, item.id])
                    }
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        on ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && (
              <CommandGroup>
                <CommandItem onSelect={() => onChange([])} className="justify-center text-center">
                  Quitar el filtro
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es-CO')} ${n === 1 ? one : many}`;

export function AudiencePicker({
  channel,
  mode,
  onModeChange,
  audience,
  onAudienceChange,
  onOptionsLoaded,
  fileInput,
}: Props) {
  const [options, setOptions] = React.useState<AudienceOptions | null>(null);
  const [optionsError, setOptionsError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<AudiencePreview | null>(null);
  const [counting, setCounting] = React.useState(false);

  React.useEffect(() => {
    if (mode !== 'contacts' || options) return;
    getAudienceOptions()
      .then((o) => {
        setOptions(o);
        onOptionsLoaded?.(o);
      })
      .catch((e) => {
        const msg = e?.response?.data?.message;
        setOptionsError(typeof msg === 'string' ? msg : 'No se pudieron cargar tus contactos.');
      });
  }, [mode, options, onOptionsLoaded]);

  const key = JSON.stringify(audience);
  React.useEffect(() => {
    if (mode !== 'contacts' || optionsError) return;
    let alive = true;
    setCounting(true);
    const t = setTimeout(() => {
      previewAudience(channel, audience)
        .then((p) => alive && setPreview(p))
        .catch(() => alive && setPreview(null))
        .finally(() => alive && setCounting(false));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, key, channel, optionsError]);

  const dato = channel === 'email' ? 'correo' : 'celular';

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-sm font-bold text-slate-700">Destinatarios</div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Destinatarios">
        {(
          [
            ['contacts', 'Mis contactos', Users],
            ['file', 'Subir archivo', FileSpreadsheet],
          ] as const
        ).map(([value, text, Icon]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => onModeChange(value)}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-md border text-xs font-medium',
              mode === value ? 'border-primary bg-white text-primary shadow-sm' : 'bg-white/60 text-slate-500 hover:bg-white',
            )}
          >
            <Icon className="h-4 w-4" /> {text}
          </button>
        ))}
      </div>

      {mode === 'file' ? (
        fileInput
      ) : optionsError ? (
        <p className="text-xs text-red-600">{optionsError}</p>
      ) : !options ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando tus contactos…
        </p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <MultiPick
              label="Zonas"
              items={options.zones.map((z) => ({ id: z.id, label: z.name }))}
              selected={audience.localityIds ?? []}
              onChange={(ids) => onAudienceChange({ ...audience, localityIds: ids as number[] })}
            />
            <MultiPick
              label="Líderes"
              items={options.leaders.map((l) => ({ id: l.id, label: l.fullName }))}
              selected={audience.leaderIds ?? []}
              onChange={(ids) => onAudienceChange({ ...audience, leaderIds: ids as string[] })}
            />
            <MultiPick
              label="Etiquetas"
              items={options.tags.map((t) => ({ id: t.id, label: t.name }))}
              selected={audience.tagIds ?? []}
              onChange={(ids) => onAudienceChange({ ...audience, tagIds: ids as number[] })}
            />
            <MultiPick
              label="Segmentos"
              items={options.segments.map((s) => ({ id: s.id, label: s.name }))}
              selected={audience.segmentIds ?? []}
              onChange={(ids) => onAudienceChange({ ...audience, segmentIds: ids as number[] })}
            />
          </div>
          <div className="text-xs text-slate-600" aria-live="polite">
            {counting || !preview ? (
              <span className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Contando…
              </span>
            ) : (
              <>
                <p>
                  Le llegará a{' '}
                  <span className="font-bold text-slate-800">
                    {plural(preview.sendable, 'contacto', 'contactos')}
                  </span>{' '}
                  con {dato} y autorización de datos.
                </p>
                {(preview.withoutConsent > 0 || preview.withoutContact > 0 || preview.excluded > 0) && (
                  <p className="text-slate-500">
                    Quedan por fuera{' '}
                    {[
                      preview.withoutConsent > 0 && plural(preview.withoutConsent, 'que no autorizó', 'que no autorizaron'),
                      preview.withoutContact > 0 && plural(preview.withoutContact, `sin ${dato}`, `sin ${dato}`),
                      preview.excluded > 0 && plural(preview.excluded, 'en la lista de exclusión', 'en la lista de exclusión'),
                    ]
                      .filter(Boolean)
                      .join(', ')
                      .replace(/, ([^,]*)$/, ' y $1')}
                    .
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
