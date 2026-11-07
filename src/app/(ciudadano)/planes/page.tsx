'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, CheckCircle2, Loader2, Minus, ShieldCheck, Sparkles } from 'lucide-react';
import {
  getLeadConsent,
  getPublicAddons,
  getPublicPlans,
  getPublicQuote,
  getPublicSuggestion,
  searchPublicTerritories,
  submitLead,
  type Candidacy,
  type LevelOffice,
  type OfficeType,
  type PublicAddon,
  type PublicPlan,
  type PublicQuote,
  type PublicSuggestion,
} from '@/lib/api/public-plans';
import { TerritoryPicker, type TerritoryChoice } from '@/components/billing/territory-picker';

// Página pública de planes. Entrega 4c del plan de finanzas (2026-11-06):
// catálogo por nivel. Quien ya tiene el cargo elige un plan A (A0–A4) y una
// campaña un plan B (B0–B4); el precio es fijo y no depende del municipio.
// Los precios NUNCA se escriben ni se calculan aquí: llegan de
// `GET /public/plans`, `/public/plans/quote` y `/public/plans/addons`,
// calculados por el backend desde el mismo catálogo con el que se cobra. La
// página muestra solo los planes por nivel; los territoriales del 30-sep ya
// no se publican (quien está en uno lo renueva con el operador).

const cop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const qty = (value: number) => new Intl.NumberFormat('es-CO').format(value);
const hours = (value: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value);
// Tarifa del IVA con coma decimal y espacio antes del signo (19 %).
const percent = (rate: number) => `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(rate * 100)} %`;

const PROFILE_LABEL: Record<Candidacy, string> = {
  ACTIVO: 'Ya tengo el cargo',
  ASPIRANTE: 'Voy a una elección',
};

const PROFILE_HINT: Record<Candidacy, string> = {
  ACTIVO: 'Planes de despacho para quien ejerce: edil, concejal, diputado o congresista.',
  ASPIRANTE: 'Planes de campaña para quien aspira, desde la precampaña hasta el día de la elección.',
};

const PRICE_NOTE: Record<Candidacy, string> = {
  // Tarea 3.9 (2026-11-07): la suscripción no lleva IVA; la cuota de alta,
  // los paquetes y los complementos sí.
  ACTIVO: 'Precios mensuales en pesos colombianos. La suscripción no lleva IVA. Pagas mes a mes o un año completo con 10 % de descuento, sin permanencia.',
  ASPIRANTE:
    'Precios mensuales en pesos colombianos. La suscripción no lleva IVA. Pagas mes a mes en la precampaña o compras el Pase Electoral: 5 meses con 10 % de descuento en un solo pago, pensado para julio a noviembre de 2027. La cuota de alta se paga una sola vez y lleva IVA (19 %).',
};

const OFFICE_LABEL: Record<OfficeType, string> = {
  CONCEJO: 'Concejo',
  ASAMBLEA: 'Asamblea departamental',
  ALCALDIA: 'Alcaldía',
  GOBERNACION: 'Gobernación',
  CONGRESO: 'Congreso',
};

// Cargos con los que la API sugiere el plan. Edil y Cámara/Senado no
// dependen del territorio; Concejo, Alcaldía y Asamblea sí (su categoría).
const LEVEL_OFFICE_LABEL: Record<LevelOffice, string> = {
  EDIL: 'Edil o JAL',
  CONCEJO: 'Concejo',
  ASAMBLEA: 'Asamblea departamental',
  ALCALDIA: 'Alcaldía',
  GOBERNACION: 'Gobernación',
  CAMARA: 'Cámara de Representantes',
  SENADO: 'Senado',
};
const OFFICE_SCOPE: Partial<Record<LevelOffice, 'MUNICIPAL' | 'DEPARTMENT'>> = {
  CONCEJO: 'MUNICIPAL',
  ALCALDIA: 'MUNICIPAL',
  ASAMBLEA: 'DEPARTMENT',
};

const termName = (months: number) =>
  months === 1 ? 'Mensual' : months === 5 ? 'Pase Electoral (5 meses)' : months === 12 ? 'Anual (12 meses)' : `${months} meses`;

// Qué incluye cada plan: cada fila se marca con los MÓDULOS REALES del plan
// (`plan.modules`, del backend), no con niveles fijos. `module` es el código
// que hace cumplir el backend.
const RADAR_MODULE = 'PROYECTOS_LEY';
const MONITORING_MODULE = 'MONITOREO_PREDICTIVO';
const OSINT_MODULE = 'OSINT_CASOS';

const BENEFITS: { group: string; items: { label: string; module: string }[] }[] = [
  {
    group: 'CRM y territorio',
    items: [
      { label: 'Contactos, agenda y mapa territorial', module: 'PROSPECTOS' },
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
      { label: 'Monitoreo predictivo de menciones', module: MONITORING_MODULE },
      { label: 'Investigación OSINT (17 fuentes públicas)', module: OSINT_MODULE },
      { label: 'Análisis de comentarios en YouTube, Facebook e Instagram', module: 'ESTADISTICAS_REDES' },
    ],
  },
  {
    group: 'Plan de gobierno',
    items: [
      {
        label: 'Diagnóstico del territorio con datos oficiales, propuestas con IA y documento para inscribir',
        module: 'PLAN_GOBIERNO',
      },
    ],
  },
  {
    group: 'Cumplimiento legal',
    items: [{ label: 'Habeas Data (Ley 1581) y finanzas de campaña (Ley 1475)', module: 'HABEAS_DATA' }],
  },
];

const includes = (plan: PublicPlan, module: string) => plan.modules.includes(module);
/** Complemento que activa ese módulo en el plan, si se vende aparte. */
const addonFor = (plan: PublicPlan, module: string) => plan.moduleAddons?.find((a) => a.module === module) ?? null;

// Filas de cupos de la tabla comparativa. `null` en la celda = no aplica
// (se pinta como "no incluido").
const QUOTA_ROWS: { label: string; value: (p: PublicPlan) => string | null }[] = [
  { label: 'Usuarios del equipo', value: (p) => qty(p.quotas.users) },
  { label: 'Contactos', value: (p) => qty(p.quotas.prospects) },
  { label: 'Almacenamiento', value: (p) => `${qty(p.quotas.storageGb)} GB` },
  { label: 'Correos al mes', value: (p) => qty(p.quotas.email) },
  { label: 'SMS al mes', value: (p) => qty(p.quotas.sms) },
  { label: 'Créditos de IA al mes', value: (p) => (p.quotas.aiCredits ? qty(p.quotas.aiCredits) : null) },
  { label: 'Automatizaciones activas', value: (p) => (p.quotas.journeys ? qty(p.quotas.journeys) : null) },
  {
    label: 'Fuentes de monitoreo',
    value: (p) =>
      includes(p, MONITORING_MODULE) ? (p.quotas.monitoringSources ? qty(p.quotas.monitoringSources) : 'Sin tope') : null,
  },
  {
    label: 'Búsquedas profundas (Deep Search) por semana',
    value: (p) =>
      includes(p, OSINT_MODULE) && p.quotas.deepSearchWeekly ? qty(p.quotas.deepSearchWeekly) : null,
  },
  { label: 'Páginas de OCR al mes', value: (p) => (p.quotas.ocrPages ? qty(p.quotas.ocrPages) : null) },
  {
    label: 'Implementación guiada (una vez)',
    value: (p) => (p.quotas.onboardingHours ? `${hours(p.quotas.onboardingHours)} h` : null),
  },
];

export default function PlanesPage() {
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  const [addons, setAddons] = useState<PublicAddon[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [candidacy, setCandidacy] = useState<Candidacy>('ACTIVO');
  const [suggested, setSuggested] = useState<string | null>(null);
  const [quotePlan, setQuotePlan] = useState<string>('');
  const [leadPlan, setLeadPlan] = useState<string>('');

  useEffect(() => {
    getPublicPlans()
      .then((all) => setPlans(all.filter((p) => p.pricingModel === 'LEVEL' && p.candidacy)))
      .catch(() => setLoadError(true));
    getPublicAddons()
      .then(setAddons)
      .catch(() => setAddons([]));
  }, []);

  const visible = useMemo(() => (plans ?? []).filter((p) => p.candidacy === candidacy), [plans, candidacy]);

  const changeProfile = (c: Candidacy) => {
    setCandidacy(c);
    setSuggested(null);
    setQuotePlan('');
  };

  const goToQuote = (code: string) => {
    setQuotePlan(code);
    document.getElementById('cotizar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToLead = (code: string) => {
    setLeadPlan(code);
    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Encabezado */}
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Image src="/brand/zyron-logo-on-dark.svg" alt="Zyron" width={144} height={32} unoptimized priority className="h-8 w-auto" />
            <Link href="/login" className="text-sm text-slate-300 hover:text-white">
              Iniciar sesión
            </Link>
          </div>
          <h1 className="mt-10 max-w-3xl text-3xl font-bold leading-tight text-balance sm:text-4xl">
            Un plan para cada etapa: en el cargo o en campaña.
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">
            CRM territorial, movilización, despacho e inteligencia para ediles, concejales, diputados, alcaldes,
            gobernadores y congresistas. Precio fijo por plan, el mismo en cualquier municipio, y sin permanencia.
          </p>

          <div className="mt-8">
            <ProfileToggle value={candidacy} onChange={changeProfile} tone="dark" />
            <p className="mt-3 max-w-2xl text-sm text-slate-300">{PROFILE_HINT[candidacy]}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-16 max-w-6xl px-4 sm:px-6">
        {/* Qué plan me sirve */}
        <PlanFinder candidacy={candidacy} plans={visible} onSuggested={setSuggested} onQuote={goToQuote} onContact={() => goToLead('')} />

        {/* Planes */}
        {loadError ? (
          <div className="mt-6 rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            No pudimos cargar los planes en este momento. Escríbenos por el formulario de abajo y te enviamos la
            información.
          </div>
        ) : !plans ? (
          <div className="mt-6 flex justify-center rounded-xl bg-white py-16 shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-6 rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            Estamos actualizando estos planes. Escríbenos por el formulario de abajo y te enviamos la información.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {visible.map((plan) => (
              <PlanCard key={plan.code} plan={plan} highlighted={plan.code === suggested} onQuote={goToQuote} />
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-slate-500">{PRICE_NOTE[candidacy]}</p>

        {/* Plazos y precio */}
        {visible.length > 0 && (
          <section id="cotizar" className="mt-16 scroll-mt-6" aria-labelledby="cotizar-titulo">
            <Quoter plans={visible} candidacy={candidacy} planCode={quotePlan} onPlanChange={setQuotePlan} onWant={goToLead} />
          </section>
        )}

        {/* Qué incluye */}
        {visible.length > 0 && (
          <section className="mt-16" aria-labelledby="incluye">
            <h2 id="incluye" className="text-2xl font-bold text-foreground">
              Qué incluye cada plan
            </h2>
            <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="p-3 font-semibold text-slate-500">Funcionalidad</th>
                    {visible.map((p) => (
                      <th key={p.code} className="p-3 text-center font-semibold text-foreground">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BENEFITS.map((group) => (
                    <GroupRows key={group.group} group={group} plans={visible} />
                  ))}
                  <tr className="bg-slate-50">
                    <td colSpan={visible.length + 1} className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Capacidad
                    </td>
                  </tr>
                  {QUOTA_ROWS.map((row) => (
                    <tr key={row.label} className="border-t border-slate-100">
                      <td className="p-3 text-slate-600">{row.label}</td>
                      {visible.map((p) => {
                        const value = row.value(p);
                        return (
                          <td key={p.code} className="p-3 text-center tabular-nums">
                            {value ?? <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="No incluido" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Los cupos de envío y de IA se renuevan cada mes. Si se acaban, puedes comprar un paquete de recarga.
            </p>
          </section>
        )}

        {/* Paquetes */}
        {addons.length > 0 && <AddonsSection addons={addons} />}

        {/* Garantías */}
        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            ['Garantía de 30 días', 'Si en los primeros 30 días del primer pago decides que no es para ti, te devolvemos el dinero.'],
            ['Tus datos son tuyos', 'Al terminar el servicio te entregamos una exportación completa de la información de tu campaña.'],
            ['Cumplimiento legal', 'Consentimiento real de Habeas Data, portal de derechos para ciudadanos y registro de aportes y gastos de campaña.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="font-bold text-foreground">{title}</h3>
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
          <LeadForm plans={plans ?? []} selectedPlan={leadPlan} candidacy={candidacy} onCandidacyChange={changeProfile} />
        </section>
      </main>
    </div>
  );
}

function ProfileToggle({
  value,
  onChange,
  tone,
}: {
  value: Candidacy;
  onChange: (c: Candidacy) => void;
  tone: 'dark' | 'light';
}) {
  const dark = tone === 'dark';
  return (
    <div role="radiogroup" aria-label="Tu etapa" className={`inline-flex flex-wrap rounded-lg p-1 ${dark ? 'bg-white/10' : 'bg-slate-100'}`}>
      {(['ACTIVO', 'ASPIRANTE'] as const).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 ${
            dark
              ? `focus-visible:outline-secondary ${value === c ? 'bg-secondary text-foreground' : 'text-slate-200 hover:text-white'}`
              : `focus-visible:outline-primary ${value === c ? 'bg-white text-foreground shadow-sm' : 'text-slate-500 hover:text-slate-800'}`
          }`}
        >
          {PROFILE_LABEL[c]}
        </button>
      ))}
    </div>
  );
}

function PlanFinder({
  candidacy,
  plans,
  onSuggested,
  onQuote,
  onContact,
}: {
  candidacy: Candidacy;
  plans: PublicPlan[];
  onSuggested: (code: string | null) => void;
  onQuote: (code: string) => void;
  onContact: () => void;
}) {
  const [office, setOffice] = useState<LevelOffice | ''>('');
  const [picked, setPicked] = useState<TerritoryChoice | null>(null);
  const [result, setResult] = useState<{ key: string; suggestion: PublicSuggestion | null; failed: boolean } | null>(null);

  const scope = office ? OFFICE_SCOPE[office] : undefined;
  const territory = scope && picked && picked.level === scope ? picked : null;
  const requestKey = office ? `${office}|${candidacy}|${territory?.code ?? ''}` : null;

  useEffect(() => {
    if (!office || !requestKey) return;
    let cancelled = false;
    getPublicSuggestion({ office, candidacy, territory: territory?.code })
      .then((suggestion) => {
        if (cancelled) return;
        setResult({ key: requestKey, suggestion, failed: false });
        onSuggested(suggestion?.code ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ key: requestKey, suggestion: null, failed: true });
        onSuggested(null);
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, office, candidacy, territory, onSuggested]);

  const current = result && result.key === requestKey ? result : null;
  const suggestion = current?.suggestion ?? null;
  const plan = suggestion?.code ? plans.find((p) => p.code === suggestion.code) : null;
  const alternative = suggestion?.alternative ? plans.find((p) => p.code === suggestion.alternative) : null;

  const select =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8" aria-labelledby="buscador-titulo">
      <h2 id="buscador-titulo" className="text-xl font-bold text-foreground">
        ¿Qué plan me sirve?
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Dinos {candidacy === 'ASPIRANTE' ? 'a qué cargo aspiras' : 'qué cargo tienes'} y te sugerimos el plan. El
        territorio solo ayuda a elegir el tamaño; no cambia el precio.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">Cargo</span>
          <select
            className={select}
            value={office}
            onChange={(e) => {
              setOffice(e.target.value as LevelOffice | '');
              setPicked(null);
              if (!e.target.value) onSuggested(null);
            }}
          >
            <option value="">Selecciona el cargo</option>
            {(Object.keys(LEVEL_OFFICE_LABEL) as LevelOffice[]).map((o) => (
              <option key={o} value={o}>
                {LEVEL_OFFICE_LABEL[o]}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium">
            {scope === 'DEPARTMENT' ? 'Departamento' : 'Municipio'} (opcional)
          </span>
          {scope ? (
            <TerritoryPicker scope={scope} value={territory} onChange={setPicked} search={searchPublicTerritories} />
          ) : (
            <p className="rounded-md border border-dashed px-3 py-2.5 text-sm text-slate-400">
              {office ? 'Este cargo no depende del territorio.' : 'Primero elige el cargo.'}
            </p>
          )}
        </div>
      </div>

      {office && !current && (
        <div className="mt-5 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}
      {current?.failed && (
        <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          No pudimos sugerirte un plan en este momento. Escríbenos y te ayudamos a elegir.
        </p>
      )}
      {current && suggestion && (
        <div className="mt-5 rounded-lg bg-primary/5 p-4 text-sm ring-1 ring-primary/20">
          {plan ? (
            <>
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Te sugerimos {plan.name}
              </p>
              <p className="mt-1 text-slate-600">{suggestion.reason}</p>
              {alternative && <p className="mt-1 text-slate-600">También puede servirte {alternative.name}.</p>}
              <button
                type="button"
                onClick={() => onQuote(plan.code)}
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Ver plazos y precio
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">Licencia institucional</p>
              <p className="mt-1 text-slate-600">
                {/* La API dice "referencia A2/A3": aquí se explica sin códigos. */}
                Para una alcaldía o una gobernación en ejercicio, Zyron se contrata como licencia de la entidad, con
                una cotización a la medida que incluye la implementación.
              </p>
              <button
                type="button"
                onClick={onContact}
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Pedir una cotización
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function PlanCard({
  plan,
  highlighted,
  onQuote,
}: {
  plan: PublicPlan;
  highlighted: boolean;
  onQuote: (code: string) => void;
}) {
  const quotas = plan.quotas;
  return (
    <article
      className={`flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ${highlighted ? 'ring-2 ring-primary' : 'ring-slate-200'}`}
      aria-label={highlighted ? `${plan.name} (sugerido)` : plan.name}
    >
      {highlighted && (
        <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          <Sparkles className="h-3 w-3" /> Sugerido
        </span>
      )}
      <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 lg:min-h-[6rem]">{plan.description}</p>

      <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {cop(plan.fromMonthly)}
          <span className="text-sm font-medium text-slate-500"> /mes</span>
        </p>
        {plan.setupFee ? (
          <p className="mt-1 text-xs text-slate-500">Más {cop(plan.setupFee)} + IVA de alta, una sola vez</p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">Sin cuota de alta</p>
        )}
      </div>

      <ul className="mt-4 space-y-1 text-xs text-slate-600">
        <li className="flex justify-between gap-2"><span>Usuarios</span><span className="tabular-nums">{qty(quotas.users)}</span></li>
        <li className="flex justify-between gap-2"><span>Contactos</span><span className="tabular-nums">{qty(quotas.prospects)}</span></li>
        <li className="flex justify-between gap-2"><span>Correos/mes</span><span className="tabular-nums">{qty(quotas.email)}</span></li>
        <li className="flex justify-between gap-2"><span>SMS/mes</span><span className="tabular-nums">{qty(quotas.sms)}</span></li>
        {quotas.aiCredits ? (
          <li className="flex justify-between gap-2"><span>Créditos de IA/mes</span><span className="tabular-nums">{qty(quotas.aiCredits)}</span></li>
        ) : null}
      </ul>

      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={() => onQuote(plan.code)}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ver plazos y precio
        </button>
      </div>
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
  onWant: (code: string) => void;
}) {
  const plan = plans.find((p) => p.code === planCode) ?? null;
  const [result, setResult] = useState<{ key: string; quote: PublicQuote | null; error: string | null } | null>(null);
  const requestKey = plan ? `${plan.code}|${candidacy}` : null;

  useEffect(() => {
    if (!requestKey || !plan) return;
    let cancelled = false;
    getPublicQuote({ plan: plan.code, candidacy })
      .then((quote) => !cancelled && setResult({ key: requestKey, quote, error: null }))
      .catch((err) => {
        if (cancelled) return;
        const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
        setResult({
          key: requestKey,
          quote: null,
          error: (Array.isArray(msg) ? msg[0] : msg) || 'No pudimos cotizar este plan. Escríbenos y lo revisamos.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, plan, candidacy]);

  const current = result && result.key === requestKey ? result : null;
  const loading = Boolean(requestKey) && !current;
  const quote = current?.quote ?? null;
  // Tarea 3.9: con cuota de alta, el primer pago (plazo + alta + IVA de la alta) lo calcula la API.
  const firstPayment = Boolean(quote?.setupFee && quote.terms.some((t) => t.firstPaymentTotal !== undefined));
  const error = current?.error ?? null;

  const select =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 id="cotizar-titulo" className="text-2xl font-bold text-foreground">
        Plazos y precio
      </h2>
      <p className="mt-1 text-sm text-slate-500">Elige el plan y mira cuánto pagas según el plazo.</p>

      <label className="mt-6 block max-w-md">
        <span className="mb-1 block text-sm font-medium">Plan</span>
        <select className={select} value={planCode} onChange={(e) => onPlanChange(e.target.value)}>
          <option value="">Selecciona un plan</option>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

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
            <p className="text-sm text-slate-500">{quote.plan.name}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
              {cop(quote.monthlyPrice)}
              <span className="text-base font-medium text-slate-500"> /mes</span>
            </p>
            <table className="mt-4 w-full text-sm">
              {firstPayment && (
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th className="py-1 text-left font-medium">Plazo</th>
                    <th className="py-1 text-right font-medium">Valor</th>
                    <th className="py-1 text-right font-medium">Primer pago</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {quote.terms.map((t) => (
                  <tr key={t.termMonths} className="border-t border-slate-100">
                    <td className="py-2 text-slate-600">
                      {termName(t.termMonths)}
                      {t.discountPercent ? ` (−${t.discountPercent} %)` : ''}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">{cop(t.subscriptionAmount ?? t.totalWithoutVat)}</td>
                    {firstPayment && (
                      <td className="py-2 pl-3 text-right tabular-nums text-slate-600">
                        {t.firstPaymentTotal !== undefined ? cop(t.firstPaymentTotal) : '—'}
                      </td>
                    )}
                  </tr>
                ))}
                {quote.setupFee ? (
                  <tr className="border-t border-slate-100">
                    <td className="py-2 text-slate-600">
                      Cuota de alta (una sola vez)
                      {quote.setupVatAmount ? (
                        <span className="block text-xs text-slate-400">+ IVA {cop(quote.setupVatAmount)}</span>
                      ) : (
                        <span className="block text-xs text-slate-400">+ IVA</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">{cop(quote.setupFee)}</td>
                    {firstPayment && <td />}
                  </tr>
                ) : null}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-slate-400">
              La suscripción no lleva IVA.
              {quote.setupFee
                ? ` La cuota de alta lleva IVA (${percent(quote.vatRate ?? 0.19)}) y va solo en el primer pago.`
                : ''}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Incluye</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li className="flex justify-between gap-2"><span>Usuarios del equipo</span><span className="tabular-nums">{qty(quote.quotas.users)}</span></li>
              <li className="flex justify-between gap-2"><span>Contactos</span><span className="tabular-nums">{qty(quote.quotas.prospects)}</span></li>
              <li className="flex justify-between gap-2"><span>Almacenamiento</span><span className="tabular-nums">{qty(quote.quotas.storageGb)} GB</span></li>
              <li className="flex justify-between gap-2"><span>Correos al mes</span><span className="tabular-nums">{qty(quote.quotas.email)}</span></li>
              <li className="flex justify-between gap-2"><span>SMS al mes</span><span className="tabular-nums">{qty(quote.quotas.sms)}</span></li>
              {quote.quotas.aiCredits ? (
                <li className="flex justify-between gap-2"><span>Créditos de IA al mes</span><span className="tabular-nums">{qty(quote.quotas.aiCredits)}</span></li>
              ) : null}
              {quote.quotas.journeys ? (
                <li className="flex justify-between gap-2"><span>Automatizaciones activas</span><span className="tabular-nums">{qty(quote.quotas.journeys)}</span></li>
              ) : null}
              {quote.quotas.onboardingHours ? (
                <li className="flex justify-between gap-2"><span>Implementación guiada</span><span className="tabular-nums">{hours(quote.quotas.onboardingHours)} h</span></li>
              ) : null}
            </ul>
            <button
              type="button"
              onClick={() => onWant(quote.plan.code)}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Quiero este plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddonsSection({ addons }: { addons: PublicAddon[] }) {
  const packs = addons.filter((a) => a.resource);
  const monthly = addons.filter((a) => a.monthly);
  const other = addons.filter((a) => !a.resource && !a.monthly);
  const Row = ({ addon }: { addon: PublicAddon }) => (
    <li className="flex justify-between gap-3 border-t border-slate-100 py-2 first:border-t-0">
      <span className="text-slate-600">{addon.label}</span>
      <span className="shrink-0 font-semibold tabular-nums">
        {cop(addon.unitPrice)}
        {addon.monthly ? <span className="font-normal text-slate-500">/mes</span> : null}
      </span>
    </li>
  );
  return (
    <section className="mt-16" aria-labelledby="paquetes">
      <h2 id="paquetes" className="text-2xl font-bold text-foreground">
        Recargas y complementos
      </h2>
      <p className="mt-1 text-sm text-slate-500">Se compran cuando los necesitas, con cualquier plan. Precios + IVA (19 %).</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="font-bold text-foreground">Paquetes de recarga</h3>
          <p className="mt-1 text-xs text-slate-500">
            Valen 90 días y se usan solo cuando se acaba el cupo del mes de tu plan.
          </p>
          <ul className="mt-3 text-sm">
            {packs.map((a) => (
              <Row key={a.type} addon={a} />
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="font-bold text-foreground">Más capacidad cada mes</h3>
          <p className="mt-1 text-xs text-slate-500">Suben el límite de tu plan mientras los mantengas.</p>
          <ul className="mt-3 text-sm">
            {monthly.map((a) => (
              <Row key={a.type} addon={a} />
            ))}
          </ul>
          {other.length > 0 && (
            <ul className="mt-3 border-t border-slate-200 pt-1 text-sm">
              {other.map((a) => (
                <Row key={a.type} addon={a} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
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
                      {p.radarCoverage.length
                        ? `Hoy solo para: ${p.radarCoverage.join(', ')}`
                        : p.officeType
                          ? 'Próximamente para este cargo'
                          : 'Según la corporación'}
                    </span>
                  )}
                </>
              ) : addonFor(p, item.module) ? (
                <span className="block text-[11px] font-medium leading-4 text-slate-600">
                  Complemento
                  <span className="block font-normal text-slate-500">{cop(addonFor(p, item.module)!.monthlyPrice)}/mes + IVA</span>
                </span>
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
  onCandidacyChange,
}: {
  plans: PublicPlan[];
  selectedPlan: string;
  candidacy: Candidacy;
  onCandidacyChange: (c: Candidacy) => void;
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

  const profilePlans = useMemo(() => plans.filter((p) => p.candidacy === candidacy), [plans, candidacy]);

  useEffect(() => {
    getLeadConsent()
      .then((c) => setConsentText(c.text))
      .catch(() => setConsentText('Autorizo el tratamiento de mis datos personales para que me contacten (Ley 1581 de 2012).'));
  }, []);

  // Al elegir un plan desde el cotizador, se preselecciona aquí.
  useEffect(() => {
    if (!selectedPlan) return;
    const plan = plans.find((p) => p.code === selectedPlan);
    setForm((f) => ({
      ...f,
      commercialPlanCode: selectedPlan,
      officeType: plan?.officeType ?? f.officeType,
    }));
  }, [selectedPlan, plans]);

  // Un plan de la otra etapa no sirve: al cambiarla se borra.
  useEffect(() => {
    setForm((f) =>
      f.commercialPlanCode && !profilePlans.some((p) => p.code === f.commercialPlanCode)
        ? { ...f, commercialPlanCode: '' }
        : f,
    );
  }, [profilePlans]);

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
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-3 text-xl font-bold text-foreground">Recibimos tu solicitud</h2>
        <p className="mt-2 text-sm text-slate-600">Un asesor te contactará pronto para agendar una demostración.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 id="contacto-titulo" className="text-xl font-bold text-foreground">
        Agenda una demostración
      </h2>
      <p className="mt-1 text-sm text-slate-500">Déjanos tus datos y te mostramos la plataforma con un caso de tu cargo.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <span className="text-sm font-medium">Mi etapa</span>
          <ProfileToggle value={candidacy} onChange={onCandidacyChange} tone="light" />
        </div>
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
            {profilePlans.map((p) => (
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
          <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={consent}
            onChange={(e) => setConsent(e.target.checked)} />
          <span>{consentText}</span>
        </label>

        {error && <p className="text-sm font-medium text-red-600 sm:col-span-2" role="alert">{error}</p>}

        <button type="submit" disabled={sending}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60 sm:col-span-2">
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Solicitar demostración
        </button>
      </form>
    </div>
  );
}
