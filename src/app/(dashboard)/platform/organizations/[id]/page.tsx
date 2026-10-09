'use client';

import Link from 'next/link';
import { SupportBoard } from '@/components/platform/support-board';
import { CommercialQuotesPanel } from '@/components/platform/commercial-quotes-panel';
import { ACTION_LABEL } from '@/components/platform/audit-labels';
import { use, useCallback, useState } from 'react';
import { usePlatformAccess, usePlatformCapability } from '@/components/platform/access-context';
import { ExceptionsBoard } from '@/components/platform/exceptions-board';
import { QuerySection } from '@/components/platform/query-section';
import { EditLimitsDialog } from '@/components/platform/edit-limits-dialog';
import { OrganizationIntegrations } from '@/components/platform/organization-integrations';
import { ManagementBoard } from '@/components/platform/management-board';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationBillingDialog, formatCop } from '@/components/platform/organization-billing-dialog';
import { getPlatformOrganization, getPlatformOrganizationHistory, listPlatformPlans, type PlatformOrganization } from '@/lib/api/platform';
import { listOrganizationPayments, PAYMENT_METHOD_LABEL, SUBSCRIPTION_STATE_LABEL } from '@/lib/api/billing';

function OrganizationSummary({ org, refresh, tab, setTab }: { org: PlatformOrganization; refresh: () => void; tab: string; setTab: (tab: string) => void }) {
  const access = usePlatformAccess();
  const canPay = usePlatformCapability('PAYMENT_CONFIRM');
  const canVoid = usePlatformCapability('PAYMENT_VOID');
  const canCancel = usePlatformCapability('SUBSCRIPTION_CANCEL');
  const canWrite = canPay || canVoid || canCancel;
  const canSupport = usePlatformCapability('SUPPORT_READ');
  const canBilling = usePlatformCapability('BILLING_READ');
  const canIntegrations = usePlatformCapability('INTEGRATIONS_MANAGE');
  const loadHistory = useCallback(() => getPlatformOrganizationHistory(org.id), [org.id]);
  const loadPayments = useCallback(() => listOrganizationPayments(org.id), [org.id]);
  const formatDate = (date?: string | null) => date ? new Date(date).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'Sin fecha registrada';
  return <>
    <header className="space-y-2"><h1 className="text-2xl font-bold">{org.name}</h1><p>{org.nit ?? 'Sin identificación'} · {org.lifecycle ? SUBSCRIPTION_STATE_LABEL[org.lifecycle.state] : 'Sin suscripción'}</p></header>
    {(!org.commercialPlan || !org.lifecycle?.expiresAt) && <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">Esta organización tiene condiciones comerciales pendientes de regularización. Conserva su acceso actual durante la revisión individual.</p>}
    <Tabs value={tab} onValueChange={setTab}>
    <TabsList className="h-auto flex flex-wrap justify-start" aria-label="Ficha de organización">{[['summary', 'Resumen'], ['contract', 'Contrato y cobertura'], ['usage', 'Consumos y cupos'], ['billing', 'Cobros'], ['integrations', 'Integraciones'], ['management', 'Gestiones'], ['exceptions', 'Excepciones'], ['history', 'Historial'], ['support', 'Soporte']].filter(([key]) => key === 'support' ? canSupport : !['billing', 'history'].includes(key) || canBilling).map(([key, label]) => <TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}</TabsList>
    <TabsContent value={tab} className="space-y-4">
      {tab === 'billing' && <CommercialQuotesPanel organizationId={org.id} />}
      {tab === 'summary' && <dl className="grid gap-5 rounded-xl border p-5 sm:grid-cols-2">{[
        ['Plan comercial', org.commercialPlan?.name ?? 'Sin plan comercial'],
        ['Plan de módulos', org.plan?.name ?? 'Sin plan asignado'],
        ['Territorio', org.territory?.name ?? 'Sin territorio'],
        ['Perfil', org.candidacy ?? 'Sin perfil registrado'],
        ['Vencimiento de acceso', formatDate(org.lifecycle?.expiresAt)],
        ['Usuarios del equipo permitidos', org.limits?.users ?? 'Sin límite registrado'],
        ['Contactos permitidos', org.limits?.prospects ?? 'Sin límite registrado'],
        ['Almacenamiento contratado (GB)', org.limits?.storageGb ?? 'Sin límite registrado'],
      ].map(([label, value]) => <div key={String(label)}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>}
      {tab === 'usage' && <>
        {access?.enabled && <button className="text-primary underline" onClick={() => setTab('exceptions')}>Solicitar un ajuste excepcional</button>}
        {canWrite && !access?.enabled && org.hasSubscription && <EditLimitsDialog organization={org} onUpdated={refresh} />}
        {org.consumption ? <ul className="rounded-xl border p-5 space-y-3">{[['SMS', org.consumption.sms], ['Correo', org.consumption.email], ['WhatsApp', org.consumption.whatsapp]].map(([label, metric]) => { const usage = metric as { used: number; limit: number }; return <li key={String(label)}>{String(label)}: {usage.used.toLocaleString('es-CO')} usados / {usage.limit.toLocaleString('es-CO')} de cupo registrado</li>; })}</ul> : <p>Sin consumo registrado para esta organización.</p>}
        <p className="text-muted-foreground">Consumo de IA, almacenamiento y acompañamiento: pendiente de medición completa. Los valores contratados no representan consumo.</p>
        <ul>{org.seatsByRole?.filter((role) => role.used || role.limit).map((role) => <li key={role.code}>{role.name}: {role.used} activos / {role.limit} de cupo configurado</li>)}</ul>
      </>}
      {tab === 'billing' && (canBilling && org.hasSubscription ? <>
        <p>Consulta pagos registrados y las gestiones disponibles para esta organización.</p>
        <QuerySection title="Pagos registrados" load={loadPayments}>{(payments) => payments.length ? <ul>{payments.map((payment) => <li key={payment.id} className="border-b py-3"><p className="font-medium">{formatCop(payment.totalAmount)} · {payment.status === 'CONFIRMED' ? 'Confirmado' : 'Anulado'}</p><p className="text-sm">{formatDate(payment.paidAt)} · {PAYMENT_METHOD_LABEL[payment.method]} · {payment.reference ?? 'Sin referencia'}</p></li>)}</ul> : <p>No hay pagos registrados.</p>}</QuerySection>
        {canWrite ? <QuerySection title="Gestión de cobros" load={listPlatformPlans}>{(plans) => <OrganizationBillingDialog organization={org} plans={plans} onUpdated={refresh} />}</QuerySection> : <p>Tu cuenta tiene acceso de consulta. Las gestiones financieras requieren permiso de escritura.</p>}
        <p className="text-sm text-muted-foreground">El pago en línea y las facturas integradas están pendientes de habilitación.</p>
      </> : <p>Sin suscripción registrada. Revisa las condiciones de la cuenta antes de gestionar cobros.</p>)}
      {tab === 'history' && canBilling && <QuerySection title="Últimos 100 eventos de esta organización" load={loadHistory}>{(history) => history.length ? <ul>{history.map((entry) => <li key={`${ACTION_LABEL[entry.action] ?? entry.action}-${entry.id}`} className="border-b py-3"><p>{ACTION_LABEL[entry.action] ?? entry.action} · {entry.operatorEmail}</p><p className="text-sm text-muted-foreground">{formatDate(entry.createdAt)}</p>{typeof entry.metadata?.reason === 'string' && <p className="text-sm">Motivo: {entry.metadata.reason}</p>}</li>)}</ul> : <p>No hay eventos registrados.</p>}</QuerySection>}
      {tab === 'integrations' && <OrganizationIntegrations org={org} canWrite={canIntegrations} refresh={refresh} />}
      {tab === 'support' && canSupport && <SupportBoard platform organizationId={org.id} />}
      {tab === 'management' && <ManagementBoard organizationId={org.id} onUpdated={refresh} />}
      {tab === 'exceptions' && <ExceptionsBoard organizationId={org.id} />}
      {tab === 'contract' && <div className="space-y-4"><p className="text-sm text-muted-foreground">La vigencia registrada y el periodo de un pago confirmado se muestran por separado. El contrato independiente y el calendario de cuotas todavía no están disponibles.</p>{org.contract ? <dl className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2">{[
        ['Inicio de vigencia registrada', formatDate(org.contract.recordedStart)], ['Fin de vigencia registrada', formatDate(org.contract.recordedEnd)], ['Duración registrada (meses)', org.contract.termMonths ?? 'Sin registrar'], ['Inicio del ciclo de cupos', formatDate(org.contract.quotaPeriodStart)], ['Cancelación', formatDate(org.contract.cancelledAt)], ['Motivo de cancelación', org.contract.cancellationReason ?? 'Sin registrar'], ['Módulos del plan asignado', org.contract.modules.length ? org.contract.modules.join(', ') : 'Sin plan de módulos registrado'], ['Último pago de suscripción confirmado', org.contract.lastConfirmedPayment ? formatDate(org.contract.lastConfirmedPayment.paidAt) : 'Sin pago confirmado'], ['Inicio del periodo de ese pago', formatDate(org.contract.lastConfirmedPayment?.periodStart)], ['Fin del periodo de ese pago', formatDate(org.contract.lastConfirmedPayment?.periodEnd)],
      ].map(([label, value]) => <div key={String(label)}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl> : <p>Sin suscripción registrada.</p>}</div>}
    </TabsContent>
    </Tabs>
  </>;
}

export default function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState('summary');
  const load = useCallback(() => getPlatformOrganization(id), [id]);
  return <div className="mx-auto max-w-6xl space-y-5 p-6 md:p-10"><Link href="/platform/organizations" className="text-primary underline">Volver a organizaciones</Link><QuerySection key={`${id}-${revision}`} title="Ficha de organización" load={load}>{(org) => <OrganizationSummary org={org} tab={tab} setTab={setTab} refresh={() => setRevision((n) => n + 1)} />}</QuerySection></div>;
}
