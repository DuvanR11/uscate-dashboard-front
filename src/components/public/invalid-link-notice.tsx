import { Link2Off } from 'lucide-react';

/**
 * Lo que ve quien abre un enlace público que no corresponde a ninguna
 * organización ni invitación. Antes esas páginas mostraban el formulario
 * completo y solo fallaban al enviar (o, peor, lo aceptaban).
 */
export function InvalidLinkNotice({
  title = 'Este enlace no es válido',
  description = 'Revisa que la dirección esté completa o pídele a quien te la compartió que te la envíe de nuevo.',
  fullScreen = true,
}: {
  title?: string;
  description?: string;
  /** `false` cuando la página ya pone su propio fondo y centrado. */
  fullScreen?: boolean;
}) {
  const card = (
    <div
      role="alert"
      className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Link2Off className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );

  if (!fullScreen) return card;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      {card}
    </div>
  );
}
