import Link from 'next/link';

// Página 404 propia (Fase 2 "Confiabilidad"): antes se mostraba la de Next.js
// en inglés, sin salida hacia la plataforma.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <p className="text-5xl font-bold text-foreground">404</p>
      <p className="text-lg font-medium text-slate-800">No encontramos esta página</p>
      <p className="max-w-md text-sm text-slate-500">
        Puede que el enlace esté incompleto o que ya no exista.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
