'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, CheckCircle2, Loader2, MapPin, Minus, ShieldCheck } from 'lucide-react';
import {
  getLeadConsent,
  getPublicPlans,
  getPublicQuote,
  searchPublicTerritories,
  submitLead,
  type Candidacy,
  type OfficeType,
  type PublicPlan,
  type PublicQuote,
} from '@/lib/api/public-plans';
import {
  CATEGORY_LABEL,
  TerritoryPicker,
  territoryName,
  type TerritoryChoice,
} from '@/components/billing/territory-picker';

// Página pública de planes. Catálogo territorial (2026-09-29, docs/comercial):
// la tarifa depende de la categoría fiscal del municipio o departamento. Los
// precios NUNCA se escriben ni se calculan aquí: llegan de `GET /public/plans`
// y `GET /public/plans/quote`, calculados por el backend desde el mismo
// catálogo con el que se cobra.

const cop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const qty = (value: number) => new Intl.NumberFormat('es-CO').format(value);

const OFFICE_LABEL: Record<OfficeType, string> = {
  CONCEJO: 'Concejo',
  ASAMBLEA: 'Asamblea departamental',
  ALCALDIA: 'Alcaldía',
  GOBERNACION: 'Gobernación',
  CONGRESO: 'Congreso',
};

// Qué incluye cada plan: cada fila se marca con los MÓDULOS REALES del plan
// (`plan.modules`, del backend), no con niveles fijos. `module` es el código
// que hace cumplir el backend.
const RADAR_MODULE = 'PROYECTOS_LEY';

const BENEFITS: { group: string; items: { label: string; module: string }[] }[] = [
  {
    group: 'CRM y territorio',
    items: [
      { label: 'Prospectos, agenda y mapa territorial', module: 'PROSPECTOS' },
      { label: 'Recolección y liquidación de firmas', module: 'CONTABILIDAD' },
      { label: 'Gamificación y red de líderes', module: 'GAMIFICACION' },
    ],
  },
  {
    group: 'Movilización',
    items: [
      // WhatsApp Business prohíbe su uso por políticos y campañas: no se ofrece.
      { label: 'SMS y correo masivos', module: 'DIFUSIONES' },
      { label: 'Copiloto de contenido con IA', module: 'COPILOTO_CONTENIDO' },
      { label: 'Automatización de campaña', module: 'AUTOMATIZACION_CAMPANA' },
    ],
  },
  {
    group: 'Control político y despacho',
    items: [
      { label: 'Derechos de petición con borrador por IA', module: 'PETICIONES' },
      { label: 'Radar legislativo de tu corporación', module: RADAR_MODULE },
      { label: 'Gestión documental y productividad', module: 'GESTION_DOCUMENTAL' },
      { label: 'Marca propia (logo y colores)', module: 'PERSONALIZACION' },
    ],
  },
  {
    group: 'Inteligencia',
    items: [
      { label: 'Monitoreo predictivo de menciones', module: 'MONITOREO_PREDICTIVO' },
      { label: 'Investigación OSINT (17 fuentes públicas)', module: 'OSINT_CASOS' },
      { label: 'Análisis de comentarios en YouTube, Facebook e Instagram', module: 'ESTADISTICAS_REDES' },
    ],
  },
  {
    group: 'Cumplimiento legal',
    items: [
      { label: 'Habeas Data (Ley 1581) y finanzas de campaña (Ley 1475)', module: 'HABEAS_DATA' },
    ],
  },
];

const includes = (plan: PublicPlan, module: string) => plan.modules.includes(module);

// Qué pide cada plan para cotizar, en palabras del visitante.
const SCOPE_HINT: Record<PublicPlan['scope'], string> = {
  NONE: 'Mismo precio en cualquier municipio',
  MUNICIPAL: 'Según la categoría de tu municipio',
  DEPARTMENT: 'Según la categoría de tu departamento',
  CHAMBER: 'Según la categoría de tu departamento',
  NATIONAL: 'Tarifa nacional única',
};

export default function PlanesPage() {
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [candidacy, setCandidacy] = useState<Candidacy>('ACTIVO');
  const [quotePlan, setQuotePlan] = useState<string>('');
  const [leadPlan, setLeadPlan] = useState<string>('');
  const [leadTerritory, setLeadTerritory] = useState<string>('');

  useEffect(() => {
    getPublicPlans()
      .then(setPlans)
      .catch(() => setLoadError(true));
  }, []);

  const goToQuote = (code: string) => {
    setQuotePlan(code);
    document.getElementById('cotizar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToLead = (code: string, territory?: string) => {
    setLeadPlan(code);
    if (territory) setLeadTerritory(territory);
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
            Un plan para cada cargo, con el precio de tu territorio.
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">
            CRM territorial, movilización, despacho e inteligencia para concejales, diputados, alcaldes, gobernadores y
            congresistas. La tarifa depende de la categoría de tu municipio o departamento. Pagas por 3, 6 o 12 meses, sin
            permanencia oculta.
          </p>

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
          </div>
          {candidacy === 'ASPIRANTE' && (
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Un aspirante opera en una ventana corta y de alta intensidad: paga 1,5 veces la tarifa y recibe el doble de
              usuarios y contactos, y 1,5 veces los envíos.
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-16 max-w-6xl px-4 sm:px-6">
        {/* Planes */}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard key={plan.code} plan={plan} candidacy={candidacy} onQuote={goToQuote} />
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-slate-500">
          Precios mensuales en pesos colombianos, sin IVA (19 %). 6 meses con 5 % de descuento y 12 meses con 10 %, pago
          anticipado. Categorías de la Contaduría General de la Nación, vigencia 2026. Oferta de lanzamiento.
        </p>

        {/* Cotizador */}
        {plans && plans.length > 0 && (
          <section id="cotizar" className="mt-16 scroll-mt-6" aria-labelledby="cotizar-titulo">
            <Quoter plans={plans} candidacy={candidacy} planCode={quotePlan} onPlanChange={setQuotePlan} onWant={goToLead} />
          </section>
        )}

        {/* Qué incluye */}
        {plans && plans.length > 0 && (
          <section className="mt-16" aria-labelledby="incluye">
            <h2 id="incluye" className="text-2xl font-bold text-[#1B2541]">
              Qué incluye cada plan
            </h2>
            <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <table className="w-full min-w-[880px] text-sm">
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
                    <td className="p-3 text-slate-600">Usuarios del equipo (desde)</td>
                    {plans.map((p) => (
                      <td key={p.code} className="p-3 text-center tabular-nums">{qty(p.quotas.users)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-600">Contactos (desde)</td>
                    {plans.map((p) => (
                      <td key={p.code} className="p-3 text-center tabular-nums">{qty(p.quotas.prospects)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Los cupos crecen con la categoría del territorio. Usuarios adicionales, almacenamiento y recargas de SMS se
              pueden contratar aparte.
            </p>
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
          <LeadForm plans={plans ?? []} selectedPlan={leadPlan} selectedTerritory={leadTerritory} candidacy={candidacy} />
        </section>
      </main>
    </div>
  );
}

function PlanCard({
  plan,
  candidacy,
  onQuote,
}: {
  plan: PublicPlan;
  candidacy: Candidacy;
  onQuote: (code: string) => void;
}) {
  const monthly = plan.rates.map((r) => r.monthly[candidacy]);
  const low = Math.min(...monthly);
  const high = Math.max(...monthly);

  return (
    <article className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-bold text-[#1B2541]">{plan.name}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 lg:min-h-[4.5rem]">{plan.description}</p>

      <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
        <p className="text-xs text-slate-400">{low === high ? 'Precio' : 'Desde'}</p>
        <p className="text-2xl font-bold tabular-nums text-[#1B2541]">
          {cop(low)}
          <span className="text-sm font-medium text-slate-500"> /mes</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {low === high ? SCOPE_HINT[plan.scope] : `Hasta ${cop(high)} · ${SCOPE_HINT[plan.scope].toLowerCase()}`}
        </p>
      </div>

      <ul className="mt-4 space-y-1 text-xs text-slate-600">
        <li className="flex justify-between"><span>Usuarios</span><span className="tabular-nums">desde {qty(plan.quotas.users)}</span></li>
        <li className="flex justify-between"><span>Contactos</span><span className="tabular-nums">desde {qty(plan.quotas.prospects)}</span></li>
        <li className="flex justify-between"><span>Correos/mes</span><span className="tabular-nums">desde {qty(plan.quotas.email)}</span></li>
        <li className="flex justify-between"><span>SMS/mes</span><span className="tabular-nums">desde {qty(plan.quotas.sms)}</span></li>
      </ul>

      <button
        onClick={() => onQuote(plan.code)}
        className="mt-5 rounded-lg bg-[#1B2541] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1B2541]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2541]"
      >
        {plan.scope === 'NONE' || plan.scope === 'NATIONAL' ? 'Ver precio por término' : 'Cotizar mi territorio'}
      </button>
    </article>
  );
}

function Quoter({
  plans,
  candidacy,
  planCode,
  onPlanChange,
  onWant,
}: {
  plans: PublicPlan[];
  candidacy: Candidacy;
  planCode: string;
  onPlanChange: (code: string) => void;
  onWant: (code: string, territory?: string) => void;
}) {
  const plan = plans.find((p) => p.code === planCode) ?? null;
  const [picked, setPicked] = useState<TerritoryChoice | null>(null);
  const [result, setResult] = useState<{ key: string; quote: PublicQuote | null; error: string | null } | null>(null);

  const needsTerritory = plan ? plan.scope !== 'NONE' && plan.scope !== 'NATIONAL' : false;

  // Un territorio de otro nivel no sirve para el plan elegido: se ignora.
  const territory = useMemo(() => {
    if (!plan || !picked || !needsTerritory) return null;
    if (plan.scope === 'MUNICIPAL') return picked.level === 'MUNICIPAL' ? picked : null;
    if (picked.level === 'DEPARTMENT') return picked;
    return plan.scope === 'CHAMBER' && picked.code === '11001' ? picked : null;
  }, [plan, picked, needsTerritory]);

  // Qué se está cotizando; el resultado se guarda con esta llave para no
  // mostrar la cotización de una selección anterior.
  const requestKey =
    plan && (!needsTerritory || territory) ? `${plan.code}|${candidacy}|${territory?.code ?? ''}` : null;

  useEffect(() => {
    if (!requestKey || !plan) return;
    let cancelled = false;
    getPublicQuote({ plan: plan.code, candidacy, territory: territory?.code })
      .then((quote) => !cancelled && setResult({ key: requestKey, quote, error: null }))
      .catch((err) => {
        if (cancelled) return;
        const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
        setResult({
          key: requestKey,
          quote: null,
          error: (Array.isArray(msg) ? msg[0] : msg) || 'No pudimos cotizar este territorio. Escríbenos y lo revisamos.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, plan, candidacy, territory]);

  const current = result && result.key === requestKey ? result : null;
  const loading = Boolean(requestKey) && !current;
  const quote = current?.quote ?? null;
  const error = current?.error ?? null;

  const select =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#1B2541] focus:outline-none focus:ring-2 focus:ring-[#1B2541]/20';

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 id="cotizar-titulo" className="text-2xl font-bold text-[#1B2541]">
        Cotiza con tu municipio o departamento
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        El precio y los cupos salen de la categoría fiscal de tu territorio. Elige el plan y el lugar.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">Plan</span>
          <select className={select} value={planCode} onChange={(e) => onPlanChange(e.target.value)}>
            <option value="">Selecciona un plan</option>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium">Territorio</span>
          {plan ? (
            <TerritoryPicker scope={plan.scope} value={territory} onChange={setPicked} search={searchPublicTerritories} />
          ) : (
            <p className="rounded-md border border-dashed px-3 py-2.5 text-sm text-slate-400">Primero elige un plan.</p>
          )}
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}
      {error && !loading && (
        <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          {error}
        </p>
      )}
      {quote && !loading && (
        <div className="mt-6 grid gap-6 border-t border-slate-100 pt-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              {quote.territory ? territoryName(quote.territory) : 'Cualquier ubicación'} · {CATEGORY_LABEL(quote.category)}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#1B2541]">
              {cop(quote.monthlyPrice)}
              <span className="text-base font-medium text-slate-500"> /mes</span>
            </p>
            <table className="mt-4 w-full text-sm">
              <tbody>
                {quote.terms.map((t) => (
                  <tr key={t.termMonths} className="border-t border-slate-100">
                    <td className="py-2 text-slate-600">
                      {t.termMonths} meses{t.discountPercent ? ` (−${t.discountPercent} %)` : ''}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">{cop(t.totalWithoutVat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-slate-400">Totales del contrato, sin IVA.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Incluye cada mes</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li className="flex justify-between"><span>Usuarios del equipo</span><span className="tabular-nums">{qty(quote.quotas.users)}</span></li>
              <li className="flex justify-between"><span>Contactos</span><span className="tabular-nums">{qty(quote.quotas.prospects)}</span></li>
              <li className="flex justify-between"><span>Almacenamiento</span><span className="tabular-nums">{qty(quote.quotas.storageGb)} GB</span></li>
              <li className="flex justify-between"><span>Correos</span><span className="tabular-nums">{qty(quote.quotas.email)}</span></li>
              <li className="flex justify-between"><span>SMS</span><span className="tabular-nums">{qty(quote.quotas.sms)}</span></li>
              <li className="flex justify-between"><span>Acompañamiento</span><span className="tabular-nums">{quote.quotas.supportHours} h</span></li>
            </ul>
            <button
              onClick={() => onWant(quote.plan.code, quote.territory ? territoryName(quote.territory) : undefined)}
              className="mt-5 w-full rounded-lg bg-[#1B2541] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1B2541]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2541]"
            >
              Quiero este plan
            </button>
          </div>
        </div>
      )}
    </div>
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
              {includes(p, item.module) ? (
                <>
                  <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Incluido" />
                  {/* Cobertura real del Radar para este cargo. */}
                  {item.module === RADAR_MODULE && (
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                      {p.radarCoverage.length ? p.radarCoverage.join(', ') : 'Próximamente para este cargo'}
                    </span>
                  )}
                </>
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
  selectedTerritory,
  candidacy,
}: {
  plans: PublicPlan[];
  selectedPlan: string;
  selectedTerritory: string;
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

  // Al elegir un plan (y territorio) desde el cotizador, se preselecciona aquí.
  useEffect(() => {
    if (!selectedPlan) return;
    const plan = plans.find((p) => p.code === selectedPlan);
    setForm((f) => ({
      ...f,
      commercialPlanCode: selectedPlan,
      officeType: plan?.officeType ?? f.officeType,
      territory: selectedTerritory || f.territory,
    }));
  }, [selectedPlan, selectedTerritory, plans]);

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
