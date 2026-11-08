'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Newspaper, ShieldCheck } from 'lucide-react';
import { getPublicPressPlans, type PublicPressPlan } from '@/lib/api/public-plans';

// Zyron Prensa, Fase 5 (2026-11-08, docs/pendientes/PLAN-MEMBRESIA-PERIODISTAS-2026-11-08.md).
// La membresía para periodistas en /planes. Precios, totales y cupos llegan
// de `GET /public/plans/press`; lo incluido se marca con los MÓDULOS REALES
// del plan (`plan.modules`), nunca con una lista fija.

const cop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const qty = (value: number) => new Intl.NumberFormat('es-CO').format(value);

const PRESS_BENEFITS: { label: string; module: string }[] = [
  { label: 'Radar Legislativo: proyectos, etapas, fichas con IA y alertas', module: 'PROYECTOS_LEY' },
  { label: 'Monitoreo de medios y menciones', module: 'MONITOREO_PREDICTIVO' },
  { label: 'Análisis de comentarios en redes', module: 'ESTADISTICAS_REDES' },
  { label: 'Investigaciones OSINT en fuentes públicas (SECOP, Procuraduría, Contraloría, RUES y más) con Deep Search', module: 'OSINT_CASOS' },
  { label: 'Documentos con lectura OCR (gacetas, contratos, respuestas)', module: 'GESTION_DOCUMENTAL' },
  { label: 'Derechos de petición y de acceso a la información (leyes 1755 y 1712) con plazos y borrador', module: 'PETICIONES' },
];

const corporations = (limit: number | null) =>
  limit === null
    ? 'Cámara, Senado y las corporaciones que elijas'
    : `Cámara, Senado y ${limit === 1 ? '1 concejo o asamblea' : `hasta ${limit} concejos o asambleas`}`;

export function PressPlansSection() {
  const [plans, setPlans] = useState<PublicPressPlan[]>([]);

  useEffect(() => {
    getPublicPressPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  if (plans.length === 0) return null;

  return (
    <section id="prensa" className="mt-16 scroll-mt-6" aria-labelledby="prensa-titulo">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
          <Newspaper className="h-3.5 w-3.5" /> Zyron Prensa
        </p>
        <h2 id="prensa-titulo" className="mt-3 text-2xl font-bold text-foreground">
          Para periodistas y salas de redacción
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          La parte de Zyron que sirve para vigilar el poder, sin la que sirve para hacer campaña: sin contactos, sin
          difusiones y sin movilización. Verificamos que haces periodismo con tres trabajos publicados o una constancia
          de tu medio (en Colombia no se exige carné), y después tienes 7 días de prueba.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const annual = plan.termTotals.find((t) => t.termMonths === 12);
            return (
              <article key={plan.code} className="flex flex-col rounded-xl border border-slate-200 p-5" aria-label={plan.name}>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                {plan.description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{plan.description}</p>}
                <p className="mt-4 text-2xl font-bold tabular-nums text-foreground">
                  {cop(plan.fromMonthly)}
                  <span className="text-sm font-medium text-slate-500"> /mes</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {annual
                    ? `O ${cop(annual.total)} al año (−${annual.discountPercent} %). Sin IVA y sin cuota de alta.`
                    : 'Sin IVA y sin cuota de alta.'}
                </p>

                <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
                  {PRESS_BENEFITS.filter((b) => plan.modules.includes(b.module)).map((b) => (
                    <li key={b.module} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      <span>{b.module === 'PROYECTOS_LEY' ? `${b.label} de ${corporations(plan.radarBodiesLimit)}` : b.label}</span>
                    </li>
                  ))}
                </ul>

                <ul className="mt-4 space-y-1 border-t border-dashed border-slate-200 pt-4 text-xs text-slate-600">
                  <Row label="Personas con cuenta" value={qty(plan.quotas.users)} />
                  {plan.quotas.monitoringSources ? (
                    <Row
                      label="Fuentes / etiquetas de monitoreo"
                      value={`${qty(plan.quotas.monitoringSources)} / ${plan.monitoringKeywords ? qty(plan.monitoringKeywords) : 'sin tope'}`}
                    />
                  ) : null}
                  {plan.quotas.deepSearchWeekly ? <Row label="Deep Search por semana" value={qty(plan.quotas.deepSearchWeekly)} /> : null}
                  {plan.quotas.aiCredits ? <Row label="Créditos de IA al mes" value={qty(plan.quotas.aiCredits)} /> : null}
                  {plan.quotas.ocrPages ? <Row label="Páginas de OCR al mes" value={qty(plan.quotas.ocrPages)} /> : null}
                  <Row label="Almacenamiento" value={`${qty(plan.quotas.storageGb)} GB`} />
                </ul>

                <div className="mt-auto pt-5">
                  <Link
                    href={`/solicitud-prensa?plan=${plan.code}`}
                    className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Solicitar {plan.name}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-slate-500">
          <Link href="/confianza#prensa" className="inline-flex items-center gap-1 underline hover:text-slate-700">
            <ShieldCheck className="h-4 w-4" /> Qué ve y qué no ve Zyron de tu trabajo
          </Link>
        </p>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </li>
  );
}
