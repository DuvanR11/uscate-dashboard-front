'use client';

import { useState } from 'react';
import { Loader2, Plus, Target, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { formatIndicatorValue } from '@/components/dashboard/government-plan/diagnosis-section';
import { updateProposals, type DraftEdit, type PlanDraft, type ProposalGoal } from '@/lib/api/government-plan';

/**
 * Plan de gobierno, Fase 5 (2026-10-15). La campaña corrige el borrador antes
 * de descargarlo: portada, visión, principios, ejes y propuestas (quitar o
 * agregar). Las metas se muestran pero no se editan: las pone el servidor con
 * el dato oficial, y una propuesta nueva no lleva meta. Marcar "revisado"
 * quita la marca "Borrador para revisión" del PDF y el Word.
 */

type EditProposal = { key: string; id?: string; title: string; description: string; actions: string; goal: ProposalGoal | null };
type EditAxis = { dimension: string; name: string; title: string; problem: string; proposals: EditProposal[] };

let counter = 0;
const newKey = () => `n${++counter}`;
const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return 'Revisa los campos: hay un texto demasiado largo o vacío.';
  return 'No se pudieron guardar los cambios. Vuelve a intentarlo.';
}

export function DraftEditor({
  draft,
  onSaved,
  onCancel,
}: {
  draft: PlanDraft;
  onSaved: (draft: PlanDraft) => void;
  onCancel: () => void;
}) {
  const content = draft.content!;
  const [candidateName, setCandidateName] = useState(content.document?.candidateName ?? '');
  const [party, setParty] = useState(content.document?.party ?? '');
  const [slogan, setSlogan] = useState(content.document?.slogan ?? '');
  const [vision, setVision] = useState(content.vision);
  const [principles, setPrinciples] = useState(content.principles.join('\n'));
  const [axes, setAxes] = useState<EditAxis[]>(() =>
    content.axes.map((a) => ({
      dimension: a.dimension,
      name: a.name,
      title: a.title,
      problem: a.problem,
      proposals: a.proposals.map((p) => ({
        key: p.id,
        id: p.id,
        title: p.title,
        description: p.description,
        actions: p.actions.join('\n'),
        goal: p.goal,
      })),
    })),
  );
  const [reviewed, setReviewed] = useState(!!content.reviewed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAxis = (i: number, patch: Partial<EditAxis>) => setAxes((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const setProposal = (i: number, k: number, patch: Partial<EditProposal>) =>
    setAxes((list) =>
      list.map((a, j) => (j === i ? { ...a, proposals: a.proposals.map((p, m) => (m === k ? { ...p, ...patch } : p)) } : a)),
    );

  const removeAxis = async (i: number) => {
    if (axes.length === 1) return;
    const ok = await confirmDialog({
      title: 'Quitar el eje',
      description: `Se quita "${axes[i].title}" con sus propuestas y metas. Para recuperarlo hay que cancelar la edición o redactar de nuevo.`,
      confirmLabel: 'Quitar eje',
      destructive: true,
    });
    if (ok) setAxes((list) => list.filter((_, j) => j !== i));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const body: DraftEdit = {
      vision,
      principles: lines(principles),
      axes: axes.map((a) => ({
        dimension: a.dimension,
        title: a.title,
        problem: a.problem,
        proposals: a.proposals.map((p) => ({ id: p.id, title: p.title, description: p.description, actions: lines(p.actions) })),
      })),
      document: { candidateName, party, slogan },
      reviewed,
    };
    try {
      onSaved(await updateProposals(draft.id, body));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="edit-cover" className="space-y-3 rounded-lg border border-border p-4">
        <h4 id="edit-cover" className="text-sm font-semibold text-foreground">
          Portada del documento
        </h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label htmlFor="doc-candidate" className="text-xs font-medium text-slate-600">
              Nombre del candidato o candidata
            </label>
            <Input id="doc-candidate" value={candidateName} maxLength={120} onChange={(e) => setCandidateName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label htmlFor="doc-party" className="text-xs font-medium text-slate-600">
              Partido, movimiento o coalición
            </label>
            <Input id="doc-party" value={party} maxLength={160} onChange={(e) => setParty(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label htmlFor="doc-slogan" className="text-xs font-medium text-slate-600">
              Lema (opcional)
            </label>
            <Input id="doc-slogan" value={slogan} maxLength={200} onChange={(e) => setSlogan(e.target.value)} className="mt-1" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <label htmlFor="edit-vision" className="text-sm font-semibold text-foreground">
            Visión
          </label>
          <Textarea id="edit-vision" value={vision} maxLength={3000} rows={4} onChange={(e) => setVision(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label htmlFor="edit-principles" className="text-sm font-semibold text-foreground">
            Principios <span className="font-normal text-slate-500">(uno por línea)</span>
          </label>
          <Textarea id="edit-principles" value={principles} rows={3} onChange={(e) => setPrinciples(e.target.value)} className="mt-1" />
        </div>
      </section>

      {axes.map((axis, i) => (
        <section key={axis.dimension} className="space-y-3 rounded-lg border border-border p-4" aria-label={`Eje ${i + 1}: ${axis.name}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Eje {i + 1} · {axis.name}
            </p>
            {axes.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => void removeAxis(i)} aria-label={`Quitar el eje ${axis.name}`}>
                <Trash2 aria-hidden className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div>
            <label htmlFor={`axis-title-${i}`} className="text-xs font-medium text-slate-600">
              Título del eje
            </label>
            <Input id={`axis-title-${i}`} value={axis.title} maxLength={160} onChange={(e) => setAxis(i, { title: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label htmlFor={`axis-problem-${i}`} className="text-xs font-medium text-slate-600">
              Problema
            </label>
            <Textarea id={`axis-problem-${i}`} value={axis.problem} maxLength={2000} rows={3} onChange={(e) => setAxis(i, { problem: e.target.value })} className="mt-1" />
          </div>
          <div className="space-y-3">
            {axis.proposals.map((p, k) => (
              <div key={p.key} className="space-y-2 rounded-md bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <label htmlFor={`prop-title-${i}-${k}`} className="text-xs font-medium text-slate-600">
                    Propuesta {i + 1}.{k + 1}
                  </label>
                  {axis.proposals.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAxis(i, { proposals: axis.proposals.filter((_, m) => m !== k) })}
                      aria-label={`Quitar la propuesta ${i + 1}.${k + 1}`}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input id={`prop-title-${i}-${k}`} value={p.title} maxLength={200} onChange={(e) => setProposal(i, k, { title: e.target.value })} />
                <Textarea
                  aria-label={`Descripción de la propuesta ${i + 1}.${k + 1}`}
                  value={p.description}
                  maxLength={2000}
                  rows={2}
                  onChange={(e) => setProposal(i, k, { description: e.target.value })}
                />
                <Textarea
                  aria-label={`Acciones de la propuesta ${i + 1}.${k + 1}, una por línea`}
                  placeholder="Acciones, una por línea"
                  value={p.actions}
                  rows={3}
                  onChange={(e) => setProposal(i, k, { actions: e.target.value })}
                />
                {p.goal ? (
                  <p className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Target aria-hidden className="h-3.5 w-3.5 text-primary" />
                    Meta {p.goal.targetYear}: {p.goal.indicatorName}, de {formatIndicatorValue(p.goal.baseline.value, p.goal.unit)} a{' '}
                    {formatIndicatorValue(p.goal.target, p.goal.unit)} (dato oficial, no se edita).
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Sin meta: la propuesta no está atada a un indicador oficial.</p>
                )}
              </div>
            ))}
            {axis.proposals.length < 8 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setAxis(i, { proposals: [...axis.proposals, { key: newKey(), title: '', description: '', actions: '', goal: null }] })
                }
              >
                <Plus aria-hidden className="h-4 w-4" />
                Agregar propuesta
              </Button>
            )}
          </div>
        </section>
      ))}

      <div className="flex items-start gap-3 rounded-lg border border-border p-4">
        <Checkbox id="draft-reviewed" checked={reviewed} onCheckedChange={(v) => setReviewed(v === true)} className="mt-0.5" />
        <label htmlFor="draft-reviewed" className="text-sm text-foreground">
          La campaña revisó este documento, incluida la revisión jurídica antes de inscribir la candidatura.
          <span className="block text-xs text-slate-500">
            Mientras no lo marques, el PDF y el Word salen con la marca &quot;Borrador para revisión&quot;.
          </span>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
