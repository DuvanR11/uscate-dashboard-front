'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { extractErrorMessage } from '@/lib/api-error';
import { usePlatformCapability } from './access-context';
import {
  approvePressApplication,
  listPressApplications,
  listPressOrganizations,
  pressApplicationProofUrl,
  rejectPressApplication,
  reverifyPressOrganization,
  type PressApplication,
  type PressApplicationStatus,
  type PressOrganization,
  type PressPlanCode,
} from '@/lib/api/press-applications';

// Zyron Prensa, Fase 3 (2026-11-08): Plataforma → Solicitudes de prensa. Se
// verifica el trabajo publicado (o la constancia del medio) y se aprueba o se
// rechaza con motivo; al aprobar se crea la organización de prensa. La
// pestaña «Organizaciones» es la revisión anual (alerta PRESS_REVERIFICATION).

const STATUS_LABEL: Record<PressApplicationStatus, string> = {
  PENDING: 'Pendientes',
  APPROVED: 'Aprobadas',
  REJECTED: 'Rechazadas',
};
const PLAN_LABEL: Record<PressPlanCode, string> = { P1: 'P1 · Periodista', P2: 'P2 · Sala de redacción' };

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' });

const slugFrom = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

function ApplicationCard({
  application,
  canDecide,
  onDecided,
}: {
  application: PressApplication;
  canDecide: boolean;
  onDecided: () => void;
}) {
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [slug, setSlug] = useState(slugFrom(application.outlet || application.fullName));
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<PressPlanCode>(application.commercialPlanCode);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Recorrido 2026-11-08: Safari bloquea una ventana que se abre después de
  // esperar al servidor. La pestaña se abre con el clic y recibe la dirección
  // firmada cuando llega; sin `opener`, como hacía `noopener`.
  const openProof = async () => {
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    try {
      const url = await pressApplicationProofUrl(application.id);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (error) {
      tab?.close();
      toast.error(extractErrorMessage(error) || 'No se pudo abrir la constancia.');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (mode === 'approve') {
        await approvePressApplication(application.id, {
          slug,
          adminPassword: password,
          commercialPlanCode: plan !== application.commercialPlanCode ? plan : undefined,
        });
        toast.success('Aprobada: la organización de prensa quedó creada, con 7 días de prueba.');
      } else {
        await rejectPressApplication(application.id, reason.trim());
        toast.success('Solicitud rechazada.');
      }
      setMode(null);
      onDecided();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo guardar la decisión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="space-y-2 rounded-xl border p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {application.fullName} · {application.outlet || 'Independiente'}
        </p>
        <span className="text-xs text-muted-foreground">
          {PLAN_LABEL[application.commercialPlanCode]} · recibida el {day(application.createdAt)}
        </span>
      </div>
      <p className="text-muted-foreground">
        Cédula {application.document} · {application.email}
        {application.phone ? ` · ${application.phone}` : ''}
      </p>
      {application.workLinks.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {application.workLinks.map((link) => (
            <li key={link}>
              <a href={link} target="_blank" rel="noopener noreferrer" className="break-all underline">
                {link}
              </a>
            </li>
          ))}
        </ul>
      )}
      {application.proofName && (
        <Button type="button" variant="outline" size="sm" onClick={openProof}>
          Descargar constancia ({application.proofName})
        </Button>
      )}
      {application.status === 'REJECTED' && application.rejectionReason && (
        <p>
          <span className="font-medium">Motivo del rechazo:</span> {application.rejectionReason}
        </p>
      )}
      {application.organization && (
        <p>
          Organización creada: <span className="font-medium">{application.organization.name}</span> (
          {application.organization.slug})
        </p>
      )}
      {application.status === 'PENDING' && canDecide && (
        <div className="flex gap-2 pt-1">
          <Button type="button" size="sm" onClick={() => setMode('approve')}>
            Aprobar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setMode('reject')}>
            Rechazar
          </Button>
        </div>
      )}

      <Dialog open={mode !== null} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{mode === 'approve' ? 'Aprobar la solicitud' : 'Rechazar la solicitud'}</DialogTitle>
            <DialogDescription>
              {mode === 'approve'
                ? `Se crea la organización de prensa de ${application.fullName}, con su cuenta (${application.email}) y 7 días de prueba. Comparte la contraseña inicial por un canal seguro.`
                : 'El motivo queda en la solicitud y en la auditoría. Escríbelo como se lo dirías a la persona.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'approve' ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`press-slug-${application.id}`}>Dirección corta (slug)</Label>
                  <Input id={`press-slug-${application.id}`} required value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`press-plan-${application.id}`}>Plan</Label>
                  <select
                    id={`press-plan-${application.id}`}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as PressPlanCode)}
                  >
                    {(Object.keys(PLAN_LABEL) as PressPlanCode[]).map((code) => (
                      <option key={code} value={code}>
                        {PLAN_LABEL[code]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`press-password-${application.id}`}>Contraseña inicial</Label>
                  <Input
                    id={`press-password-${application.id}`}
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor={`press-reason-${application.id}`}>Motivo</Label>
                <Textarea
                  id={`press-reason-${application.id}`}
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMode(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} variant={mode === 'reject' ? 'destructive' : 'default'}>
                {saving && <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'approve' ? 'Aprobar y crear' : 'Rechazar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function ApplicationsTab({ canDecide }: { canDecide: boolean }) {
  const [status, setStatus] = useState<PressApplicationStatus>('PENDING');
  const [loaded, setLoaded] = useState<{ key: string; items: PressApplication[] } | null>(null);
  const [reload, setReload] = useState(0);
  const key = `${status}:${reload}`;
  const items = loaded?.key === key ? loaded.items : null;
  const load = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    listPressApplications(status)
      .then((data) => !cancelled && setLoaded({ key, items: data }))
      .catch((error) => {
        if (cancelled) return;
        toast.error(extractErrorMessage(error) || 'No se pudieron cargar las solicitudes.');
        setLoaded({ key, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [status, key]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Estado">
        {(Object.keys(STATUS_LABEL) as PressApplicationStatus[]).map((s) => (
          <Button key={s} type="button" size="sm" variant={s === status ? 'default' : 'outline'} onClick={() => setStatus(s)}>
            {STATUS_LABEL[s]}
          </Button>
        ))}
      </div>
      {items === null ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay solicitudes {STATUS_LABEL[status].toLowerCase()}.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((application) => (
            <ApplicationCard key={application.id} application={application} canDecide={canDecide} onDecided={load} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrganizationsTab({ canDecide }: { canDecide: boolean }) {
  const [items, setItems] = useState<PressOrganization[] | null>(null);
  const [reload, setReload] = useState(0);
  const load = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    listPressOrganizations()
      .then((data) => !cancelled && setItems(data))
      .catch((error) => {
        if (cancelled) return;
        toast.error(extractErrorMessage(error) || 'No se pudieron cargar las organizaciones de prensa.');
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const reverify = async (organization: PressOrganization) => {
    try {
      await reverifyPressOrganization(organization.id);
      toast.success(`${organization.name}: verificada de nuevo.`);
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo guardar la verificación.');
    }
  };

  if (items === null) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Todavía no hay organizaciones de prensa.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cada año se vuelve a pedir trabajo publicado reciente (o la constancia del medio). La alerta «Membresía de prensa
        sin verificar hace un año» se cierra al marcarla aquí.
      </p>
      <ul className="divide-y rounded-xl border">
        {items.map((organization) => {
          const last = organization.pressVerifiedAt ?? organization.createdAt;
          const due = organization.reverificationDue;
          return (
            <li key={organization.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span>
                <span className="font-medium">{organization.name}</span>{' '}
                <span className={due ? 'font-medium text-amber-700' : 'text-muted-foreground'}>
                  · {organization.pressVerifiedAt ? `verificada el ${day(last)}` : `sin verificar desde el alta (${day(last)})`}
                  {due ? ' · toca verificar' : ''}
                </span>
              </span>
              {canDecide && (
                <Button type="button" size="sm" variant="outline" onClick={() => reverify(organization)}>
                  Verificada de nuevo
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PressApplicationsPanel() {
  const canDecide = usePlatformCapability('ORGANIZATIONS_CREATE');
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Solicitudes de Zyron Prensa</h1>
        <p className="text-sm text-muted-foreground">
          No hay tarjeta de periodista obligatoria en Colombia: se verifica con trabajo publicado o con la constancia del
          medio, nunca con un título.
        </p>
      </div>
      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Solicitudes</TabsTrigger>
          <TabsTrigger value="organizations">Organizaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="applications">
          <ApplicationsTab canDecide={canDecide} />
        </TabsContent>
        <TabsContent value="organizations">
          <OrganizationsTab canDecide={canDecide} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
