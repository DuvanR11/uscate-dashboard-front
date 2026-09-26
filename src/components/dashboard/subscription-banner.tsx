'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Ban, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { getOrganizationBilling, type OrganizationBilling } from '@/lib/api/billing';

const EXPIRY_WARNING_DAYS = 15;

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

/**
 * Aviso de vigencia de la suscripción de la propia organización. Estados y
 * fechas los calcula el backend (`GET /organization/billing`, misma función
 * que hace cumplir el bloqueo) — acá solo se muestran:
 *  - ACTIVE con vencimiento en ≤15 días: aviso amable para renovar a tiempo.
 *  - GRACE: venció, pero aún se puede operar con normalidad.
 *  - READ_ONLY / SUSPENDED / CANCELLED: la cuenta ya está limitada.
 * No se muestra durante una sesión de soporte ("ver como") ni al operador.
 */
export function SubscriptionBanner() {
  const impersonation = useAuthStore((s) => s.impersonation);
  const role = useAuthStore((s) => s.user?.role?.code);
  const [billing, setBilling] = useState<OrganizationBilling | null>(null);

  useEffect(() => {
    if (impersonation || role === 'PLATFORM_OPERATOR') return;
    getOrganizationBilling()
      .then(setBilling)
      .catch(() => setBilling(null));
  }, [impersonation, role]);

  if (impersonation || !billing || !billing.hasSubscription) return null;

  const { state, expiresAt, daysToExpiry, graceEndsAt, readOnlyEndsAt, cancellationReason } = billing;

  if (state === 'ACTIVE') {
    if (daysToExpiry === null || daysToExpiry > EXPIRY_WARNING_DAYS) return null;
    return (
      <Banner tone="info" icon={<Clock className="h-4 w-4 shrink-0" />}>
        Tu suscripción vence el <strong>{fmt(expiresAt)}</strong> ({daysToExpiry <= 0 ? 'hoy' : `en ${daysToExpiry} días`}).
        Contacta a tu asesor para renovarla a tiempo.
      </Banner>
    );
  }

  if (state === 'GRACE') {
    return (
      <Banner tone="warning" icon={<AlertTriangle className="h-4 w-4 shrink-0" />}>
        Tu suscripción venció el <strong>{fmt(expiresAt)}</strong>. Tienes acceso completo hasta el{' '}
        <strong>{fmt(graceEndsAt)}</strong>; después la cuenta pasa a solo lectura.
      </Banner>
    );
  }

  if (state === 'READ_ONLY') {
    return (
      <Banner tone="danger" icon={<AlertTriangle className="h-4 w-4 shrink-0" />}>
        Tu cuenta está en <strong>solo lectura</strong>: puedes consultar y exportar, pero no crear ni enviar. Se suspende
        el {fmt(readOnlyEndsAt)}. Renueva para reactivarla.
      </Banner>
    );
  }

  return (
    <Banner tone="danger" icon={<Ban className="h-4 w-4 shrink-0" />}>
      {state === 'CANCELLED'
        ? `Esta suscripción fue cancelada${cancellationReason ? ` (${cancellationReason})` : ''}.`
        : 'Tu suscripción está suspendida por vencimiento.'}{' '}
      Contacta a tu asesor comercial para reactivarla.{' '}
      <Link href="/organization/plan" className="underline">
        Ver mi plan
      </Link>
    </Banner>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'info' | 'warning' | 'danger';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = {
    info: 'bg-sky-50 text-sky-900 ring-sky-200',
    warning: 'bg-amber-50 text-amber-900 ring-amber-300',
    danger: 'bg-red-50 text-red-900 ring-red-300',
  }[tone];
  return (
    <div role="status" className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ring-1 ${styles}`}>
      <span className="mt-0.5">{icon}</span>
      <p className="flex-1">{children}</p>
    </div>
  );
}
