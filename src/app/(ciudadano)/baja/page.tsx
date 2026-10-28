'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, MailX } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { InvalidLinkNotice } from '@/components/public/invalid-link-notice';
import {
  CampaignBar,
  PublicBrandProvider,
  brandStyle,
  type PublicBrand,
} from '@/components/public/campaign-brand';

// Fase 2 del análisis de punta a punta (2026-10-28, MSG-02): "Darte de baja" en
// los correos de difusión apuntaba a `#`. Esta página es el destino del enlace
// de cada correo (`/baja?t=<token>`): muestra de qué campaña y a qué correo,
// y la baja se confirma con un botón. Abrir la página NO da de baja: los
// antivirus y las vistas previas del correo abren los enlaces solos. La baja
// de un clic que piden Gmail y Yahoo (cabecera `List-Unsubscribe`) va directo
// a la API. La marca es la de la campaña (`campaign-brand.tsx`), que sale del
// token: la página no lleva el enlace de la organización.

interface UnsubscribeDetails {
  brand: PublicBrand;
  slug: string;
  email: string;
  unsubscribed: boolean;
}

type PageState = 'loading' | 'ready' | 'done' | 'invalid' | 'error';

const statusOf = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status;

function UnsubscribeContent() {
  const token = useSearchParams().get('t') ?? '';
  const [state, setState] = useState<PageState>(token ? 'loading' : 'invalid');
  const [details, setDetails] = useState<UnsubscribeDetails | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .get<UnsubscribeDetails>('/public/email/unsubscribe/details', { params: { t: token } })
      .then(({ data }) => {
        if (cancelled) return;
        setDetails(data);
        setState(data.unsubscribed ? 'done' : 'ready');
      })
      .catch((error: unknown) => {
        if (!cancelled) setState(statusOf(error) === 404 ? 'invalid' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirm = async () => {
    setSending(true);
    try {
      await api.post('/public/email/unsubscribe', null, { params: { t: token } });
      setState('done');
    } catch (error) {
      if (statusOf(error) === 404) setState('invalid');
      else toast.error('No pudimos registrar tu baja. Inténtalo de nuevo en unos minutos.');
    } finally {
      setSending(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando" />
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <InvalidLinkNotice description="Abre el enlace completo que te llegó en el correo. Si sigues recibiendo correos que no quieres, pídele a la campaña que deje de escribirte." />
    );
  }

  if (state === 'error' || !details) {
    return (
      <InvalidLinkNotice
        title="No pudimos cargar esta página"
        description="Inténtalo de nuevo en unos minutos."
      />
    );
  }

  const { brand } = details;
  return (
    <PublicBrandProvider value={brand}>
      <div style={brandStyle(brand)} className="min-h-screen bg-slate-50">
        <CampaignBar brand={brand} />
        <main className="flex justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            {state === 'done' ? (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Listo, te diste de baja</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {brand.name} ya no te enviará correos de difusión a{' '}
                  <span className="font-semibold">{details.email}</span>.
                </p>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Si quieres consultar, corregir o eliminar tus datos, entra a{' '}
                  <Link href={`/${details.slug}/mis-datos`} className="font-medium text-primary underline">
                    Mis datos
                  </Link>
                  .
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <MailX className="h-6 w-6" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">¿Dejar de recibir estos correos?</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Vas a dejar de recibir los correos de difusión de{' '}
                  <span className="font-semibold">{brand.name}</span> en{' '}
                  <span className="font-semibold">{details.email}</span>.
                </p>
                <Button className="mt-6 w-full" onClick={confirm} disabled={sending}>
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Sí, darme de baja
                </Button>
                <p className="mt-4 text-xs text-slate-500">
                  <Link href="/privacidad" className="underline">
                    Política de privacidad
                  </Link>
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </PublicBrandProvider>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50" aria-busy="true">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
