'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { InvalidLinkNotice } from '@/components/public/invalid-link-notice';
import {
  CampaignBar,
  PublicBrandProvider,
  brandStyle,
  type PublicBrand,
} from '@/components/public/campaign-brand';

type LinkState = 'valid' | 'missing';

/**
 * Todas las páginas públicas de una organización (`/<enlace>/register`,
 * `/denuncia-publica`, `/mis-datos`, `/eventos`) comprueban aquí, una sola
 * vez, que el enlace corresponde a una organización real. Antes mostraban el
 * formulario completo con cualquier texto en la dirección y la persona solo se
 * enteraba al enviar.
 *
 * Solo un "no existe" del servidor oculta la página: si la comprobación falla
 * por otra razón (red, servidor ocupado) el formulario se muestra igual.
 *
 * Recorrido de alta (Fase 3, 2026-10-17): la misma respuesta trae la marca de
 * la campaña; la página lleva su barra (logo y nombre) y sus colores.
 */
export default function OrganizationPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [checked, setChecked] = useState<{
    slug: string;
    state: LinkState;
    brand: PublicBrand | null;
  } | null>(null);

  useEffect(() => {
    if (!orgSlug) return;
    let cancelled = false;
    api
      .get<{ name: string; brand?: PublicBrand }>(
        `/public/organizations/${encodeURIComponent(orgSlug)}`,
      )
      .then(({ data }) => {
        if (!cancelled) setChecked({ slug: orgSlug, state: 'valid', brand: data?.brand ?? null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const status = (error as { response?: { status?: number } })?.response?.status;
        setChecked({
          slug: orgSlug,
          state: status === 404 || status === 400 ? 'missing' : 'valid',
          brand: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  const current = checked && checked.slug === orgSlug ? checked : null;
  const state = current?.state ?? 'checking';

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando" />
      </div>
    );
  }

  if (state === 'missing') {
    return (
      <InvalidLinkNotice description="Esta dirección no corresponde a ninguna organización. Revisa que esté completa o pídele a quien te la compartió que te la envíe de nuevo." />
    );
  }

  const brand = current?.brand ?? null;
  return (
    <PublicBrandProvider value={brand}>
      <div style={brandStyle(brand)} className="bg-slate-50">
        {brand && <CampaignBar brand={brand} />}
        {children}
      </div>
    </PublicBrandProvider>
  );
}
