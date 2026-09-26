'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, CheckCircle2, Loader2, Minus, ShieldCheck } from 'lucide-react';
import {
  getLeadConsent,
  getPublicPlans,
  submitLead,
  type Candidacy,
  type OfficeType,
  type PublicPlan,
} from '@/lib/api/public-plans';

// Fase 4 "Salida al mercado" (2026-09-27). Página pública de planes por cargo.
// Los precios NUNCA se escriben acá: llegan de `GET /public/plans`, calculados
// por el backend desde el mismo catálogo con el que se cobra.

const cop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const qty = (value: number | null) =>
  value === null ? 'Ilimitados' : new Intl.NumberFormat('es-CO').format(value);

const TERMS = [3, 6, 12] as const;

const OFFICE_LABEL: Record<OfficeType, string> = {
  CONCEJO: 'Concejo',
  ASAMBLEA: 'Asamblea departamental',
  ALCALDIA: 'Alcaldía',
  GOBERNACION: 'Gobernación',
  CONGRESO: 'Congreso',
};

// Qué incluye cada set de módulos (acumulativo: Despacho incluye Campaña, e
// Inteligencia incluye ambos). Es contenido comercial, no reglas de negocio:
// el acceso real lo decide el backend por el plan de la organización.
const BENEFITS: { group: string; items: { label: string; from: 'CAMPANA' | 'DESPACHO' | 'INTELIGENCIA' }[] }[] = [
  {
    group: 'CRM y territorio',
    items: [
      { label: 'Prospectos, agenda y mapa territorial', from: 'CAMPANA' },
      { label: 'Recolección y liquidación de firmas', from: 'CAMPANA' },
      { label: 'Gamificación y red de líderes', from: 'CAMPANA' },
    ],
  },
  {
    group: 'Movilización',
    items: [
      { label: 'WhatsApp, SMS y correo masivos', from: 'CAMPANA' },
      { label: 'Copiloto de contenido con IA', from: 'CAMPANA' },
      { label: 'Automatización de campaña', from: 'CAMPANA' },
    ],
  },
  {
    group: 'Oficina y despacho',
    items: [
      { label: 'Derechos de petición con borrador por IA', from: 'DESPACHO' },
      { label: 'Radar legislativo y proyectos de ley', from: 'DESPACHO' },
      { label: 'Gestión documental y denuncias ciudadanas', from: 'DESPACHO' },
      { label: 'Marca propia (logo y colores)', from: 'DESPACHO' },
    ],
  },
  {
    group: 'Inteligencia',
    items: [
      { label: 'Monitoreo predictivo de menciones', from: 'INTELIGENCIA' },
      { label: 'Investigación OSINT (17 fuentes públicas)', from: 'INTELIGENCIA' },
      { label: 'Estadísticas de redes sociales', from: 'INTELIGENCIA' },
    ],
  },
  {
    group: 'Cumplimiento legal',
    items: [
      { label: 'Habeas Data (Ley 1581) y finanzas de campaña (Ley 1475)', from: 'CAMPANA' },
    ],
  },
];

const TIER_RANK = { CAMPANA: 0, DESPACHO: 1, INTELIGENCIA: 2 } as const;
const includes = (plan: PublicPlan, from: keyof typeof TIER_RANK) =>
  TIER_RANK[plan.basePlanCode] >= TIER_RANK[from];

export default function PlanesPage() {
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [candidacy, setCandidacy] = useState<Candidacy>('ACTIVO');
  const [term, setTerm] = useState<3 | 6 | 12>(12);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  useEffect(() => {
    getPublicPlans()
      .then(setPlans)
      .catch(() => setLoadError(true));
  }, []);

  const choosePlan = (code: string) => {
    setSelectedPlan(code);
    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Encabezado */}
      <header className="bg-[#1B2541] text-white">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold tracking-wide text-[#FFC400]">JuryTech Solutions</span>
            <Link href="/login" className="text-sm text-slate-300 hover:text-white">
              Iniciar sesión
            </Link>
          </div>
          <h1 className="mt-10 max-w-3xl text-3xl font-bold leading-tight text-balance sm:text-4xl">
            Un plan para cada cargo. Con el precio a la vista.
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">
            CRM territorial, movilización, despacho e inteligencia para concejales, diputados, alcaldes, gobernadores y
            congresistas. Pagas por término de 3, 6 o 12 meses, sin permanencia oculta.
          </p>

          {/* Controles */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div role="radiogroup" aria-label="Tipo de cliente" className="inline-flex rounded-lg bg-white/10 p-1">
              {(['ACTIVO', 'ASPIRANTE'] as const).map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={candidacy === c}
                  onClick={() => setCandidacy(c)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFC400] ${
                    candidacy === c ? 'bg-[#FFC400] text-[#1B2541]' : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {c === 'ACTIVO' ? 'En ejercicio' : 'Aspirante'}
                </button>
              ))}
            </div>
            <div role="radiogroup" aria-label="Término" className="inline-flex rounded-lg bg-white/10 p-1">
              {TERMS.map((t) => (
                <button
                  key={t}
                  role="radio"
                  aria-checked={term === t}
                  onClick={() => setTerm(t)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFC400] ${
                    term === t ? 'bg-white text-[#1B2541]' : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {t} meses
                </button>
              ))}
            </div>
          </div>
          {candidacy === 'ASPIRANTE' && (
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Un aspirante opera en una ventana corta y de alta intensidad (más mensajes, más monitoreo), por eso su tarifa
              es distinta a la de un funcionario en ejercicio.
            </p>
          )}
        </div>
      </header>

      {/* Planes */}
      <main className="mx-auto -mt-16 max-w-6xl px-4 sm:px-6">
        {loadError ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            No pudimos cargar los planes en este momento. Escríbenos por el formulario de abajo y te enviamos la
            información.
          </div>
        ) : !plans ? (
          <div className="flex justify-center rounded-xl bg-white py-16 shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((plan) => (
              <PlanCard key={plan.code} plan={plan} candidacy={candidacy} term={term} onChoose={choosePlan} />
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-slate-500">
          Precios en pesos colombianos, sin IVA (19%). Precio Fundador: primeros clientes de cada plan, congelado mientras
          la suscripción siga activa.
        </p>

        {/* Qué incluye */}
        {plans && plans.length > 0 && (
          <section className="mt-16" aria-labelledby="incluye">
            <h2 id="incluye" className="text-2xl font-bold text-[#1B2541]">
              Qué incluye cada plan
            </h2>
            <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="p-3 font-semibold text-slate-500">Funcionalidad</th>
                    {plans.map((p) => (
                      <th key={p.code} className="p-3 text-center font-semibold text-[#1B2541]">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BENEFITS.map((group) => (
                    <GroupRows key={group.group} group={group} plans={plans} />
                  ))}
                  <tr className="border-t border-slate-200">
                    <td className="p-3 text-slate-600">Usuarios del equipo</td>
                    {plans.map((p) => (
                      <td key={p.code} className="p-3 text-center tabular-nums">{qty(p.quotas.users)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-600">Prospectos</td>
                    {plans.map((p) => (
                      <td key={p.code} className="p-3 text-center tabular-nums">{qty(p.quotas.prospects)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Garantías */}
        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            ['Garantía de 30 días', 'Si en los primeros 30 días del primer pago decides que no es para ti, te devolvemos el dinero.'],
            ['Tus datos son tuyos', 'Al terminar el servicio te entregamos una exportación completa de la información de tu campaña.'],
            ['Cumplimiento legal', 'Consentimiento real de Habeas Data, portal de derechos para ciudadanos y registro de aportes y gastos de campaña.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="font-bold text-[#1B2541]">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </section>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/confianza" className="inline-flex items-center gap-1 underline hover:text-slate-700">
            <ShieldCheck className="h-4 w-4" /> Cómo protegemos los datos de tu campaña
          </Link>
          {' · '}
          <Link href="/terminos" className="underline hover:text-slate-700">
            Documentos legales
          </Link>
        </p>

        {/* Contacto */}
        <section id="contacto" className="mt-16 scroll-mt-6 pb-20" aria-labelledby="contacto-titulo">
          <LeadForm plans={plans ?? []} selectedPlan={selectedPlan} candidacy={candidacy} />
        </section>
      </main>
    </div>
  );
}

function PlanCard({
  plan,
  candidacy,
  term,
  onChoose,
}: {
  plan: PublicPlan;
  candidacy: Candidacy;
  term: 3 | 6 | 12;
  onChoose: (code: string) => void;
}) {
  const prices = plan.prices[candidacy];
  const termPrice = prices.terms.find((t) => t.termMonths === term)!;
  const founder = plan.founderAvailable;
  const monthly = founder ? prices.founderMonthly : prices.listMonthly;
  const total = founder ? termPrice.founderTotal : termPrice.listTotal;

  return (
    <article className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-bold text-[#1B2541]">{plan.name}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 lg:min-h-[5.25rem]">{plan.description}</p>

      <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
        {founder && (
          <p className="text-xs text-slate-400">
            Lista <span className="line-through tabular-nums">{cop(prices.listMonthly)}</span>
          </p>
        )}
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#1B2541]">
          {cop(monthly)}
          <span className="text-sm font-medium text-slate-500"> /mes</span>
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {cop(total)} por {term} meses
          {!founder && termPrice.listDiscountPercent > 0 ? ` (−${termPrice.listDiscountPercent}%)` : ''}
        </p>
        {founder ? (
          <p className="mt-2 inline-block rounded-full bg-[#FFC400]/20 px-2 py-0.5 text-[11px] font-semibold text-[#7a5b00]">
            Precio Fundador · quedan {plan.founderSlotsRemaining}
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-slate-400">Cupos Fundador agotados</p>
        )}
      </div>

      <ul className="mt-4 space-y-1 text-xs text-slate-600">
        <li className="flex justify-between"><span>WhatsApp/mes</span><span className="tabular-nums">{qty(plan.quotas.whatsapp)}</span></li>
        <li className="flex justify-between"><span>SMS/mes</span><span className="tabular-nums">{qty(plan.quotas.sms)}</span></li>
        <li className="flex justify-between"><span>Correos/mes</span><span className="tabular-nums">{qty(plan.quotas.email)}</span></li>
        <li className="flex justify-between"><span>Usuarios</span><span className="tabular-nums">{qty(plan.quotas.users)}</span></li>
      </ul>

      <button
        onClick={() => onChoose(plan.code)}
        className="mt-5 rounded-lg bg-[#1B2541] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1B2541]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2541]"
      >
        Quiero este plan
      </button>
    </article>
  );
}

function GroupRows({ group, plans }: { group: (typeof BENEFITS)[number]; plans: PublicPlan[] }) {
  return (
    <>
      <tr className="bg-slate-50">
        <td colSpan={plans.length + 1} className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {group.group}
        </td>
      </tr>
      {group.items.map((item) => (
        <tr key={item.label} className="border-t border-slate-100">
          <td className="p-3 text-slate-600">{item.label}</td>
          {plans.map((p) => (
            <td key={p.code} className="p-3 text-center">
              {includes(p, item.from) ? (
                <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Incluido" />
              ) : (
                <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="No incluido" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function LeadForm({
  plans,
  selectedPlan,
  candidacy,
}: {
  plans: PublicPlan[];
  selectedPlan: string;
  candidacy: Candidacy;
}) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    officeType: '' as OfficeType | '',
    territory: '',
    message: '',
    commercialPlanCode: '',
    website: '',
  });
  const [consent, setConsent] = useState(false);
  const [consentText, setConsentText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLeadConsent()
      .then((c) => setConsentText(c.text))
      .catch(() => setConsentText('Autorizo el tratamiento de mis datos personales para que me contacten (Ley 1581 de 2012).'));
  }, []);

  // Al elegir un plan desde una tarjeta, se preselecciona aquí.
  useEffect(() => {
    if (!selectedPlan) return;
    const plan = plans.find((p) => p.code === selectedPlan);
    setForm((f) => ({ ...f, commercialPlanCode: selectedPlan, officeType: plan?.officeType ?? f.officeType }));
  }, [selectedPlan, plans]);

  const source = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    return params.get('utm_source') ?? params.get('ref') ?? undefined;
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!consent) {
      setError('Para contactarte necesitamos tu autorización de tratamiento de datos.');
      return;
    }
    setSending(true);
    try {
      await submitLead({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        officeType: form.officeType || undefined,
        candidacy,
        territory: form.territory || undefined,
        message: form.message || undefined,
        commercialPlanCode: form.commercialPlanCode || undefined,
        source,
        dataTreatment: true,
        website: form.website || undefined,
      });
      setSent(true);
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { message?: string | string[] } } })?.response;
      const msg = status?.data?.message;
      setError(
        status?.status === 429
          ? 'Recibimos varias solicitudes seguidas. Espera un minuto e inténtalo de nuevo.'
          : (Array.isArray(msg) ? msg[0] : msg) || 'No pudimos enviar tu solicitud. Inténtalo de nuevo.',
      );
    } finally {
      setSending(false);
    }
  };

  const input =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#1B2541] focus:outline-none focus:ring-2 focus:ring-[#1B2541]/20';

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-3 text-xl font-bold text-[#1B2541]">Recibimos tu solicitud</h2>
        <p className="mt-2 text-sm text-slate-600">Un asesor te contactará pronto para agendar una demostración.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 id="contacto-titulo" className="text-xl font-bold text-[#1B2541]">
        Agenda una demostración
      </h2>
      <p className="mt-1 text-sm text-slate-500">Déjanos tus datos y te mostramos la plataforma con un caso de tu cargo.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Nombre completo</span>
          <input required minLength={3} maxLength={120} className={input} value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Correo</span>
          <input required type="email" maxLength={160} className={input} value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Celular</span>
          <input type="tel" maxLength={30} className={input} value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Cargo</span>
          <select className={input} value={form.officeType}
            onChange={(e) => setForm({ ...form, officeType: e.target.value as OfficeType | '' })}>
            <option value="">Selecciona</option>
            {(Object.keys(OFFICE_LABEL) as OfficeType[]).map((o) => (
              <option key={o} value={o}>{OFFICE_LABEL[o]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Plan de interés</span>
          <select className={input} value={form.commercialPlanCode}
            onChange={(e) => setForm({ ...form, commercialPlanCode: e.target.value })}>
            <option value="">Aún no sé</option>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Municipio o departamento</span>
          <input maxLength={120} className={input} value={form.territory}
            onChange={(e) => setForm({ ...form, territory: e.target.value })} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">¿Qué necesitas resolver? (opcional)</span>
          <textarea rows={3} maxLength={2000} className={input} value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })} />
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
          <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#1B2541]" checked={consent}
            onChange={(e) => setConsent(e.target.checked)} />
          <span>{consentText}</span>
        </label>

        {error && <p className="text-sm font-medium text-red-600 sm:col-span-2" role="alert">{error}</p>}

        <button type="submit" disabled={sending}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#1B2541] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1B2541]/90 disabled:opacity-60 sm:col-span-2">
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Solicitar demostración
        </button>
      </form>
    </div>
  );
}
