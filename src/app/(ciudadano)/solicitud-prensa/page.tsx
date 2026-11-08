'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  getPressApplicationConsent,
  submitPressApplication,
  type PressPlanCode,
} from '@/lib/api/press-applications';

// Zyron Prensa, Fase 3 (2026-11-08): la solicitud de membresía. En Colombia no
// hay tarjeta de periodista obligatoria (C-087 de 1998): se pide trabajo
// publicado (tres enlaces) o la constancia del medio, nunca un título ni un
// carné. La verificación la hace una persona de Zyron; al aprobarla se crea la
// cuenta y empieza la prueba de 7 días.

const PLANS: { code: PressPlanCode; name: string; hint: string }[] = [
  { code: 'P1', name: 'Periodista', hint: '1 persona' },
  { code: 'P2', name: 'Sala de redacción', hint: 'Hasta 5 personas' },
];

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export default function SolicitudPrensaPage() {
  const [consentText, setConsentText] = useState('');
  const [consent, setConsent] = useState(false);
  const [independent, setIndependent] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    document: '',
    email: '',
    phone: '',
    outlet: '',
    commercialPlanCode: 'P1' as PressPlanCode,
    links: ['', '', ''],
    website: '',
  });
  const [proof, setProof] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPressApplicationConsent()
      .then((c) => setConsentText(c.text))
      .catch(() => setConsentText(''));
  }, []);

  const links = form.links.map((l) => l.trim()).filter(Boolean);
  const enoughEvidence = new Set(links).size >= 3 || !!proof;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!consent) return setError('Para enviar la solicitud tienes que aceptar el tratamiento de tus datos.');
    if (!enoughEvidence)
      return setError('Comparte tres enlaces a trabajos que hayas publicado, o adjunta la constancia de tu medio en PDF.');
    if (proof && proof.size > MAX_PROOF_BYTES) return setError('La constancia pesa más de 5 MB.');
    setSending(true);
    try {
      await submitPressApplication({
        fullName: form.fullName.trim(),
        document: form.document.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        outlet: independent ? undefined : form.outlet.trim() || undefined,
        commercialPlanCode: form.commercialPlanCode,
        workLinks: links,
        proof,
        website: form.website || undefined,
      });
      setSent(true);
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: string | string[] } } })?.response;
      const msg = response?.data?.message;
      setError(
        response?.status === 429
          ? 'Recibimos varias solicitudes seguidas. Espera un minuto e inténtalo de nuevo.'
          : (Array.isArray(msg) ? msg[0] : msg) || 'No pudimos enviar tu solicitud. Inténtalo de nuevo.',
      );
    } finally {
      setSending(false);
    }
  };

  const input =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Image src="/brand/zyron-logo-on-dark.svg" alt="Zyron" width={144} height={32} unoptimized priority className="h-8 w-auto" />
            <Link href="/login" className="text-sm text-slate-300 hover:text-white">
              Iniciar sesión
            </Link>
          </div>
          <h1 className="mt-10 text-3xl font-bold leading-tight text-balance sm:text-4xl">Zyron Prensa</h1>
          <p className="mt-4 leading-relaxed text-slate-300">
            Para vigilar el poder: Radar Legislativo de Cámara, Senado y las corporaciones que elijas, monitoreo de medios,
            investigaciones con fuentes públicas, lectura de documentos y derechos de petición con la Ley 1712.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Una persona de Zyron revisa cada solicitud. No pedimos tarjeta ni título: basta con tu trabajo publicado o una
            constancia de tu medio.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-16 max-w-3xl px-4 pb-16 sm:px-6">
        {sent ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <CheckCircle2 aria-hidden className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-3 text-xl font-bold text-foreground">Recibimos tu solicitud</h2>
            <p className="mt-2 text-sm text-slate-600">
              La revisamos y te escribimos al correo que dejaste. Si se aprueba, te enviamos el acceso y empiezan tus 7
              días de prueba.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-xl font-bold text-foreground">Solicita tu membresía</h2>
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-medium">Plan</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PLANS.map((plan) => (
                    <label
                      key={plan.code}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${form.commercialPlanCode === plan.code ? 'border-primary ring-2 ring-primary/20' : 'border-slate-300'}`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        className="mt-0.5 accent-primary"
                        checked={form.commercialPlanCode === plan.code}
                        onChange={() => setForm({ ...form, commercialPlanCode: plan.code })}
                      />
                      <span>
                        <span className="block font-semibold">{plan.name}</span>
                        <span className="text-slate-500">{plan.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">Nombre completo</span>
                <input required minLength={3} maxLength={160} className={input} value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Cédula</span>
                <input required inputMode="numeric" maxLength={20} className={input} value={form.document}
                  onChange={(e) => setForm({ ...form, document: e.target.value })} />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Celular (opcional)</span>
                <input type="tel" maxLength={40} className={input} value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">Correo</span>
                <input required type="email" maxLength={160} className={input} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                <span className="mt-1 block text-xs text-slate-500">Con este correo entras a Zyron si se aprueba.</span>
              </label>

              <div className="sm:col-span-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Medio</span>
                  <input maxLength={160} className={input} value={independent ? '' : form.outlet} disabled={independent}
                    required={!independent} placeholder={independent ? 'Independiente' : 'Ej: La Voz del Huila'}
                    onChange={(e) => setForm({ ...form, outlet: e.target.value })} />
                </label>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={independent}
                    onChange={(e) => setIndependent(e.target.checked)} />
                  Soy periodista independiente
                </label>
              </div>

              <fieldset className="sm:col-span-2">
                <legend className="mb-1 text-sm font-medium">Tres trabajos que hayas publicado</legend>
                <p className="mb-2 text-xs text-slate-500">Enlaces a notas, reportajes, emisiones o publicaciones con tu firma.</p>
                <div className="space-y-2">
                  {form.links.map((link, index) => (
                    <input key={index} id={`press-link-${index}`} type="url" maxLength={500} className={input}
                      aria-label={`Enlace ${index + 1}`} placeholder="https://" value={link}
                      onChange={(e) => {
                        const next = [...form.links];
                        next[index] = e.target.value;
                        setForm({ ...form, links: next });
                      }} />
                  ))}
                </div>
              </fieldset>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">O la constancia de tu medio (PDF, opcional si das los enlaces)</span>
                <input type="file" accept="application/pdf" className="block w-full text-sm"
                  onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
                <span className="mt-1 block text-xs text-slate-500">Hasta 5 MB. Se revisa con antivirus y solo la ve el equipo de Zyron.</span>
              </label>

              {/* Trampa anti-bots: oculta para personas y lectores de pantalla. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Sitio web
                  <input tabIndex={-1} autoComplete="off" value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </label>
              </div>

              <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 sm:col-span-2">
                <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={consent}
                  onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  {consentText}{' '}
                  <Link href="/terminos" className="underline" target="_blank">Términos</Link> ·{' '}
                  <Link href="/privacidad" className="underline" target="_blank">Privacidad</Link>
                </span>
              </label>

              {error && <p className="text-sm font-medium text-red-600 sm:col-span-2" role="alert">{error}</p>}

              <button type="submit" disabled={sending || !consentText}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60 sm:col-span-2">
                {sending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                Enviar solicitud
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
