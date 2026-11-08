import { RequestForm } from "@/components/dashboard/requests/request-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Monitoreo de medios, Fase 1 (2026-11-08): «Crear desde la noticia» llega
 * con `?from=monitoreo&subject=…&description=…` y deja el formulario lleno
 * como solicitud interna. Sin `from`, el formulario arranca vacío como antes.
 */
export default async function NewRequestPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const prefill =
    first(params.from) === "monitoreo"
      ? {
          subject: (first(params.subject) ?? "").slice(0, 200),
          description: (first(params.description) ?? "").slice(0, 4000),
        }
      : undefined;
  return (
    <div className="max-w-6xl mx-auto py-6">
      <RequestForm prefill={prefill} />
    </div>
  );
}
