"use client";
import { useCallback, useRef, useState } from "react";
import { CollectionOrdersPanel } from '@/components/billing/collection-orders-panel';
import { createCollectionOrder } from '@/lib/api/collection-orders';
import { isAxiosError } from "axios";
import { QuerySection } from "./query-section";
import { usePlatformCapability } from "./access-context";
import { CommercialQuoteCard } from "@/components/billing/commercial-quote-card";
import {
  issueCommercialQuote,
  listCommercialQuotes,
  listQuoteRecipients,
  type IssueQuoteInput,
  type QuoteRecipient,
} from "@/lib/api/commercial-quotes";
import {
  quotePayment,
  type PaymentQuote,
  type QuoteInput,
} from "@/lib/api/billing";
import { extractErrorMessage } from "@/lib/api/platform";
import { Button } from "@/components/ui/button";

export function CommercialQuotesPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const canManage = usePlatformCapability("MANAGEMENT_MANAGE");
  const canRead = usePlatformCapability("BILLING_READ");
  const canReview = usePlatformCapability("PAYMENT_CONFIRM");
  const [orderRevision, setOrderRevision] = useState(0);
  const [revision, setRevision] = useState(0);
  const [previous, setPrevious] = useState<string>();
  const load = useCallback(
    () => listCommercialQuotes(organizationId),
    [organizationId],
  );
  const recipients = useCallback(
    () => listQuoteRecipients(organizationId),
    [organizationId],
  );
  if (!canRead) return null;
  return (
    <div className="space-y-4">
      <p>
        Aceptar una propuesta registra el acuerdo. La activación requiere
        verificar el pago.
      </p>
      {canManage && (
        <QuerySection title="Preparar cotización" load={recipients}>
          {(people) => (
            <IssueForm
              key={`${revision}-${previous ?? ""}`}
              organizationId={organizationId}
              people={people}
              previous={previous}
              onIssued={() => {
                setPrevious(undefined);
                setRevision((n) => n + 1);
              }}
            />
          )}
        </QuerySection>
      )}
      <QuerySection
        key={revision}
        title="Historial de cotizaciones"
        load={load}
      >
        {(quotes) =>
          quotes.length ? (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <CommercialQuoteCard key={quote.id} quote={quote}>
                  {canManage && quote.effectiveState === 'ACCEPTED' && new Date(quote.expiresAt) > new Date() && <CreateOrderButton organizationId={organizationId} quoteId={quote.id} onCreated={() => setOrderRevision(n => n + 1)} />}
                  {canManage && quote.effectiveState !== "SUPERSEDED" && (
                    <Button
                      variant="outline"
                      onClick={() => setPrevious(quote.id)}
                    >
                      Preparar nueva versión
                    </Button>
                  )}
                </CommercialQuoteCard>
              ))}
            </div>
          ) : (
            <p>No hay cotizaciones registradas.</p>
          )
        }
      </QuerySection>
      <CollectionOrdersPanel organizationId={organizationId} canReview={canReview} refresh={orderRevision} />
    </div>
  );
}

function CreateOrderButton({ organizationId, quoteId, onCreated }: { organizationId: string; quoteId: string; onCreated: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function create() {
    setBusy(true); setError('');
    try { await createCollectionOrder(organizationId, quoteId); onCreated(); }
    catch (e) { setError(extractErrorMessage(e) ?? 'No se pudo crear la orden.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2"><Button disabled={busy} onClick={create}>{busy ? 'Creando…' : 'Crear o consultar orden de cobro'}</Button>{error && <p role="alert">{error}</p>}</div>;
}

function IssueForm({
  organizationId,
  people,
  previous,
  onIssued,
}: {
  organizationId: string;
  people: QuoteRecipient[];
  previous?: string;
  onIssued: () => void;
}) {
  const [preview, setPreview] = useState<{
    input: QuoteInput;
    result: PaymentQuote;
    person: string;
    authority: "PRINCIPAL_ADMIN" | "COMMERCIAL_CONTACT";
    reason: string;
  }>();
  const pending = useRef<IssueQuoteInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function calculate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const plan = String(form.get("plan") ?? "").trim();
    const input: QuoteInput = {
      termMonths: Number(form.get("term")) as 3 | 6 | 12,
      ...(plan
        ? {
            commercialPlanCode: plan,
            candidacy: String(form.get("candidacy")) as "ACTIVO" | "ASPIRANTE",
          }
        : { listAmount: Number(form.get("amount")) }),
      ...(form.get("coupon")
        ? { couponCode: String(form.get("coupon")).trim() }
        : {}),
    };
    try {
      const result = await quotePayment(organizationId, input);
      setPreview({
        input,
        result,
        person: String(form.get("person")),
        authority: String(form.get("authority")) as
          | "PRINCIPAL_ADMIN"
          | "COMMERCIAL_CONTACT",
        reason: String(form.get("reason")),
      });
    } catch (e) {
      setError(extractErrorMessage(e) ?? "No se pudo calcular la propuesta.");
    } finally {
      setBusy(false);
    }
  }
  async function issue() {
    if (!preview) return;
    setBusy(true);
    setError("");
    const { commission: _commission, ...publicConditions } = preview.result;
    pending.current ??= {
      ...preview.input,
      expectedConditions: JSON.stringify(publicConditions),
      requestKey: crypto.randomUUID(),
      designatedUserId: preview.person,
      acceptanceAuthority: preview.authority,
      designationReason: preview.reason,
    };
    try {
      await issueCommercialQuote(organizationId, pending.current, previous);
      onIssued();
    } catch (e) {
      setError(
        extractErrorMessage(e) ??
          "No se pudo confirmar el resultado. Reintenta la misma solicitud.",
      );
      if (
        isAxiosError(e) &&
        [400, 403, 404, 409].includes(e.response?.status ?? 0)
      ) {
        pending.current = null;
        setPreview(undefined);
      }
    } finally {
      setBusy(false);
    }
  }
  const field = "w-full rounded-md border bg-background p-2";
  if (!people.length)
    return (
      <p>
        No hay personas activas disponibles para aceptar. Revisa la
        organización.
      </p>
    );
  return (
    <div className="space-y-3">
      {previous && (
        <p className="font-medium">
          Nueva versión: al emitirla reemplazará la propuesta seleccionada y
          requerirá aceptación.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!preview ? (
        <form onSubmit={calculate} className="grid gap-3 sm:grid-cols-2">
          <label>
            Periodo
            <select name="term" className={field}>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </label>
          <label>
            Código del plan comercial
            <input
              name="plan"
              className={field}
              placeholder="Vacío para venta fuera de catálogo"
              maxLength={40}
            />
          </label>
          <label>
            Valor del periodo sin impuestos (fuera de catálogo)
            <input
              name="amount"
              type="number"
              min={1}
              step={1}
              className={field}
            />
          </label>
          <label>
            Perfil
            <select name="candidacy" className={field}>
              <option value="ACTIVO">Activo</option>
              <option value="ASPIRANTE">Aspirante</option>
            </select>
          </label>
          <label>
            Cupón opcional
            <input name="coupon" maxLength={40} className={field} />
          </label>
          <label>
            Persona que aceptará
            <select name="person" required className={field}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} · {p.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Autoridad para aceptar
            <select name="authority" className={field}>
              <option value="PRINCIPAL_ADMIN">
                Administrador principal designado
              </option>
              <option value="COMMERCIAL_CONTACT">
                Contacto comercial autorizado
              </option>
            </select>
          </label>
          <label>
            Motivo de la designación
            <textarea
              name="reason"
              required
              minLength={10}
              maxLength={500}
              className={field}
            />
          </label>
          <Button disabled={busy} type="submit">
            {busy ? "Calculando…" : "Revisar propuesta"}
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <p>
            Vista previa:{" "}
            {preview.result.commercialPlan?.name ?? "Venta fuera de catálogo"} ·{" "}
            {preview.input.termMonths} meses · Total COP{" "}
            {preview.result.amounts.totalAmount.toLocaleString("es-CO")}.
          </p>
          <p className="text-sm">
            Al emitir se guardarán las condiciones vigentes calculadas por el
            servidor. La vigencia será de siete días o hasta el vencimiento del
            cupón, lo que ocurra primero.
          </p>
          <Button disabled={busy} onClick={issue}>
            {busy
              ? "Guardando…"
              : pending.current
                ? "Reintentar la misma solicitud"
                : "Emitir cotización"}
          </Button>
          {!pending.current && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => setPreview(undefined)}
            >
              Editar propuesta
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
