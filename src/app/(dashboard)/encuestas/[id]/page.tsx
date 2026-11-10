'use client';

// Plan hacia la versión estable, Fase 4 (2026-11-10): crear o cambiar una
// encuesta (`/encuestas/nueva` o `/encuestas/<id>`). Desde la primera
// respuesta las preguntas quedan fijas: para cambiarlas se duplica.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ClipboardList, Loader2, Lock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/api-error';
import {
  QUESTION_TYPE_LABEL,
  surveysApi,
  useSurveysEnabled,
  type QuestionDraft,
  type QuestionType,
  type SaveSurvey,
} from '@/lib/api/surveys';

const MAX_QUESTIONS = 30;

/** Una pregunta en edición: las opciones como texto, una por renglón. */
interface DraftRow extends QuestionDraft {
  key: string;
  optionsText: string;
}

let keySeq = 0;
const newKey = () => `k${++keySeq}`;

const blankQuestion = (type: QuestionType = 'SINGLE'): DraftRow => ({
  key: newKey(),
  type,
  prompt: '',
  required: true,
  optionsText: type === 'SINGLE' || type === 'MULTIPLE' ? 'Sí\nNo' : '',
  scaleMin: 1,
  scaleMax: 5,
  minLabel: '',
  maxLabel: '',
});

const hasOptions = (type: QuestionType) => type === 'SINGLE' || type === 'MULTIPLE';

function toSave(rows: DraftRow[]): QuestionDraft[] {
  return rows.map(({ key: _key, optionsText, ...q }) => ({
    ...(q.id ? { id: q.id } : {}),
    type: q.type,
    prompt: q.prompt.trim(),
    required: q.required !== false,
    ...(hasOptions(q.type)
      ? {
          options: optionsText
            .split('\n')
            .map((o) => o.trim())
            .filter(Boolean),
        }
      : {}),
    ...(q.type === 'SCALE'
      ? {
          scaleMin: q.scaleMin ?? 1,
          scaleMax: q.scaleMax ?? 5,
          ...(q.minLabel?.trim() ? { minLabel: q.minLabel.trim() } : {}),
          ...(q.maxLabel?.trim() ? { maxLabel: q.maxLabel.trim() } : {}),
        }
      : {}),
  }));
}

export default function SurveyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'nueva';
  const enabled = useSurveysEnabled();
  const [loaded, setLoaded] = useState(isNew);
  const [locked, setLocked] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [onVisit, setOnVisit] = useState(true);
  const [onCall, setOnCall] = useState(true);
  const [onPublic, setOnPublic] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([blankQuestion()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enabled || isNew) return;
    surveysApi
      .get(id)
      .then((survey) => {
        setTitle(survey.title);
        setDescription(survey.description ?? '');
        setOnVisit(survey.onVisit);
        setOnCall(survey.onCall);
        setOnPublic(survey.onPublic);
        setLocked(survey.locked);
        setRows(
          survey.questions.map((q) => ({
            ...q,
            key: newKey(),
            minLabel: q.minLabel ?? '',
            maxLabel: q.maxLabel ?? '',
            optionsText: (q.options ?? []).join('\n'),
          })),
        );
        setLoaded(true);
      })
      .catch((error) => toast.error(apiErrorMessage(error) ?? 'No se pudo cargar la encuesta.'));
  }, [enabled, id, isNew]);

  const update = (key: string, patch: Partial<DraftRow>) =>
    setRows((list) => list.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const move = (index: number, delta: number) =>
    setRows((list) => {
      const next = [...list];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row);
      return next;
    });

  const save = async () => {
    const input: SaveSurvey = {
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      onVisit,
      onCall,
      onPublic,
      questions: toSave(rows),
    };
    setSaving(true);
    try {
      const survey = isNew ? await surveysApi.create(input) : await surveysApi.update(id, input);
      toast.success(isNew ? 'Encuesta creada en borrador. Actívala cuando esté lista.' : 'Cambios guardados.');
      router.push(isNew ? `/encuestas/${survey.id}` : '/encuestas');
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudo guardar la encuesta.');
    } finally {
      setSaving(false);
    }
  };

  if (enabled === false) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6 text-sm text-slate-600">
        Las encuestas todavía no están activas en Zyron.
      </div>
    );
  }

  if (!enabled || !loaded) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando" />
      </div>
    );
  }

  const ready = title.trim().length >= 3 && rows.length > 0 && rows.every((r) => r.prompt.trim().length >= 3);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="border-b border-border/40 pb-5">
        <Link href="/encuestas" className="text-sm text-primary hover:underline">
          ← Encuestas
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <ClipboardList className="h-7 w-7 text-primary" /> {isNew ? 'Nueva encuesta' : 'Editar encuesta'}
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="survey-title">Título</Label>
            <Input
              id="survey-title"
              maxLength={150}
              value={title}
              placeholder="Intención de voto en Chapinero"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="survey-description">Presentación (opcional)</Label>
            <Textarea
              id="survey-description"
              rows={3}
              maxLength={1000}
              value={description}
              placeholder="Lo que lee quien responde por el enlace, o lo que dice quien pregunta."
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Dónde se aplica</legend>
            {(
              [
                ['survey-on-visit', 'En las visitas puerta a puerta', onVisit, setOnVisit],
                ['survey-on-call', 'En las llamadas de una lista', onCall, setOnCall],
                ['survey-on-public', 'Por un enlace público (con la marca de la campaña)', onPublic, setOnPublic],
              ] as const
            ).map(([fieldId, label, checked, set]) => (
              <div key={fieldId} className="flex items-center gap-2">
                <Checkbox id={fieldId} checked={checked} onCheckedChange={(value) => set(value === true)} />
                <Label htmlFor={fieldId} className="font-normal">
                  {label}
                </Label>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Desde la ficha del contacto siempre se puede aplicar.</p>
          </fieldset>
        </CardContent>
      </Card>

      {locked && (
        <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-slate-700">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          Esta encuesta ya tiene respuestas: las preguntas quedan fijas. Para cambiarlas, duplícala desde la lista.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, index) => (
          <Card key={row.key}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <CardTitle className="text-sm text-foreground">Pregunta {index + 1}</CardTitle>
              {!locked && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Subir la pregunta ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Bajar la pregunta ${index + 1}`}
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-500"
                    aria-label={`Quitar la pregunta ${index + 1}`}
                    disabled={rows.length === 1}
                    onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <fieldset disabled={locked} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                  <div className="space-y-2">
                    <Label htmlFor={`q-prompt-${index}`}>Pregunta</Label>
                    <Input
                      id={`q-prompt-${index}`}
                      maxLength={300}
                      value={row.prompt}
                      onChange={(e) => update(row.key, { prompt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`q-type-${index}`}>Tipo</Label>
                    <select
                      id={`q-type-${index}`}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={row.type}
                      onChange={(e) => {
                        const type = e.target.value as QuestionType;
                        update(row.key, {
                          type,
                          optionsText: hasOptions(type) ? row.optionsText || 'Sí\nNo' : '',
                        });
                      }}
                    >
                      {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((type) => (
                        <option key={type} value={type}>
                          {QUESTION_TYPE_LABEL[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {hasOptions(row.type) && (
                  <div className="space-y-2">
                    <Label htmlFor={`q-options-${index}`}>Opciones (una por renglón, de 2 a 12)</Label>
                    <Textarea
                      id={`q-options-${index}`}
                      rows={4}
                      value={row.optionsText}
                      onChange={(e) => update(row.key, { optionsText: e.target.value })}
                    />
                  </div>
                )}

                {row.type === 'SCALE' && (
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor={`q-min-${index}`}>Desde</Label>
                      <select
                        id={`q-min-${index}`}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={row.scaleMin ?? 1}
                        onChange={(e) => update(row.key, { scaleMin: Number(e.target.value) })}
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`q-max-${index}`}>Hasta</Label>
                      <select
                        id={`q-max-${index}`}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={row.scaleMax ?? 5}
                        onChange={(e) => update(row.key, { scaleMax: Number(e.target.value) })}
                      >
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`q-min-label-${index}`}>Texto del menor</Label>
                      <Input
                        id={`q-min-label-${index}`}
                        maxLength={40}
                        placeholder="Nada"
                        value={row.minLabel ?? ''}
                        onChange={(e) => update(row.key, { minLabel: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`q-max-label-${index}`}>Texto del mayor</Label>
                      <Input
                        id={`q-max-label-${index}`}
                        maxLength={40}
                        placeholder="Mucho"
                        value={row.maxLabel ?? ''}
                        onChange={(e) => update(row.key, { maxLabel: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`q-required-${index}`}
                    checked={row.required !== false}
                    onCheckedChange={(value) => update(row.key, { required: value === true })}
                  />
                  <Label htmlFor={`q-required-${index}`} className="font-normal">
                    Obligatoria
                  </Label>
                </div>
              </fieldset>
            </CardContent>
          </Card>
        ))}

        {!locked && rows.length < MAX_QUESTIONS && (
          <Button variant="outline" className="w-full" onClick={() => setRows((list) => [...list, blankQuestion()])}>
            <Plus className="mr-2 h-4 w-4" /> Agregar pregunta
          </Button>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/encuestas">Cancelar</Link>
        </Button>
        <Button onClick={save} disabled={!ready || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isNew ? 'Crear encuesta' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
