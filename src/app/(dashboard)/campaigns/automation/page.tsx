'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Users, CalendarClock, Pencil } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  listJourneys,
  createJourney,
  updateJourney,
  deleteJourney,
  listJourneyEnrollments,
  cancelJourneyEnrollment,
  extractErrorMessage,
  type Journey,
  type JourneyTriggerType,
  type JourneyStepType,
  type CreateJourneyStepInput,
  type JourneyEnrollmentEntry,
} from '@/lib/api/journeys';

// Plan "Motor de Automatización de Campaña" (2026-09-08), Fase C — panel
// del builder. Reusa el mismo patrón de componentes ya probado en
// osint/casos/[id] (Dialog para crear/editar, Sheet para el detalle).
const TRIGGER_LABEL: Record<JourneyTriggerType, string> = {
  PROSPECT_CREATED: 'Se registra un prospecto nuevo',
  EVENT_ATTENDANCE_REGISTERED: 'Confirma asistencia a un evento',
  REQUEST_CREATED: 'Crea una solicitud (PQR)',
  DAYS_BEFORE_ELECTION_VOTE_NOT_CONFIRMED: 'Faltan N días para la elección y no confirmó el voto',
};

const STEP_TYPE_LABEL: Record<JourneyStepType, string> = {
  WAIT: 'Esperar',
  SEND_EMAIL: 'Enviar Email',
  SEND_SMS: 'Enviar SMS',
  SEND_WHATSAPP_META: 'Enviar WhatsApp (Meta)',
};

export default function AutomationPage() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentsFor, setEnrollmentsFor] = useState<Journey | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setJourneys(await listJourneys());
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudieron cargar las journeys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleActive = async (journey: Journey) => {
    try {
      await updateJourney(journey.id, { isActive: !journey.isActive });
      toast.success(journey.isActive ? 'Journey pausada' : 'Journey activada');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async (journey: Journey) => {
    if (!window.confirm(`¿Eliminar la journey "${journey.name}"? Se borra todo su historial de inscripciones.`)) return;
    try {
      await deleteJourney(journey.id);
      toast.success('Journey eliminada');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo eliminar la journey');
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Automatización de Campaña</h1>
          <p className="text-slate-500 text-sm mt-1">
            Secuencias automáticas: cuando pase algo real (un registro, una asistencia, una solicitud), el sistema
            actúa solo — sin que nadie tenga que enviarlo a mano.
          </p>
        </div>
        <JourneyFormDialog onSaved={load} />
      </div>

      <ElectionDateCard />

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-primary">Journeys ({journeys.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : journeys.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Sin journeys todavía — crea la primera con &quot;Nueva journey&quot;.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Pasos</TableHead>
                  <TableHead>Inscripciones activas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journeys.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.name}</TableCell>
                    <TableCell className="text-sm text-slate-600">{TRIGGER_LABEL[j.triggerType]}</TableCell>
                    <TableCell>{j.steps.length}</TableCell>
                    <TableCell>
                      <Button variant="link" className="h-auto p-0" onClick={() => setEnrollmentsFor(j)}>
                        <Users className="mr-1.5 h-3.5 w-3.5" />
                        {j.activeEnrollments ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={j.isActive} onCheckedChange={() => handleToggleActive(j)} />
                        <Badge variant={j.isActive ? 'default' : 'outline'}>
                          {j.isActive ? 'Activa' : 'Pausada'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <JourneyFormDialog journey={j} onSaved={load} />
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(j)}>
                          <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EnrollmentsSheet
        journey={enrollmentsFor}
        onClose={() => setEnrollmentsFor(null)}
        onChanged={load}
      />
    </div>
  );
}

// Plan "Motor de Automatización de Campaña" (2026-09-08) — configuración
// de la fecha de elección: único consumidor real es el trigger
// DAYS_BEFORE_ELECTION_VOTE_NOT_CONFIRMED (ElectionCountdownScheduler).
function ElectionDateCard() {
  const [electionDate, setElectionDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/organization/profile')
      .then(({ data }) => {
        if (data.electionDate) setElectionDate(data.electionDate.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/organization/election-date', { electionDate: electionDate || null });
      toast.success('Fecha de elección actualizada');
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo guardar la fecha');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 py-4">
        <CalendarClock className="h-5 w-5 text-slate-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">Fecha de elección</p>
          <p className="text-xs text-slate-500">
            Necesaria para el trigger &quot;Faltan N días para la elección&quot;.
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <>
            <Input
              type="date"
              value={electionDate}
              onChange={(e) => setElectionDate(e.target.value)}
              className="w-[180px]"
            />
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface StepForm extends CreateJourneyStepInput {
  _key: string;
}

function newStep(order: number): StepForm {
  return { _key: `${Date.now()}-${Math.random()}`, order, type: 'WAIT', waitHours: 1 };
}

function JourneyFormDialog({ journey, onSaved }: { journey?: Journey; onSaved: () => void }) {
  const isEdit = Boolean(journey);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(journey?.name ?? '');
  const [triggerType, setTriggerType] = useState<JourneyTriggerType>(journey?.triggerType ?? 'PROSPECT_CREATED');
  const [daysBefore, setDaysBefore] = useState<number>((journey?.triggerConfig?.daysBefore as number) ?? 7);
  const [steps, setSteps] = useState<StepForm[]>(
    journey?.steps.length
      ? journey.steps.map((s) => ({
          _key: s.id,
          order: s.order,
          type: s.type,
          waitHours: s.waitHours ?? undefined,
          channelTemplate: s.channelTemplate ?? undefined,
        }))
      : [newStep(0)],
  );

  const resetIfCreate = () => {
    if (!isEdit) {
      setName('');
      setTriggerType('PROSPECT_CREATED');
      setDaysBefore(7);
      setSteps([newStep(0)]);
    }
  };

  const updateStep = (key: string, patch: Partial<StepForm>) => {
    setSteps((prev) => prev.map((s) => (s._key === key ? { ...s, ...patch } : s)));
  };

  const addStep = () => setSteps((prev) => [...prev, newStep(prev.length)]);
  const removeStep = (key: string) =>
    setSteps((prev) => prev.filter((s) => s._key !== key).map((s, i) => ({ ...s, order: i })));

  const handleSubmit = async () => {
    if (name.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        triggerType,
        triggerConfig: triggerType === 'DAYS_BEFORE_ELECTION_VOTE_NOT_CONFIRMED' ? { daysBefore } : undefined,
        steps: steps.map(({ _key, ...s }) => s),
      };

      if (isEdit && journey) {
        await updateJourney(journey.id, payload);
        toast.success('Journey actualizada');
      } else {
        await createJourney(payload);
        toast.success('Journey creada');
      }
      setOpen(false);
      resetIfCreate();
      onSaved();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo guardar la journey');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            <Pencil className="h-3.5 w-3.5 text-slate-400" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva journey
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar journey' : 'Nueva journey'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bienvenida a nuevos prospectos" />
          </div>

          <div className="space-y-1.5">
            <Label>Cuando...</Label>
            <Select
              value={triggerType}
              onValueChange={(v) => setTriggerType(v as JourneyTriggerType)}
              disabled={isEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TRIGGER_LABEL) as JourneyTriggerType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TRIGGER_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-xs text-slate-400">El trigger no se puede cambiar una vez creada la journey.</p>
            )}
          </div>

          {triggerType === 'DAYS_BEFORE_ELECTION_VOTE_NOT_CONFIRMED' && (
            <div className="space-y-1.5">
              <Label>Días antes de la elección</Label>
              <Input
                type="number"
                min={0}
                value={daysBefore}
                onChange={(e) => setDaysBefore(Number(e.target.value))}
                className="w-32"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pasos (en orden)</Label>
              <Button variant="outline" size="sm" onClick={addStep}>
                <Plus className="mr-1.5 h-3 w-3" /> Agregar paso
              </Button>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <StepEditor
                  key={step._key}
                  index={i}
                  step={step}
                  onChange={(patch) => updateStep(step._key, patch)}
                  onRemove={steps.length > 1 ? () => removeStep(step._key) : undefined}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'Guardar cambios' : 'Crear journey'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepEditor({
  index,
  step,
  onChange,
  onRemove,
}: {
  index: number;
  step: StepForm;
  onChange: (patch: Partial<StepForm>) => void;
  onRemove?: () => void;
}) {
  const template = step.channelTemplate ?? {};

  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Paso {index + 1}</span>
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-6 px-1.5">
            <Trash2 className="h-3 w-3 text-slate-400" />
          </Button>
        )}
      </div>

      <Select value={step.type} onValueChange={(v) => onChange({ type: v as JourneyStepType })}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {(Object.keys(STEP_TYPE_LABEL) as JourneyStepType[]).map((t) => (
            <SelectItem key={t} value={t}>{STEP_TYPE_LABEL[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {step.type === 'WAIT' && (
        <div className="flex items-center gap-2">
          <Label className="text-xs shrink-0">Horas de espera</Label>
          <Input
            type="number"
            min={0}
            value={step.waitHours ?? 0}
            onChange={(e) => onChange({ waitHours: Number(e.target.value) })}
            className="w-28"
          />
        </div>
      )}

      {step.type === 'SEND_EMAIL' && (
        <div className="space-y-2">
          <Input
            placeholder="Asunto"
            value={template.subject ?? ''}
            onChange={(e) => onChange({ channelTemplate: { ...template, subject: e.target.value } })}
          />
          <Textarea
            placeholder="Cuerpo del correo"
            rows={3}
            value={template.body ?? ''}
            onChange={(e) => onChange({ channelTemplate: { ...template, body: e.target.value } })}
          />
        </div>
      )}

      {step.type === 'SEND_SMS' && (
        <Textarea
          placeholder="Texto del SMS"
          rows={2}
          value={template.body ?? ''}
          onChange={(e) => onChange({ channelTemplate: { ...template, body: e.target.value } })}
        />
      )}

      {step.type === 'SEND_WHATSAPP_META' && (
        <div className="space-y-1">
          <Input
            placeholder="Nombre exacto de la plantilla ya aprobada por Meta"
            value={template.templateName ?? ''}
            onChange={(e) => onChange({ channelTemplate: { ...template, templateName: e.target.value } })}
          />
          <p className="text-xs text-slate-400">
            WhatsApp Meta solo permite plantillas pre-aprobadas — no texto libre.
          </p>
        </div>
      )}
    </div>
  );
}

function EnrollmentsSheet({
  journey,
  onClose,
  onChanged,
}: {
  journey: Journey | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [enrollments, setEnrollments] = useState<JourneyEnrollmentEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!journey) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listJourneyEnrollments(journey.id);
        if (!cancelled) setEnrollments(data);
      } catch (err) {
        if (!cancelled) toast.error(extractErrorMessage(err) || 'No se pudieron cargar las inscripciones');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [journey]);

  const handleCancel = async (enrollmentId: string) => {
    if (!journey) return;
    try {
      await cancelJourneyEnrollment(journey.id, enrollmentId);
      setEnrollments((prev) => prev.map((e) => (e.id === enrollmentId ? { ...e, status: 'CANCELLED' } : e)));
      toast.success('Inscripción cancelada');
      onChanged();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cancelar');
    }
  };

  return (
    <Sheet open={Boolean(journey)} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Inscripciones — {journey?.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Sin inscripciones todavía.</p>
          ) : (
            enrollments.map((e) => (
              <div key={e.id} className="rounded-lg border border-slate-200 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{e.prospect.firstName} {e.prospect.lastName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={e.status === 'COMPLETED' ? 'default' : e.status === 'CANCELLED' ? 'outline' : 'secondary'}>
                      {e.status}
                    </Badge>
                    {e.status === 'ACTIVE' && (
                      <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => handleCancel(e.id)}>
                        <Trash2 className="h-3 w-3 text-slate-400" />
                      </Button>
                    )}
                  </div>
                </div>
                {e.executions.length > 0 && (
                  <ul className="text-xs text-slate-500 space-y-0.5">
                    {e.executions.map((ex) => (
                      <li key={ex.id} className="flex items-center gap-1.5">
                        <span className={ex.status === 'SENT' ? 'text-emerald-600' : 'text-red-500'}>●</span>
                        {new Date(ex.executedAt).toLocaleString('es-CO')}
                        {ex.detail && ` — ${ex.detail}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
