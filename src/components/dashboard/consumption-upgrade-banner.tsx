'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMySubscription, type OrganizationSubscription } from '@/lib/api/organizations';

const AT_RISK_THRESHOLD = 80; // mismo umbral que ConsumptionAlertService (backend) y el panel de PLATFORM_OPERATOR
const CHANNEL_LABEL: Record<'sms' | 'email' | 'whatsapp', string> = {
  sms: 'SMS',
  email: 'correos',
  whatsapp: 'WhatsApp',
};
const DISMISS_KEY = 'consumption-banner-dismissed-at';

/**
 * Banner de "estás cerca de tu límite" para la propia organización —
 * mismo umbral (80%/95%) que ya dispara el correo automático en
 * `ConsumptionAlertService` (backend), como refuerzo visual dentro de la
 * app por si el correo pasa desapercibido. Sin botón de "actualizar plan"
 * — no hay autoservicio de cambio de plan todavía (solo PLATFORM_OPERATOR
 * puede cambiarlo, ver informe "Gating por Plan"), así que el CTA lleva a
 * `/organization/plan` (donde se ve el detalle completo), no a una acción
 * que no existe.
 */
export function ConsumptionUpgradeBanner() {
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    getMySubscription()
      .then((data) => {
        setSubscription(data);
        try {
          // Se recuerda por 24h, no para siempre — si el consumo sigue
          // subiendo (o se resetea el mes), el banner vuelve a aparecer.
          const dismissedAt = localStorage.getItem(DISMISS_KEY);
          const stillValid = dismissedAt && Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000;
          setDismissed(Boolean(stillValid));
        } catch {
          setDismissed(false);
        }
      })
      .catch(() => setSubscription(null));
  }, []);

  if (!subscription || dismissed) return null;

  const atRisk = (['sms', 'email', 'whatsapp'] as const)
    .map((channel) => ({ channel, metric: subscription.consumption[channel] }))
    .filter(({ metric }) => metric.percentage >= AT_RISK_THRESHOLD)
    .sort((a, b) => b.metric.percentage - a.metric.percentage);

  if (atRisk.length === 0) return null;

  const worst = atRisk[0];
  const critical = worst.metric.percentage >= 95;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Sin persistencia, el banner solo vuelve a aparecer en la próxima carga — no rompe nada.
    }
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
        critical ? 'border-red-200 bg-red-50 text-red-800' : 'border-yellow-200 bg-yellow-50 text-yellow-900'
      }`}
    >
      <AlertTriangle className={`h-4 w-4 shrink-0 ${critical ? 'text-red-500' : 'text-yellow-500'}`} />
      <p className="flex-1">
        Tu organización usó el <strong>{worst.metric.percentage}%</strong> de su cupo de {CHANNEL_LABEL[worst.channel]}
        {atRisk.length > 1 ? ` (y otros ${atRisk.length - 1} canal${atRisk.length > 2 ? 'es' : ''} también cerca de su límite)` : ''}.
      </p>
      <Link href="/organization/plan">
        <Button size="sm" variant="outline" className="h-7 border-current">
          Ver mi plan
        </Button>
      </Link>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleDismiss} aria-label="Ocultar por hoy">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
