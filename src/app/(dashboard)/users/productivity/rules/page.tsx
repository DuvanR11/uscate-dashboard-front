'use client';

// Fase 4 "Líderes y celular" (2026-10-06): qué acciones dan puntos y cuántos.
// Hasta hoy no existía esta pantalla: los puntos venían escritos en el código
// y la tabla de reglas estaba vacía. Cada organización parte de los valores
// por defecto y puede cambiarlos.
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractErrorMessage } from '@/lib/api/catalogs';
import { productivityApi, type PointsRule } from '@/lib/api/leaders';
import { usePermission } from '@/hooks/use-permission';

const GROUPS: PointsRule['group'][] = ['Votantes', 'Solicitudes', 'Denuncias'];
const MAX_POINTS = 1000;

/** Texto → entero entre -1000 y 1000, o `null` si no es válido. */
function parsePoints(raw: string): number | null {
  const text = raw.trim();
  if (!/^-?\d{1,4}$/.test(text)) return null;
  const value = Number(text);
  return Math.abs(value) <= MAX_POINTS ? value : null;
}

export default function PointsRulesPage() {
  const canWrite = usePermission('PRODUCTIVIDAD', 'canWrite');
  const [rules, setRules] = useState<PointsRule[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    productivityApi
      .rules()
      .then((data) => {
        if (cancelled) return;
        setRules(data);
        setDraft(Object.fromEntries(data.map((rule) => [rule.type, String(rule.points)])));
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const changed = useMemo(
    () => (rules ?? []).filter((rule) => (draft[rule.type] ?? '').trim() !== String(rule.points)),
    [rules, draft],
  );
  const invalid = changed.filter((rule) => parsePoints(draft[rule.type] ?? '') === null);

  const apply = (data: PointsRule[]) => {
    setRules(data);
    setDraft(Object.fromEntries(data.map((rule) => [rule.type, String(rule.points)])));
  };

  const save = async () => {
    if (invalid.length > 0) {
      toast.error(`Revisa "${invalid[0].label}": los puntos deben ser un número entero entre -${MAX_POINTS} y ${MAX_POINTS}.`);
      return;
    }
    setSaving(true);
    try {
      apply(
        await productivityApi.updateRules(
          changed.map((rule) => ({ type: rule.type, points: parsePoints(draft[rule.type]) })),
        ),
      );
      toast.success('Reglas guardadas. Aplican a lo que se registre desde ahora.');
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudieron guardar las reglas.');
    } finally {
      setSaving(false);
    }
  };

  const restore = async (rule: PointsRule) => {
    setSaving(true);
    try {
      apply(await productivityApi.updateRules([{ type: rule.type, points: null }]));
      toast.success(`"${rule.label}" volvió a su valor por defecto`);
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo restablecer la regla.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
          <Scale className="h-7 w-7 text-secondary" /> Reglas de puntos
        </h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          Cuántos puntos da cada acción. Captar o confirmar un votante le suma al líder a cargo del contacto,
          aunque lo haya digitado otra persona. Un cambio aplica a lo que se registre de aquí en adelante: los
          puntos ya ganados no se recalculan.
        </p>
      </div>

      {failed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          No se pudieron cargar las reglas.{' '}
          <button className="font-semibold underline" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </button>
        </div>
      ) : rules === null ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando las reglas" />
        </div>
      ) : (
        <>
          {GROUPS.map((group) => {
            const items = rules.filter((rule) => rule.group === group);
            if (items.length === 0) return null;
            return (
              <section key={group} aria-labelledby={`rules-${group}`} className="space-y-2">
                <h2 id={`rules-${group}`} className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {group}
                </h2>
                <ul className="divide-y rounded-lg border bg-white">
                  {items.map((rule) => {
                    const inputId = `rule-${rule.type}`;
                    const value = draft[rule.type] ?? '';
                    const isInvalid = value.trim() !== String(rule.points) && parsePoints(value) === null;
                    return (
                      <li
                        key={rule.type}
                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <label htmlFor={inputId} className="flex flex-wrap items-center gap-2 font-semibold text-slate-800">
                            {rule.label}
                            {rule.customized && (
                              <Badge variant="secondary" className="text-[10px]">
                                Cambiada (por defecto: {rule.defaultPoints})
                              </Badge>
                            )}
                          </label>
                          <p className="text-sm text-slate-500">{rule.description}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {canWrite ? (
                            <>
                              <Input
                                id={inputId}
                                inputMode="numeric"
                                className="h-10 w-24 text-right tabular-nums"
                                aria-invalid={isInvalid}
                                value={value}
                                onChange={(e) => setDraft((current) => ({ ...current, [rule.type]: e.target.value }))}
                              />
                              <span className="text-sm text-slate-500">puntos</span>
                              {rule.customized && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-10 w-10"
                                  disabled={saving}
                                  onClick={() => restore(rule)}
                                  aria-label={`Volver "${rule.label}" a su valor por defecto`}
                                  title="Volver al valor por defecto"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <span className="text-base font-bold tabular-nums text-slate-800">
                              {rule.points} <span className="text-sm font-normal text-slate-500">puntos</span>
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {canWrite && (
            <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-lg border bg-white/95 p-3 shadow-sm backdrop-blur">
              <span className="text-sm text-slate-500">
                {changed.length === 0 ? 'Sin cambios' : `${changed.length} cambio(s) sin guardar`}
              </span>
              <Button onClick={save} disabled={saving || changed.length === 0}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
