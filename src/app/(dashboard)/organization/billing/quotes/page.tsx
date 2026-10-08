"use client";
import Link from "next/link";
import { useState } from "react";
import { CommercialQuoteCard } from "@/components/billing/commercial-quote-card";
import { QuerySection } from "@/components/platform/query-section";
import { Button } from "@/components/ui/button";
import {
  acceptCommercialQuote,
  listMyCommercialQuotes,
} from "@/lib/api/commercial-quotes";
import { extractErrorMessage } from "@/lib/api/platform";

export default function MyCommercialQuotesPage() {
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept(id: string) {
    setBusy(true);
    setError("");
    try {
      await acceptCommercialQuote(id);
      setSelected(undefined);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(extractErrorMessage(e) ?? "No se pudo confirmar la aceptación.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <Link href="/organization/plan" className="text-primary underline">
        Volver al plan
      </Link>
      <h1 className="text-2xl font-bold">Cotizaciones para aceptar</h1>
      <Link href="/organization/billing/orders" className="inline-block text-primary underline">Ver órdenes y enviar comprobantes</Link>
      <p>
        Revisa precio, periodo y capacidades de la versión presentada. La
        aceptación registra el acuerdo; la activación requiere verificar el
        pago.
      </p>
      {error && <p role="alert">{error}</p>}
      <QuerySection
        key={revision}
        title="Tus propuestas e historial"
        load={listMyCommercialQuotes}
      >
        {(quotes) =>
          quotes.length ? (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <CommercialQuoteCard key={quote.id} quote={quote}>
                  {quote.effectiveState === "ISSUED" &&
                    (selected === quote.id ? (
                      <div className="space-y-2">
                        <p>
                          ¿Confirmas la aceptación de esta versión con el precio
                          y condiciones mostrados?
                        </p>
                        <Button
                          disabled={busy}
                          onClick={() => accept(quote.id)}
                        >
                          {busy ? "Registrando…" : "Confirmar aceptación"}
                        </Button>
                        <Button
                          disabled={busy}
                          variant="outline"
                          onClick={() => setSelected(undefined)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        disabled={busy}
                        onClick={() => setSelected(quote.id)}
                      >
                        Aceptar esta versión
                      </Button>
                    ))}
                </CommercialQuoteCard>
              ))}
            </div>
          ) : (
            <p>No tienes cotizaciones designadas para aceptar.</p>
          )
        }
      </QuerySection>
    </div>
  );
}
