'use client';

// Lista de líneas del bot con su estado (2026-11-09). Antes la tarjeta
// «Líneas conectadas» mostraba solo el nombre de las conectadas: una línea que
// se caía desaparecía mientras reconectaba, una que no volvía no se podía
// quitar y una cerrada desde el celular se esfumaba sin explicación. Ahora el
// servidor (`GET /api/sessions` → `lines`) da cada línea vinculada con su
// estado, número, nombre en WhatsApp, desde cuándo y el último envío.
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, RefreshCw, Smartphone, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type WhatsappLineState =
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'LOGGED_OUT'
  | 'BLOCKED';

export interface WhatsappLine {
  name: string;
  state: WhatsappLineState;
  phone: string | null;
  displayName: string | null;
  since: string | null;
  lastSentAt: string | null;
  queuedUntil: string | null;
}

const STATE: Record<
  WhatsappLineState,
  { label: string; dot: string; badge: string; help: string | null }
> = {
  CONNECTED: {
    label: 'Conectada',
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 border-green-200',
    help: null,
  },
  RECONNECTING: {
    label: 'Reconectando',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    help: 'Se cayó la conexión y Zyron la está levantando. Mientras tanto no envía.',
  },
  DISCONNECTED: {
    label: 'Desconectada',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
    help: 'No ha logrado volver. Zyron sigue intentando cada 5 minutos; revisa que el celular tenga internet.',
  },
  LOGGED_OUT: {
    label: 'Cerrada en el celular',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    help: 'Se quitó desde WhatsApp en el celular. Para volver a usarla, vincúlala de nuevo.',
  },
  BLOCKED: {
    label: 'Rechazada por WhatsApp',
    dot: 'bg-red-600',
    badge: 'bg-red-50 text-red-700 border-red-200',
    help: 'WhatsApp no deja conectar esta cuenta: puede estar bloqueada o suspendida. Revísala en el celular.',
  },
};

/** «573001234567» → «+57 300 123 4567»; otro país, solo con «+». */
export function formatLinePhone(phone: string | null): string | null {
  if (!phone) return null;
  const co = /^57(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return co ? `+57 ${co[1]} ${co[2]} ${co[3]}` : `+${phone}`;
}

const TZ = 'America/Bogota';

/**
 * «hasta las 4:10 p. m.» hoy; «hasta el 10 de nov., 8:00 a. m.» otro día, en
 * la hora de Colombia (como las noticias de Monitoreo): `date-fns` con `es`
 * escribe «PM».
 */
function until(value: string, now: Date) {
  const date = new Date(value);
  const time = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
  const day = (d: Date) => d.toLocaleDateString('es-CO', { timeZone: TZ });
  if (day(date) === day(now)) return `hasta las ${time}`;
  const dayMonth = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: TZ });
  return `hasta el ${dayMonth}, ${time}`;
}

function ago(value: string) {
  return formatDistanceToNow(new Date(value), { locale: es, addSuffix: true });
}

interface Props {
  lines: WhatsappLine[];
  /** Puede vincular, reconectar y quitar (permiso de borrar en WhatsApp). */
  canManage: boolean;
  busyLine: string | null;
  onReconnect: (line: WhatsappLine) => void;
  onRemove: (line: WhatsappLine) => void;
}

export function WhatsappLinesCard({ lines, canManage, busyLine, onReconnect, onRemove }: Props) {
  const now = new Date();
  const connected = lines.filter((l) => l.state === 'CONNECTED').length;

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center gap-2">
          Líneas
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-600 normal-case tracking-normal"
            aria-label={`${connected} de ${lines.length} conectadas`}
          >
            {connected} de {lines.length} conectadas
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[420px] overflow-y-auto custom-scrollbar">
        {lines.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">
            <Smartphone className="w-8 h-8 text-slate-200 mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs text-slate-400">Sin líneas vinculadas.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((line) => {
              const s = STATE[line.state];
              const phone = formatLinePhone(line.phone);
              const busy = busyLine === line.name;
              const canReconnect = line.state === 'DISCONNECTED' || line.state === 'BLOCKED';
              return (
                <li
                  key={line.name}
                  data-line={line.name}
                  className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative mt-0.5 shrink-0">
                        <div className="bg-slate-100 p-1.5 rounded-full">
                          <Smartphone className="w-4 h-4 text-slate-600" aria-hidden="true" />
                        </div>
                        <span
                          className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-2 border-white rounded-full ${s.dot}`}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-700 break-all">{line.name}</p>
                        {(phone || line.displayName) && (
                          <p className="text-xs text-slate-500 break-words">
                            {/* El número no se parte en dos renglones. */}
                            {phone && <span className="whitespace-nowrap">{phone}</span>}
                            {phone && line.displayName ? ' · ' : ''}
                            {line.displayName}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge variant="outline" className={`text-[11px] ${s.badge}`}>
                            {s.label}
                          </Badge>
                          {line.since && (
                            <span className="text-[11px] text-slate-400">{ago(line.since)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-1">
                        {canReconnect && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onReconnect(line)}
                            disabled={busy}
                            aria-label={`Reconectar ahora la línea ${line.name}`}
                            title="Reconectar ahora"
                            className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/5"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(line)}
                          disabled={busy}
                          aria-label={`${line.state === 'CONNECTED' ? 'Desconectar' : 'Quitar'} la línea ${line.name}`}
                          title={line.state === 'CONNECTED' ? 'Desconectar' : 'Quitar'}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {s.help && <p className="mt-2 text-xs text-slate-500">{s.help}</p>}
                  {(line.queuedUntil || line.lastSentAt) && (
                    <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                      {/* Sin punto final: la hora ya termina en «a. m.» o «p. m.». */}
                      {line.queuedUntil && (
                        <p>Difusión en curso: turnos reservados {until(line.queuedUntil, now)}</p>
                      )}
                      {line.lastSentAt && <p>Último envío {ago(line.lastSentAt)}.</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
