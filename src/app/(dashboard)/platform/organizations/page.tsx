'use client';

import Link from 'next/link';
import { useCallback, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuerySection } from '@/components/platform/query-section';
import { searchPlatformOrganizations } from '@/lib/api/platform';
import { usePlatformAccess } from '@/components/platform/access-context';
import { listCommercialPlans, SUBSCRIPTION_STATE_LABEL } from '@/lib/api/billing';

function OrganizationList() {
  const access = usePlatformAccess();
  const router = useRouter();
  const search = useSearchParams();
  const query = search.toString();
  const load = useCallback(() => searchPlatformOrganizations(new URLSearchParams(query)), [query]);
  const [q, setQ] = useState(search.get('q') ?? '');
  const [territory, setTerritory] = useState(search.get('territory') ?? '');
  const [plan, setPlan] = useState(search.get('plan') ?? '');
  const [sort, setSort] = useState(search.get('sort') ?? 'name');
  const [accessState, setAccessState] = useState(search.get('accessState') ?? '');
  const navigate = (page: number) => {
    const params = new URLSearchParams(query);
    params.set('page', String(page));
    router.push(`/platform/organizations?${params}`);
  };
  return <div className="mx-auto max-w-7xl p-6 md:p-10 space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-bold">Organizaciones</h1>{access?.capabilities.includes('ORGANIZATIONS_CREATE') && (!access.enabled || access.principal) && <Button asChild variant="outline"><Link href="/platform/settings">Crear organización y gestionar configuración</Link></Button>}</div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => {
      e.preventDefault();
      const params = new URLSearchParams({ page: '1', pageSize: '20', sort });
      if (q.trim()) params.set('q', q.trim());
      if (territory.trim()) params.set('territory', territory.trim());
      if (plan) params.set('plan', plan);
      if (accessState) params.set('accessState', accessState);
      router.push(`/platform/organizations?${params}`);
    }}>
      <label className="space-y-1 text-sm">Nombre o identificación<Input value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} /></label>
      <label className="space-y-1 text-sm">Territorio<Input value={territory} onChange={(e) => setTerritory(e.target.value)} maxLength={120} /></label>
      <QuerySection title="Plan comercial" load={listCommercialPlans}>{(plans) => <select aria-label="Plan comercial" className="block h-9 rounded-md border px-3" value={plan} onChange={(e) => setPlan(e.target.value)}><option value="">Todos</option>{plans.map((entry) => <option key={entry.code} value={entry.code}>{entry.name}</option>)}</select>}</QuerySection>
      <label className="space-y-1 text-sm">Orden<select className="block h-9 rounded-md border px-3" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name">Nombre</option><option value="createdAt">Fecha de creación</option></select></label>
      <label className="space-y-1 text-sm">Estado de acceso<select aria-label="Estado de acceso" className="block h-9 rounded-md border px-3" value={accessState} onChange={(event) => setAccessState(event.target.value)}><option value="">Todos</option>{Object.entries({ ...SUBSCRIPTION_STATE_LABEL, NO_SUBSCRIPTION: 'Sin suscripción', UNREGULARIZED: 'Por regularizar' }).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <Button type="submit">Buscar</Button>
      <Button type="button" variant="outline" onClick={() => { setQ(''); setTerritory(''); setPlan(''); setSort('name'); setAccessState(''); router.push('/platform/organizations'); }}>Limpiar</Button>
    </form>
    <QuerySection title="Resultados" load={load}>{(data) => <>
      <p className="text-sm text-muted-foreground">{data.total} organizaciones encontradas</p>
      {data.items.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Organización</th><th>Plan comercial</th><th>Territorio</th><th>Acceso</th><th>Vencimiento de acceso</th></tr></thead><tbody>{data.items.map((org) => <tr key={org.id} className="border-b"><td className="p-3"><Link className="font-semibold text-primary underline" href={`/platform/organizations/${org.id}`}>{org.name}</Link><p>{org.nit ?? 'Sin identificación'}</p></td><td>{org.commercialPlan?.name ?? 'Sin plan comercial'}</td><td>{org.territory?.name ?? 'Sin territorio'}</td><td>{org.lifecycle ? SUBSCRIPTION_STATE_LABEL[org.lifecycle.state] : 'Sin suscripción'}</td><td>{org.lifecycle?.expiresAt ? new Date(org.lifecycle.expiresAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : 'Sin fecha registrada'}</td></tr>)}</tbody></table></div> : <p>No hay organizaciones en esta página con los filtros seleccionados.</p>}
      <div className="flex items-center gap-3"><Button variant="outline" disabled={data.page <= 1} onClick={() => navigate(data.page - 1)}>Anterior</Button><span>Página {data.page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><Button variant="outline" disabled={data.page * data.pageSize >= data.total} onClick={() => navigate(data.page + 1)}>Siguiente</Button></div>
    </>}</QuerySection>
  </div>;
}

export default function OrganizationsPage() {
  return <Suspense fallback={<p className="p-6">Cargando organizaciones…</p>}><OrganizationListWithUrl /></Suspense>;
}

function OrganizationListWithUrl() {
  const search = useSearchParams();
  return <OrganizationList key={search.toString()} />;
}
