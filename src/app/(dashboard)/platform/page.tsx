'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Building2, Eye, History, Loader2, Plus, Radio, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  listPlatformOrganizations,
  listPlatformPlans,
  getPlatformMetrics,
  listAuditLog,
  updateOrganizationPlan,
  createOrganization,
  impersonateOrganization,
  listPlatformOsintSources,
  updatePlatformOsintSource,
  extractErrorMessage,
  type PlatformOrganization,
  type PlatformPlan,
  type PlatformMetrics,
  type AuditLogEntry,
  type PlatformOsintSource,
  type OsintSourceReliability,
} from '@/lib/api/platform';

/**
 * `/platform` — panel de administración cruzada de organizaciones, exclusivo
 * del rol PLATFORM_OPERATOR (módulo PLATAFORMA). Ver informe técnico
 * "Gating por Plan". Sin dependencia de la organización del propio usuario
 * — a diferencia de cualquier otra pantalla de este dashboard.
 */
export default function PlatformPage() {
  const router = useRouter();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [osintSources, setOsintSources] = useState<PlatformOsintSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [orgs, planList, metricsData, activity, sources] = await Promise.all([
        listPlatformOrganizations(),
        listPlatformPlans(),
        getPlatformMetrics(),
        listAuditLog(),
        listPlatformOsintSources(),
      ]);
      setOrganizations(orgs);
      setPlans(planList);
      setMetrics(metricsData);
      setAuditLog(activity);
      setOsintSources(sources);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = async (
    source: PlatformOsintSource,
    changes: Partial<Pick<PlatformOsintSource, 'isActive' | 'reliabilityLevel'>>,
  ) => {
    try {
      const updated = await updatePlatformOsintSource(source.id, changes);
      setOsintSources((prev) => prev.map((s) => (s.id === source.id ? updated : s)));
      toast.success(`"${source.name}" actualizada`);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo actualizar la fuente');
    }
  };

  const handlePlanChange = async (org: PlatformOrganization, planId: string) => {
    const newPlanId = planId === '__none__' ? null : planId;
    if (newPlanId === (org.plan?.code ?? null)) return;

    const planName = plans.find((p) => p.code === newPlanId)?.name ?? 'sin plan';
    const confirmed = window.confirm(
      `¿Cambiar el plan de "${org.name}" a "${planName}"? Esto afecta de inmediato qué módulos ve su equipo.`,
    );
    if (!confirmed) return;

    setSavingId(org.id);
    try {
      const result = await updateOrganizationPlan(org.id, newPlanId);
      setOrganizations((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, plan: result.plan } : o)),
      );
      toast.success(`Plan de "${org.name}" actualizado`);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cambiar el plan');
    } finally {
      setSavingId(null);
    }
  };

  // "Ver como esta organización" — soporte. Genera una sesión real de 1h
  // para el primer ADMIN activo de la organización, sin pedir su
  // contraseña. Queda auditado en el backend (ImpersonationLog).
  const handleImpersonate = async (org: PlatformOrganization) => {
    const confirmed = window.confirm(
      `¿Entrar como el administrador de "${org.name}"? Verás exactamente lo que ve su equipo, y quedará registrado que entraste.`,
    );
    if (!confirmed) return;

    setViewingId(org.id);
    try {
      const result = await impersonateOrganization(org.id);
      startImpersonation(result.access_token, result.user, {
        operatorEmail: result.impersonation.operatorEmail,
        targetOrganizationName: result.impersonation.targetOrganizationName,
      });
      toast.success(`Ahora ves "${org.name}" como ${result.user.fullName}`);
      router.push('/dashboard');
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo entrar a esa organización');
    } finally {
      setViewingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No se pudo cargar el panel</h2>
        <p className="text-slate-500">Verifica que tu cuenta tenga el rol de Operador de Plataforma.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary tracking-tight">Organizaciones</h1>
            <p className="text-slate-500 text-sm">
              {organizations.length} organización{organizations.length !== 1 ? 'es' : ''} — administra el plan de cualquier cliente.
            </p>
          </div>
        </div>
        <NewOrganizationDialog plans={plans} onCreated={load} />
      </div>

      {metrics && <MetricsSummary metrics={metrics} />}

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Consumo</TableHead>
                <TableHead>Asientos</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <p className="font-bold text-slate-800">{org.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{org.nit ?? 'sin NIT'}</p>
                  </TableCell>
                  <TableCell>
                    {org.hasSubscription ? (
                      <Select
                        value={org.plan?.code ?? '__none__'}
                        onValueChange={(value) => handlePlanChange(org, value)}
                        disabled={savingId === org.id}
                      >
                        <SelectTrigger className="w-[180px] bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin plan (acceso completo)</SelectItem>
                          {plans.map((plan) => (
                            <SelectItem key={plan.code} value={plan.code}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="text-slate-400">
                        Sin Subscription
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {org.consumption ? (
                      <div className="space-y-1 min-w-[160px]">
                        <ConsumptionBar label="SMS" metric={org.consumption.sms} />
                        <ConsumptionBar label="Email" metric={org.consumption.email} />
                        <ConsumptionBar label="WhatsApp" metric={org.consumption.whatsapp} />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {org.seats ? (
                      <Badge variant={org.seats.used >= org.seats.limit && org.seats.limit > 0 ? 'destructive' : 'secondary'}>
                        {org.seats.used} / {org.seats.limit}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImpersonate(org)}
                      disabled={viewingId === org.id || !org.hasSubscription}
                      title={org.hasSubscription ? undefined : 'Sin Subscription — no hay ADMIN que suplantar'}
                    >
                      {viewingId === org.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <><Eye className="mr-1.5 h-3.5 w-3.5" /> Ver como</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OsintSourcesAdmin sources={osintSources} onChange={handleSourceChange} />

      <ActivityFeed entries={auditLog} />
    </div>
  );
}

const RELIABILITY_LABEL: Record<OsintSourceReliability, string> = {
  OFFICIAL: 'Oficial',
  SEMI_OFFICIAL: 'Semi-oficial',
  THIRD_PARTY: 'Tercero',
};

// --- CATÁLOGO GLOBAL DE FUENTES OSINT — única escritura real (ver
// OsintSourceService, modules/investigation, para la vista de solo
// lectura por-organización en /osint/fuentes) ---
function OsintSourcesAdmin({
  sources,
  onChange,
}: {
  sources: PlatformOsintSource[];
  onChange: (
    source: PlatformOsintSource,
    changes: Partial<Pick<PlatformOsintSource, 'isActive' | 'reliabilityLevel'>>,
  ) => void;
}) {
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Radio className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Fuentes OSINT (catálogo global)
          </p>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Un cambio acá afecta la evidencia futura de TODAS las organizaciones, no solo una.
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fuente</TableHead>
              <TableHead>Confiabilidad</TableHead>
              <TableHead>Activa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{s.key}</p>
                </TableCell>
                <TableCell>
                  <Select
                    value={s.reliabilityLevel}
                    onValueChange={(v) => onChange(s, { reliabilityLevel: v as OsintSourceReliability })}
                  >
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RELIABILITY_LABEL) as OsintSourceReliability[]).map((level) => (
                        <SelectItem key={level} value={level}>{RELIABILITY_LABEL[level]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch checked={s.isActive} onCheckedChange={(v) => onChange(s, { isActive: v })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const ACTION_LABEL: Record<AuditLogEntry['action'], string> = {
  CREATE_ORGANIZATION: 'Organización creada',
  UPDATE_PLAN: 'Plan cambiado',
  IMPERSONATE: 'Entró como',
  UPDATE_OSINT_SOURCE: 'Fuente OSINT editada',
};

// Arma una línea legible por tipo de acción a partir de `metadata` — el
// backend guarda el detalle crudo (planId, email), esta función lo traduce
// a un texto humano sin necesitar más viajes al servidor.
function describeAuditEntry(entry: AuditLogEntry): string {
  const meta = entry.metadata ?? {};
  switch (entry.action) {
    case 'CREATE_ORGANIZATION':
      return `Admin: ${meta.adminEmail ?? '—'}${meta.planId ? ` · Plan inicial: ${meta.planId}` : ''}`;
    case 'UPDATE_PLAN':
      return `${meta.fromPlanId ?? 'Sin plan'} → ${meta.toPlanId ?? 'Sin plan'}`;
    case 'IMPERSONATE':
      return `Vio como: ${meta.targetEmail ?? '—'}`;
    case 'UPDATE_OSINT_SOURCE':
      return `Fuente: ${meta.sourceKey ?? '—'}`;
    default:
      return '';
  }
}

// --- ACTIVIDAD RECIENTE: mezcla alta de organización, cambio de plan e impersonación ---
function ActivityFeed({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardContent className="p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Actividad reciente
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400">Sin actividad todavía.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0"
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-700">{ACTION_LABEL[entry.action]}</span>
                  {entry.organizationName && (
                    <span className="text-slate-500"> · {entry.organizationName}</span>
                  )}
                  <p className="text-xs text-slate-400 truncate">
                    {entry.operatorEmail} — {describeAuditEntry(entry)}
                  </p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                  {new Date(entry.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CHANNEL_LABEL: Record<'sms' | 'email' | 'whatsapp', string> = {
  sms: 'SMS',
  email: 'Email',
  whatsapp: 'WhatsApp',
};

// --- RESUMEN AGREGADO: organizaciones por plan + quiénes están en riesgo ---
function MetricsSummary({ metrics }: { metrics: PlatformMetrics }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="border-0 shadow-md ring-1 ring-slate-100 lg:col-span-1">
        <CardContent className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Organizaciones por plan</p>
          <div className="space-y-2">
            {Object.entries(metrics.byPlan).map(([planName, count]) => (
              <div key={planName} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{planName}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md ring-1 ring-slate-100 lg:col-span-2">
        <CardContent className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
            Organizaciones en riesgo (≥80% de cupo)
          </p>
          {metrics.atRisk.length === 0 ? (
            <p className="text-sm text-slate-400">Ninguna organización está cerca de su límite ahora mismo.</p>
          ) : (
            <div className="space-y-2">
              {metrics.atRisk.map((item, i) => (
                <div key={`${item.organizationId}-${item.channel}-${i}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{item.organizationName}</span>
                  <Badge variant={item.percentage >= 95 ? 'destructive' : 'outline'}>
                    {CHANNEL_LABEL[item.channel]} · {item.percentage}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- DIÁLOGO "NUEVA ORGANIZACIÓN" — reemplaza el alta 100% manual contra la BD ---
function NewOrganizationDialog({
  plans,
  onCreated,
}: {
  plans: PlatformPlan[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // hallazgo real (2026-09-04): este formulario nunca pedía `slug`, aunque
  // el backend (`CreateOrganizationDto.slug`) siempre lo exige — a
  // propósito NO se autogenera server-side (el operador debe poder elegir
  // un link corto y memorable), así que tiene que viajar desde acá. Se
  // sugiere a partir del nombre pero queda editable; `slugTouched` evita
  // pisar una edición manual del operador mientras sigue escribiendo el
  // nombre.
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    nit: '',
    planId: '__none__',
    adminEmail: '',
    adminFullName: '',
    adminPassword: '',
  });

  const slugify = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // tildes/diacríticos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

  const resetForm = () => {
    setSlugTouched(false);
    setForm({ name: '', slug: '', nit: '', planId: '__none__', adminEmail: '', adminFullName: '', adminPassword: '' });
  };

  const handleNameChange = (value: string) => {
    setForm((f) => ({ ...f, name: value, slug: slugTouched ? f.slug : slugify(value) }));
  };

  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.adminEmail.trim() || !form.adminFullName.trim() || !form.adminPassword) {
      toast.error('Completa organización, slug, admin y contraseña — todos son obligatorios.');
      return;
    }
    if (!slugPattern.test(form.slug.trim())) {
      toast.error('El slug solo puede tener minúsculas, números y guiones (ej. "campana-uscategui-2026").');
      return;
    }
    if (form.adminPassword.length < 6) {
      toast.error('La contraseña del admin debe tener al menos 6 caracteres.');
      return;
    }

    setSaving(true);
    try {
      const result = await createOrganization({
        name: form.name.trim(),
        slug: form.slug.trim(),
        nit: form.nit.trim() || undefined,
        planId: form.planId === '__none__' ? null : form.planId,
        admin: {
          email: form.adminEmail.trim(),
          fullName: form.adminFullName.trim(),
          password: form.adminPassword,
        },
      });
      toast.success(`"${result.organization.name}" creada — admin: ${result.adminUser.email}`);
      resetForm();
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo crear la organización');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-secondary text-primary hover:bg-secondary/90 font-bold">
          <Plus className="mr-2 h-4 w-4" /> Nueva organización
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva organización</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Organización</p>
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Nombre</Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Campaña Ejemplo 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-slug">Slug público</Label>
              <Input
                id="org-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                placeholder="campana-ejemplo-2026"
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-400">
                Se sugiere solo del nombre — solo minúsculas, números y guiones. Aparece en enlaces públicos (ej. /public/organizations/{form.slug || 'tu-slug'}).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="org-nit">NIT (opcional)</Label>
                <Input
                  id="org-nit"
                  value={form.nit}
                  onChange={(e) => setForm((f) => ({ ...f, nit: e.target.value }))}
                  placeholder="900123456-1"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Plan inicial</Label>
                <Select value={form.planId} onValueChange={(v) => setForm((f) => ({ ...f, planId: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin plan (asignar después)</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.code} value={plan.code}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primer usuario (Administrador)</p>
            <div className="space-y-1.5">
              <Label htmlFor="admin-name">Nombre completo</Label>
              <Input
                id="admin-name"
                value={form.adminFullName}
                onChange={(e) => setForm((f) => ({ ...f, adminFullName: e.target.value }))}
                placeholder="María Pérez"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Correo</Label>
              <Input
                id="admin-email"
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                placeholder="admin@cliente.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Contraseña temporal</Label>
              <Input
                id="admin-password"
                type="text"
                value={form.adminPassword}
                onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
              <p className="text-xs text-slate-400">Compártela con el cliente por un canal seguro — no hay flujo de &quot;olvidé mi contraseña&quot; todavía.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear organización'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConsumptionBar({ label, metric }: { label: string; metric: { used: number; limit: number; percentage: number } }) {
  const color = metric.percentage >= 90 ? 'bg-red-500' : metric.percentage >= 75 ? 'bg-yellow-500' : 'bg-primary';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 w-14 shrink-0">{label}</span>
      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(metric.percentage, 100)}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 w-8 text-right shrink-0">{metric.percentage}%</span>
    </div>
  );
}
