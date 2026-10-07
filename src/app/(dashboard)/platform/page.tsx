'use client';

import Link from 'next/link';
import { ACTION_LABEL } from '@/components/platform/audit-labels';
import { QuerySection } from '@/components/platform/query-section';
import { getPlatformMetrics, getProvidersHealth, listAuditLog } from '@/lib/api/platform';
import { listPlatformManagement, MANAGEMENT_STATUS } from '@/lib/api/platform-management';
import { usePlatformAccess, usePlatformCapability } from '@/components/platform/access-context';

const loadPendingManagement = () => listPlatformManagement(new URLSearchParams({ activeOnly: 'true', pageSize: '5' }));

export default function PlatformHome() {
  const access = usePlatformAccess();
  const billing = usePlatformCapability('BILLING_READ');
  const config = usePlatformCapability('PLATFORM_CONFIG');
  const globalBilling = Boolean(access?.allOrganizations && billing);
  return <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
    <h1 className="text-2xl font-bold">Administración de JuryTech</h1>
    <p className="text-muted-foreground">Consulta tus clientes y atiende sus cobros y gestiones desde su ficha.</p>
    <div className="grid gap-4 md:grid-cols-2">
      {globalBilling && <QuerySection title="Organizaciones" load={getPlatformMetrics}>{(metrics) => <>
        <p className="text-3xl font-bold">{metrics.totalOrganizations}</p>
        <Link href="/platform/organizations" className="text-primary underline">Consultar organizaciones</Link>
        <ul className="space-y-2">{metrics.atRisk.map((risk) => <li key={`${risk.organizationId}-${risk.channel}`}><Link className="underline" href={`/platform/organizations/${risk.organizationId}`}>{risk.organizationName}</Link>: {risk.channel.toUpperCase()} al {risk.percentage.toFixed(0)} % del cupo</li>)}</ul>
        <p className="text-sm text-muted-foreground">Los costos de IA y almacenamiento están pendientes de medición completa.</p>
      </>}</QuerySection>}
      {access?.allOrganizations && config && <QuerySection title="Estado de proveedores" load={getProvidersHealth}>{(health) => <>
        <p className="text-sm">Estado reportado por cada servicio. La disponibilidad no indica su gasto ni saldo.</p>
        <p className="text-sm">Últimos {health.windowDays} días</p>
        <ul className="space-y-2">{Object.entries(health.channels).map(([key, value]) => <li key={key} className="border-b py-2"><strong>{key}</strong><span className="ml-2 text-sm">{value.sent} enviados · {value.failed} fallidos · éxito: {value.successRate === null ? 'sin envíos' : `${value.successRate.toFixed(1)} %`}</span></li>)}</ul>
      </>}</QuerySection>}
    </div>
    <QuerySection title="Gestiones pendientes" load={loadPendingManagement}>{(result) => <><p>{result.total} pendientes · próximas por vencimiento</p>{result.items.length ? <ul className="space-y-3">{result.items.map((task) => <li key={task.id}><Link className="text-primary underline" href={`/platform/organizations/${task.organizationId}`}>{task.organization.name}: {task.title}</Link><p className="text-sm">{MANAGEMENT_STATUS[task.status]} · {task.assigneeName} · vence {new Date(task.dueAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p></li>)}</ul> : <p>No hay gestiones pendientes.</p>}<Link className="text-primary underline" href="/platform/management">Ver todas las gestiones</Link></>}</QuerySection>
    {globalBilling && <QuerySection title="Actividad reciente" load={listAuditLog}>{(entries) => entries.length ? <ul className="space-y-2">{entries.slice(0, 10).map((entry) => <li key={`${ACTION_LABEL[entry.action] ?? entry.action}-${entry.id}`} className="border-b py-2"><p className="font-medium">{entry.organizationName} · {ACTION_LABEL[entry.action] ?? entry.action}</p><p className="text-sm text-muted-foreground">{entry.operatorEmail} · {new Date(entry.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p></li>)}</ul> : <p>Sin actividad registrada.</p>}</QuerySection>}
  </div>;
}
