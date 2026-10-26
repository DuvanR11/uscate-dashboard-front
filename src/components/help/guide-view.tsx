import { Fragment } from 'react';
import type { Guide, GuideStep } from '@/lib/help-guides';

/** Texto de las guías: **así** va en negrita (mismo formato que los PDF). */
export function GuideText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

/**
 * Captura de un paso con su franja visible (`a`–`b`), igual que en los PDF:
 * el marco tiene la proporción de la franja y la imagen se corre hacia arriba
 * (el margen en % se mide sobre el ancho, por eso sirve para recortar).
 */
function StepShot({ step, index }: { step: GuideStep; index: number }) {
  if (!step.img || !step.w || !step.h) return null;
  const a = step.a ?? 0;
  const b = step.b ?? 1;
  const visible = step.h * (b - a);
  const tall = step.phone || visible / step.w > 1;
  const width = step.phone ? 260 : tall ? Math.min(360, step.w) : Math.min(step.w, 760);
  return (
    <figure className="max-w-full" style={{ width: `min(100%, ${width}px)` }}>
      <div
        className={
          step.phone
            ? 'overflow-hidden rounded-[22px] border-[7px] border-ink bg-white'
            : 'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'
        }
        style={{ aspectRatio: `${step.w} / ${visible}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/guias/capturas/${step.img}.webp`}
          alt={`Pantalla del paso ${index + 1}`}
          loading="lazy"
          className="block w-full"
          style={{ marginTop: `-${((step.h * a) / step.w) * 100}%` }}
        />
      </div>
    </figure>
  );
}

export function GuideView({ guide }: { guide: Guide }) {
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Guía {guide.n} · {guide.audience} · {guide.minutes} min
        </p>
        <h1 className="text-2xl font-bold text-foreground">{guide.title}</h1>
        <p className="text-slate-600">
          <GuideText text={guide.lead} />
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Qué necesitas</h2>
        <GuideText text={guide.need} />
      </section>

      <ol className="space-y-6">
        {guide.steps.map((step, i) => {
          const tall = !!step.img && (step.phone || (step.h ?? 0) * ((step.b ?? 1) - (step.a ?? 0)) / (step.w ?? 1) > 1);
          return (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
              >
                {i + 1}
              </span>
              <div className={`min-w-0 flex-1 gap-4 ${tall ? 'grid items-start md:grid-cols-[minmax(0,1fr)_auto]' : 'space-y-3'}`}>
                <p className="leading-relaxed text-slate-700">
                  <span className="sr-only">Paso {i + 1}: </span>
                  <GuideText text={step.t} />
                </p>
                <StepShot step={step} index={i} />
              </div>
            </li>
          );
        })}
      </ol>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <h2 className="mb-1 text-sm font-semibold">Resultado</h2>
        <GuideText text={guide.result} />
      </section>
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h2 className="mb-1 text-sm font-semibold">Si algo falla</h2>
        <GuideText text={guide.fail} />
      </section>
    </article>
  );
}
