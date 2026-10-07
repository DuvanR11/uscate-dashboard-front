'use client';
import { BillingAdminPanel } from '@/components/platform/billing-admin-panel';
import Link from 'next/link';
import { usePlatformAccess } from '@/components/platform/access-context';

export default function PlatformBillingPage() {
  const access = usePlatformAccess();
  if (access?.enabled && !access.principal) return <div className="space-y-4 p-6"><h1 className="text-2xl font-bold">Cobros por organización</h1><p>Consulta los pagos y las acciones financieras autorizadas desde la ficha de cada organización.</p><Link className="text-primary underline" href="/platform/organizations">Consultar organizaciones asignadas</Link></div>;
  return <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
    <h1 className="text-2xl font-bold">Cobros y catálogo</h1>
    <p className="text-muted-foreground">Pagos registrados, planes, cupones, comerciales y comisiones. Los cobros por organización se consultan desde su ficha.</p>
    <BillingAdminPanel />
  </div>;
}
