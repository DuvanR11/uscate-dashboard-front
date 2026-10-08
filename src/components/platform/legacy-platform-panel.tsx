'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Building2, CheckCircle2, Eye, History, Loader2, Plus, Radio, ShieldAlert, XCircle } from 'lucide-react';
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
  listLegislativeBodies,
  bodiesForOffice,
  OFFICE_TYPE_LABEL,
  getPlatformMetrics,
  listAuditLog,
  updateOrganizationPlan,
  updateWhatsappBot,
  createOrganization,
  impersonateOrganization,
  listPlatformOsintSources,
  updatePlatformOsintSource,
  listAvailableOsintSourceKeys,
  createOsintSource,
  OSINT_SOURCE_ACCESS_TYPES,
  getProvidersHealth,
  extractErrorMessage,
  type PlatformOrganization,
  type PlatformPlan,
  type AdoptionLabel,
  type LegislativeBody,
  type OrganizationOfficeType,
  type PlatformMetrics,
  type AuditLogEntry,
  type PlatformOsintSource,
  type OsintSourceReliability,
  type OsintSourceAccessType,
  type ProvidersHealth,
} from '@/lib/api/platform';
import {
  SUBSCRIPTION_STATE_LABEL,
  listCommercialPlans,
  searchTerritories,
  type Candidacy,
  type CommercialPlanAdmin,
} from '@/lib/api/billing';
import {
  CATEGORY_LABEL,
  TerritoryPicker,
  territoryName,
  type TerritoryChoice,
  type TerritoryScope,
} from '@/components/billing/territory-picker';
import { OrganizationBillingDialog, STATE_BADGE_CLASS } from '@/components/platform/organization-billing-dialog';
import { WhatsappMetaDialog } from '@/components/platform/whatsapp-meta-dialog';
import { SocialMetaDialog } from '@/components/platform/social-meta-dialog';
import { LegislativeBodyDialog } from '@/components/platform/legislative-body-dialog';
import { BillingAdminPanel } from '@/components/platform/billing-admin-panel';
import { EditLimitsDialog } from '@/components/platform/edit-limits-dialog';
import { ACTION_LABEL } from '@/components/platform/audit-labels';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { usePlatformAccess } from './access-context';

/**
 * `/platform` — panel de administración cruzada de organizaciones, exclusivo
 * del rol PLATFORM_OPERATOR (módulo PLATAFORMA). Ver informe técnico
 * "Gating por Plan". Sin dependencia de la organización del propio usuario
 * — a diferencia de cualquier otra pantalla de este dashboard.
 */
export default function PlatformPage() {
  const platformAccess = usePlatformAccess();
  const router = useRouter();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [legislativeBodies, setLegislativeBodies] = useState<LegislativeBody[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [osintSources, setOsintSources] = useState<PlatformOsintSource[]>([]);
  const [availableOsintKeys, setAvailableOsintKeys] = useState<string[]>([]);
  const [providersHealth, setProvidersHealth] = useState<ProvidersHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [partialErrors, setPartialErrors] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        listPlatformOrganizations(),
        listPlatformPlans(),
        listLegislativeBodies(),
        getPlatformMetrics(),
        listAuditLog(),
        listPlatformOsintSources(),
        listAvailableOsintSourceKeys(),
        getProvidersHealth(),
      ]);
      const [orgs, planList, bodies, metricsData, activity, sources, availableKeys, health] = results;
      if (orgs.status === 'rejected') throw orgs.reason;
      if (planList.status === 'rejected') throw planList.reason;
      setOrganizations(orgs.value);
      setPlans(planList.value);
      setLegislativeBodies(bodies.status === 'fulfilled' ? bodies.value : []);
      setMetrics(metricsData.status === 'fulfilled' ? metricsData.value : null);
      setAuditLog(activity.status === 'fulfilled' ? activity.value : []);
      setOsintSources(sources.status === 'fulfilled' ? sources.value : []);
      setAvailableOsintKeys(availableKeys.status === 'fulfilled' ? availableKeys.value : []);
      setProvidersHealth(health.status === 'fulfilled' ? health.value : null);
      const labels = ['Organizaciones', 'Planes', 'Corporaciones', 'Métricas', 'Historial', 'Fuentes', 'Catálogo de fuentes', 'Proveedores'];
      setPartialErrors(results.flatMap((result, index) => result.status === 'rejected' ? [labels[index]] : []));
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

  const handleWhatsappBotToggle = async (org: PlatformOrganization, enabled: boolean) => {
    setSavingId(org.id);
    try {
      await updateWhatsappBot(org.id, enabled);
      toast.success(enabled ? 'Canal WhatsApp no oficial habilitado' : 'Canal WhatsApp no oficial deshabilitado');
      await load();
    } catch (error) {
      toast.error('No se pudo cambiar el canal', { description: extractErrorMessage(error) });
    } finally {
      setSavingId(null);
    }
  };

  const handlePlanChange = async (org: PlatformOrganization, planId: string) => {
    const newPlanId = planId === '__none__' ? null : planId;
    if (newPlanId === (org.plan?.code ?? null)) return;

    const planName = plans.find((p) => p.code === newPlanId)?.name ?? 'sin plan';
    const confirmed = await confirmDialog(
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
    const confirmed = await confirmDialog(
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
        <Button variant="outline" onClick={load}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-6">
      {partialErrors.length > 0 && <div role="alert" className="rounded-lg border border-amber-300 p-4"><p>No se pudieron cargar: {partialErrors.join(', ')}. Las demás gestiones siguen disponibles.</p><Button variant="outline" onClick={load}>Reintentar</Button></div>}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Organizaciones</h1>
            <p className="text-slate-500 text-sm">
              {organizations.length} organización{organizations.length !== 1 ? 'es' : ''} — administra el plan de cualquier cliente.
            </p>
          </div>
        </div>
        <NewOrganizationDialog plans={plans} legislativeBodies={legislativeBodies} onCreated={load} />
      </div>

      {metrics && <MetricsSummary metrics={metrics} />}

      {providersHealth && <ProvidersHealthPanel health={providersHealth} />}

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead>Adopción</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Suscripción</TableHead>
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
                    {(org.commercialPlan || org.territory) && (
                      <p className="text-xs text-slate-500">
                        {org.commercialPlan?.name ?? 'Sin plan comercial'}
                        {org.candidacy === 'ASPIRANTE' ? ' · aspirante' : ''}
                        {org.territory ? ` · ${territoryName(org.territory)} (${CATEGORY_LABEL(org.territory.category)})` : ''}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <AdoptionBadge label={org.adoptionLabel} lastActivityAt={org.lastActivityAt} />
                  </TableCell>
                  <TableCell>
                    {org.hasSubscription ? (
                      <Select
                        value={org.plan?.code ?? '__none__'}
                        onValueChange={(value) => handlePlanChange(org, value)}
                        disabled={platformAccess?.enabled || savingId === org.id}
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
                    {org.lifecycle ? (
                      <div className="space-y-1">
                        <Badge className={STATE_BADGE_CLASS[org.lifecycle.state]}>
                          {SUBSCRIPTION_STATE_LABEL[org.lifecycle.state]}
                        </Badge>
                        <p className="text-xs text-slate-500">
                          {org.lifecycle.expiresAt
                            ? `${org.lifecycle.daysToExpiry !== null && org.lifecycle.daysToExpiry < 0 ? 'Venció' : 'Vence'} ${new Date(org.lifecycle.expiresAt).toLocaleDateString('es-CO')}`
                            : 'Sin vencimiento'}
                        </p>
                        <label className="flex items-center gap-2 text-[11px] text-slate-500" title="Canal no oficial (Baileys): puede provocar el bloqueo del número. Apagado por defecto.">
                          <Switch
                            checked={org.whatsappBotEnabled}
                            disabled={platformAccess?.enabled || savingId === org.id}
                            onCheckedChange={(v) => handleWhatsappBotToggle(org, v)}
                          />
                          WhatsApp no oficial
                        </label>
                        <WhatsappMetaDialog organization={org} onChanged={load} />
                        <SocialMetaDialog organization={org} onChanged={load} />
                        <LegislativeBodyDialog organization={org} legislativeBodies={legislativeBodies} onChanged={load} />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
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
                      <div className="space-y-1 min-w-[140px]">
                        <Badge variant={org.seats.used >= org.seats.limit && org.seats.limit > 0 ? 'destructive' : 'secondary'}>
                          {org.seats.used} / {org.seats.limit} totales
                        </Badge>
                        {/* Desglose por rol — solo los que ya tienen cupo
                            configurado o usuarios reales, para no llenar la
                            fila con roles en cero; el catálogo COMPLETO
                            (incluidos los que están en cero) vive en el
                            diálogo "Cupos". */}
                        <div className="flex flex-wrap gap-1">
                          {(org.seatsByRole ?? [])
                            .filter((r) => r.limit > 0 || r.used > 0)
                            .map((r) => (
                              <Badge
                                key={r.code}
                                variant={r.used >= r.limit && r.limit > 0 ? 'destructive' : 'outline'}
                                className="text-[10px] font-normal"
                                title={r.name}
                              >
                                {r.code} {r.used}/{r.limit}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {org.hasSubscription && (
                        <OrganizationBillingDialog organization={org} plans={plans} onUpdated={load} />
                      )}
                      {org.hasSubscription && (
                        <EditLimitsDialog organization={org} onUpdated={load} />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImpersonate(org)}
                        disabled={platformAccess?.enabled || viewingId === org.id || !org.hasSubscription}
                        title={org.hasSubscription ? undefined : 'Sin Subscription — no hay ADMIN que suplantar'}
                      >
                        {viewingId === org.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <><Eye className="mr-1.5 h-3.5 w-3.5" /> Ver como</>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BillingAdminPanel />

      <OsintSourcesAdmin
        sources={osintSources}
        onChange={handleSourceChange}
        availableKeys={availableOsintKeys}
        onPublished={load}
      />

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
  availableKeys,
  onPublished,
}: {
  sources: PlatformOsintSource[];
  onChange: (
    source: PlatformOsintSource,
    changes: Partial<Pick<PlatformOsintSource, 'isActive' | 'reliabilityLevel'>>,
  ) => void;
  availableKeys: string[];
  onPublished: () => void;
}) {
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Fuentes OSINT (catálogo global)
            </p>
          </div>
          {availableKeys.length > 0 && (
            <PublishOsintSourceDialog availableKeys={availableKeys} onPublished={onPublished} />
          )}
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

// Plan "Ampliación PLATFORM_OPERATOR" (2026-09-05), Fase C — publica una
// fuente que YA tiene adaptador de código real desplegado (`availableKeys`
// viene de `GET /platform/osint-sources/available`, la diferencia real
// entre el registro de adaptadores y el catálogo — nunca una lista fija).
// Si `availableKeys` viene vacío, el componente padre ni siquiera renderiza
// este diálogo — nunca un formulario vacío o confuso.
function PublishOsintSourceDialog({
  availableKeys,
  onPublished,
}: {
  availableKeys: string[];
  onPublished: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    key: availableKeys[0] ?? '',
    name: '',
    description: '',
    accessType: OSINT_SOURCE_ACCESS_TYPES[0] as OsintSourceAccessType,
    official: true,
    reliabilityLevel: 'OFFICIAL' as OsintSourceReliability,
  });

  const resetForm = () => {
    setForm({
      key: availableKeys[0] ?? '',
      name: '',
      description: '',
      accessType: OSINT_SOURCE_ACCESS_TYPES[0],
      official: true,
      reliabilityLevel: 'OFFICIAL',
    });
  };

  const handleSubmit = async () => {
    if (!form.key || !form.name.trim()) {
      toast.error('Elegí la clave y escribí un nombre.');
      return;
    }

    setSaving(true);
    try {
      await createOsintSource({
        key: form.key,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        accessType: form.accessType,
        official: form.official,
        reliabilityLevel: form.reliabilityLevel,
      });
      toast.success(`Fuente "${form.name}" publicada`);
      resetForm();
      setOpen(false);
      onPublished();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo publicar la fuente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Publicar fuente nueva
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar fuente OSINT</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-400">
          Solo aparecen acá las claves que YA tienen un conector de código real desplegado, sin
          fila todavía en el catálogo.
        </p>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Clave (adaptador de código)</Label>
            <Select value={form.key} onValueChange={(v) => setForm((f) => ({ ...f, key: v }))}>
              <SelectTrigger className="w-full font-mono text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableKeys.map((key) => (
                  <SelectItem key={key} value={key} className="font-mono text-sm">{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source-name">Nombre</Label>
            <Input
              id="source-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Wikidata"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source-description">Descripción (opcional)</Label>
            <Input
              id="source-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de acceso</Label>
              <Select
                value={form.accessType}
                onValueChange={(v) => setForm((f) => ({ ...f, accessType: v as OsintSourceAccessType }))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OSINT_SOURCE_ACCESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Confiabilidad</Label>
              <Select
                value={form.reliabilityLevel}
                onValueChange={(v) => setForm((f) => ({ ...f, reliabilityLevel: v as OsintSourceReliability }))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RELIABILITY_LABEL) as OsintSourceReliability[]).map((level) => (
                    <SelectItem key={level} value={level}>{RELIABILITY_LABEL[level]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
            <Label htmlFor="source-official" className="text-sm">Fuente oficial</Label>
            <Switch
              id="source-official"
              checked={form.official}
              onCheckedChange={(v) => setForm((f) => ({ ...f, official: v }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
    case 'UPDATE_LIMITS': {
      const changes = (meta.changes ?? {}) as Record<string, { from: number; to: number }>;
      return Object.entries(changes)
        .map(([field, { from, to }]) => `${field}: ${from} → ${to}`)
        .join(', ');
    }
    case 'IMPERSONATE':
      return `Vio como: ${meta.targetEmail ?? '—'}`;
    case 'UPDATE_OSINT_SOURCE':
      return `Fuente: ${meta.sourceKey ?? '—'}`;
    case 'CREATE_OSINT_SOURCE':
      return `Fuente: ${meta.sourceKey ?? '—'}`;
    case 'SUBSCRIPTION_STATE_CHANGED':
      return `${meta.from ?? '—'} → ${meta.to ?? '—'}`;
    case 'CANCEL_SUBSCRIPTION':
    case 'SET_PERIOD':
      return typeof meta.reason === 'string' ? meta.reason : '';
    case 'PASSWORD_RESET_LINK_CREATED':
      return `Para: ${meta.targetEmail ?? '—'}`;
    case 'UPDATE_WHATSAPP_BOT':
      return meta.to ? 'Habilitado' : 'Deshabilitado';
    case 'UPDATE_COMMERCIAL_PLAN':
      return `${meta.code ?? ''}: ${Object.keys((meta.changes ?? {}) as object).join(', ')}`;
    case 'UPDATE_SALES_LEAD':
      return `${meta.from ?? '—'} → ${meta.to ?? '—'}`;
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
                  <span className="font-medium text-slate-700">{ACTION_LABEL[entry.action] ?? entry.action}</span>
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

// Plan "Ampliación PLATFORM_OPERATOR" (2026-09-05), Fase B — panel GLOBAL
// (las credenciales de SendGrid/Háblame/Meta son compartidas por toda la
// plataforma, no hay desglose por-organización). Deliberadamente sin botón
// "probar conexión": el flag de credencial es solo presencia de la
// variable de entorno, nunca una llamada real a la API del proveedor.
const HEALTH_CHANNEL_META: {
  key: keyof ProvidersHealth['channels'];
  label: string;
  credentialKey?: keyof ProvidersHealth['credentialsConfigured'];
}[] = [
  { key: 'email', label: 'Email (SendGrid)', credentialKey: 'email' },
  { key: 'sms', label: 'SMS (Háblame)', credentialKey: 'sms' },
  { key: 'whatsappBot', label: 'WhatsApp Bot' },
  { key: 'whatsappMeta', label: 'WhatsApp Meta', credentialKey: 'whatsappMeta' },
];

function ProvidersHealthPanel({ health }: { health: ProvidersHealth }) {
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardContent className="p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          Salud de proveedores (últimos {health.windowDays} días)
        </p>
        <p className="text-xs text-slate-400 mb-4">
          Credenciales globales — un fallo acá afecta a TODAS las organizaciones, no solo una.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {HEALTH_CHANNEL_META.map(({ key, label, credentialKey }) => {
            const channel = health.channels[key];
            const configured = credentialKey ? health.credentialsConfigured[credentialKey] : null;
            return (
              <div key={key} className="rounded-xl border border-slate-100 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  {configured !== null && (
                    <Badge variant={configured ? 'secondary' : 'destructive'} className="text-[10px] gap-1">
                      {configured ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {configured ? 'Configurado' : 'Sin configurar'}
                    </Badge>
                  )}
                </div>
                {channel.successRate === null ? (
                  <p className="text-xs text-slate-400">Sin envíos en la ventana</p>
                ) : (
                  <>
                    <p className="text-xl font-black text-primary">{channel.successRate}%</p>
                    <p className="text-[11px] text-slate-400">
                      {channel.sent} enviados · {channel.failed} fallidos
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

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

      <Card className="border-0 shadow-md ring-1 ring-slate-100 lg:col-span-1">
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

      <Card className="border-0 shadow-md ring-1 ring-slate-100 lg:col-span-1">
        <CardContent className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            Riesgo de abandono (adopción baja)
          </p>
          {metrics.atRiskAdoption.length === 0 ? (
            <p className="text-sm text-slate-400">Ninguna organización cliente está en adopción baja ahora mismo.</p>
          ) : (
            <div className="space-y-2">
              {metrics.atRiskAdoption.map((item) => (
                <div key={item.organizationId} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{item.organizationName}</span>
                  <Badge variant="destructive" className="text-[10px] font-normal">
                    {daysSinceLabel(item.lastActivityAt)}
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
  legislativeBodies,
  onCreated,
}: {
  plans: PlatformPlan[];
  legislativeBodies: LegislativeBody[];
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
  // Catálogo territorial: municipio o departamento que fija la tarifa.
  const [territory, setTerritory] = useState<TerritoryChoice | null>(null);
  // 2026-09-30: el alta pide el plan que se vende (cargo), no el paquete de
  // módulos interno; el paquete, el cargo y los cupos salen del plan.
  const [commercialPlans, setCommercialPlans] = useState<CommercialPlanAdmin[]>([]);
  useEffect(() => {
    if (!open) return;
    listCommercialPlans()
      .then((list) => setCommercialPlans(list.filter((p) => p.isActive)))
      .catch(() => toast.error('No se pudo cargar el catálogo de planes comerciales'));
  }, [open]);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    nit: '',
    commercialPlanCode: '__none__',
    candidacy: 'ACTIVO' as Candidacy,
    planId: '__none__',
    officeType: '__none__',
    legislativeBodyId: '__none__',
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
    setTerritory(null);
    setForm({
      name: '',
      slug: '',
      nit: '',
      commercialPlanCode: '__none__',
      candidacy: 'ACTIVO',
      planId: '__none__',
      officeType: '__none__',
      legislativeBodyId: '__none__',
      adminEmail: '',
      adminFullName: '',
      adminPassword: '',
    });
  };

  const selectedPlan =
    commercialPlans.find((p) => p.code === form.commercialPlanCode) ?? null;
  // El cargo lo fija el plan (Concejo, Alcaldía...); ESENCIAL no tiene cargo.
  const lockedOfficeType = (selectedPlan?.officeType as OrganizationOfficeType | null) ?? null;
  const effectiveOfficeType = lockedOfficeType ?? form.officeType;

  // Fase C (2026-09-28): cualquier cargo sigue a una corporación de SU
  // nivel (un alcalde a su concejo, un gobernador a su asamblea); solo se
  // ofrecen las del catálogo que corresponden. Lo valida el backend.
  const officeBodies =
    effectiveOfficeType !== '__none__'
      ? bodiesForOffice(legislativeBodies, effectiveOfficeType as OrganizationOfficeType)
      : [];
  const canPickLegislativeBody = officeBodies.length > 0;

  // Qué territorio fija la tarifa: con plan comercial, su alcance (Senado es
  // nacional y no lo necesita); sin él, se deduce del cargo.
  const territoryScope: TerritoryScope = selectedPlan
    ? selectedPlan.scope === 'NATIONAL'
      ? 'NONE'
      : selectedPlan.scope
    : effectiveOfficeType === 'CONCEJO' || effectiveOfficeType === 'ALCALDIA'
      ? 'MUNICIPAL'
      : effectiveOfficeType === 'ASAMBLEA' || effectiveOfficeType === 'GOBERNACION'
        ? 'DEPARTMENT'
        : effectiveOfficeType === 'CONGRESO'
          ? 'CHAMBER'
          : 'NONE';
  // Con plan comercial el territorio es obligatorio: sin él no hay categoría
  // ni cupos.
  const territoryRequired = Boolean(selectedPlan) && territoryScope !== 'NONE';

  // Otro plan puede pedir otro nivel de territorio o fijar otro cargo.
  const handleCommercialPlanChange = (code: string) => {
    const next = commercialPlans.find((p) => p.code === code) ?? null;
    const nextOffice = (next?.officeType as OrganizationOfficeType | null) ?? null;
    setTerritory(null);
    setForm((f) => {
      const office = nextOffice ?? f.officeType;
      return {
        ...f,
        commercialPlanCode: code,
        planId: '__none__',
        officeType: office,
        legislativeBodyId: bodiesForOffice(legislativeBodies, office as OrganizationOfficeType).some(
          (b) => b.code === f.legislativeBodyId,
        )
          ? f.legislativeBodyId
          : '__none__',
      };
    });
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
      toast.error('El slug solo puede tener minúsculas, números y guiones (ej. "campana-2026").');
      return;
    }
    if (form.adminPassword.length < 6) {
      toast.error('La contraseña del admin debe tener al menos 6 caracteres.');
      return;
    }
    if (territoryRequired && !territory) {
      toast.error(`El plan ${selectedPlan?.name} se cotiza por territorio: elige el municipio o departamento.`);
      return;
    }

    setSaving(true);
    try {
      const result = await createOrganization({
        name: form.name.trim(),
        slug: form.slug.trim(),
        nit: form.nit.trim() || undefined,
        commercialPlanCode: selectedPlan?.code,
        candidacy: selectedPlan ? form.candidacy : undefined,
        planId: selectedPlan || form.planId === '__none__' ? null : form.planId,
        officeType:
          effectiveOfficeType === '__none__'
            ? undefined
            : (effectiveOfficeType as OrganizationOfficeType),
        legislativeBodyId:
          canPickLegislativeBody && form.legislativeBodyId !== '__none__'
            ? form.legislativeBodyId
            : undefined,
        territoryCode: territory?.code,
        admin: {
          email: form.adminEmail.trim(),
          fullName: form.adminFullName.trim(),
          password: form.adminPassword,
        },
      });
      toast.success(
        `"${result.organization.name}" creada${result.commercialPlan ? ` con el plan ${result.commercialPlan.name}` : ''} — admin: ${result.adminUser.email}`,
      );
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
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold">
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
            <div className="space-y-1.5">
              <Label htmlFor="org-nit">NIT (opcional)</Label>
              <Input
                id="org-nit"
                value={form.nit}
                onChange={(e) => setForm((f) => ({ ...f, nit: e.target.value }))}
                placeholder="900123456-1"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plan comercial</Label>
                <Select value={form.commercialPlanCode} onValueChange={handleCommercialPlanChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin plan comercial (demo o cortesía)</SelectItem>
                    {commercialPlans.map((plan) => (
                      <SelectItem key={plan.code} value={plan.code}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPlan ? (
                <div className="space-y-1.5">
                  <Label>Perfil</Label>
                  <Select
                    value={form.candidacy}
                    onValueChange={(v) => setForm((f) => ({ ...f, candidacy: v as Candidacy }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVO">En ejercicio</SelectItem>
                      <SelectItem value="ASPIRANTE">Aspirante (más capacidad)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Paquete de módulos</Label>
                  <Select value={form.planId} onValueChange={(v) => setForm((f) => ({ ...f, planId: v }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Todos los módulos</SelectItem>
                      {plans.map((plan) => (
                        <SelectItem key={plan.code} value={plan.code}>{plan.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {selectedPlan
                ? `Incluye los módulos del paquete ${plans.find((p) => p.code === selectedPlan.basePlanCode)?.name ?? selectedPlan.basePlanCode}; los cupos salen de la categoría del territorio y el perfil. El precio y la vigencia se fijan al registrar el pago.`
                : 'Sin plan comercial la organización no tiene cupos del catálogo ni vencimiento: úsalo solo para demos y cortesías.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de cargo{lockedOfficeType ? '' : ' (opcional)'}</Label>
                <Select
                  disabled={Boolean(lockedOfficeType)}
                  value={effectiveOfficeType}
                  onValueChange={(v) => {
                    // Otro cargo puede pedir otro nivel de territorio.
                    setTerritory(null);
                    setForm((f) => ({
                      ...f,
                      officeType: v,
                      // Si la corporación elegida no es del nivel del nuevo
                      // cargo, queda obsoleta — nunca se manda una
                      // combinación inválida.
                      legislativeBodyId: bodiesForOffice(legislativeBodies, v as OrganizationOfficeType).some(
                        (b) => b.code === f.legislativeBodyId,
                      )
                        ? f.legislativeBodyId
                        : '__none__',
                    }));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin definir</SelectItem>
                    {(Object.keys(OFFICE_TYPE_LABEL) as OrganizationOfficeType[]).map((type) => (
                      <SelectItem key={type} value={type}>{OFFICE_TYPE_LABEL[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  {lockedOfficeType ? 'Lo fija el plan comercial. ' : ''}Define el kit de arranque (temas iniciales de gestión).
                </p>
              </div>
              {canPickLegislativeBody && (
                <div className="space-y-1.5">
                  <Label>Corporación legislativa</Label>
                  <Select
                    value={form.legislativeBodyId}
                    onValueChange={(v) => setForm((f) => ({ ...f, legislativeBodyId: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin asignar (configurar después)</SelectItem>
                      {officeBodies.map((body) => (
                        <SelectItem key={body.code} value={body.code}>{body.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">Activa el Radar Legislativo de esta organización desde ya.</p>
                </div>
              )}
            </div>
            {territoryScope !== 'NONE' && (
              <div className="space-y-1.5">
                <Label>Territorio{territoryRequired ? '' : ' (opcional)'}</Label>
                <TerritoryPicker
                  scope={territoryScope}
                  value={territory}
                  onChange={setTerritory}
                  search={searchTerritories}
                />
                <p className="text-xs text-slate-400">
                  Fija la categoría de la Contaduría y con ella la tarifa y los cupos del plan.
                </p>
              </div>
            )}
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
              <p className="text-xs text-slate-400">Compártela con el cliente por un canal seguro; podrá cambiarla con &quot;¿Olvidaste tu contraseña?&quot;.</p>
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

// Plan "Ampliación PLATFORM_OPERATOR" (2026-09-05), Fase A — hasta ahora la
// ÚNICA forma de tocar el cupo de una organización YA existente era directo
// contra la base de datos (cambiar el plan completo afecta MÁS que solo el
// cupo). PATCH parcial real: solo se envían los campos que el operador
// realmente tocó, mismo criterio que el backend.
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

// "Puntaje de adopción por organización" (Track C de Ruta 2027,
// 2026-09-09) — transparente: BAJA (nunca logueado o >30 días), ALTA
// (login reciente + consumo real), MEDIA el resto.
function daysSinceLabel(lastActivityAt: string | null): string {
  if (!lastActivityAt) return 'Nunca ha iniciado sesión';
  const days = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Último login: hoy';
  if (days === 1) return 'Último login: hace 1 día';
  return `Último login: hace ${days} días`;
}

function AdoptionBadge({ label, lastActivityAt }: { label: AdoptionLabel; lastActivityAt: string | null }) {
  const variant = label === 'ALTA' ? 'secondary' : label === 'BAJA' ? 'destructive' : 'outline';
  const text = label === 'ALTA' ? 'Alta' : label === 'BAJA' ? 'Baja' : 'Media';
  return (
    <div className="space-y-1 min-w-[130px]">
      <Badge variant={variant}>{text}</Badge>
      <p className="text-[10px] text-slate-400">{daysSinceLabel(lastActivityAt)}</p>
    </div>
  );
}
