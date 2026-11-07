"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  COMMISSION_ORIGIN_LABEL,
  listCommercialPlans,
  listSalesReps,
  quotePayment,
  termLabel,
  TERRITORIAL_TERM_OPTIONS,
  type CommercialPlanAdmin,
  type CommissionOrigin,
  type PaymentQuote,
  type QuoteInput,
  type SalesRep,
  type SubscriptionTerm,
} from "@/lib/api/billing";
import { extractErrorMessage } from "@/lib/api/platform";
import { Button } from "@/components/ui/button";

export function CommercialQuotesPanel({
  organizationId,
  defaults,
}: {
  organizationId: string;
  /** Plan y perfil de la organización: la cotización los propone (recorrido de alta, Fase 2). */
  defaults?: { plan?: string | null; candidacy?: "ACTIVO" | "ASPIRANTE" | null };
}) {
  const canManage = usePlatformCapability("MANAGEMENT_MANAGE");
  const canRead = usePlatformCapability("BILLING_READ");
  const canReview = usePlatformCapability("PAYMENT_CONFIRM");
  const [orderRevision, setOrderRevision] = useState(0);
  const [revision, setRevision] = useState(0);
  const [previous, setPrevious] = useState<string>();
  // Al preparar una versión nueva se conserva el comercial de la anterior.
  const [previousSale, setPreviousSale] = useState<SaleAttribution>();
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
              previousSale={previousSale}
              defaults={defaults}
              onIssued={() => {
                setPrevious(undefined);
                setPreviousSale(undefined);
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
                      onClick={() => {
                        setPrevious(quote.id);
                        setPreviousSale(
                          quote.commission
                            ? { salesRepId: quote.commission.salesRepId, origin: quote.commission.origin }
                            : undefined,
                        );
                      }}
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

type SaleAttribution = { salesRepId: string; origin: CommissionOrigin };

function IssueForm({
  organizationId,
  people,
  previous,
  previousSale,
  defaults,
  onIssued,
}: {
  organizationId: string;
  people: QuoteRecipient[];
  previous?: string;
  previousSale?: SaleAttribution;
  defaults?: { plan?: string | null; candidacy?: "ACTIVO" | "ASPIRANTE" | null };
  onIssued: () => void;
}) {
  // Comercial de la venta: fija la comisión que se liquida al aplicar el pago.
  // Antes el formulario no lo pedía y ninguna venta del plan generaba comisión.
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [repsError, setRepsError] = useState(false);
  const [salesRepId, setSalesRepId] = useState(previousSale?.salesRepId ?? "");
  useEffect(() => {
    listSalesReps()
      .then((list) => setReps(list.filter((r) => r.isActive || r.id === previousSale?.salesRepId)))
      .catch(() => setRepsError(true));
  }, [previousSale?.salesRepId]);
  // Fase 4 (2026-11-04): cada plan trae sus plazos (por nivel: A a 1 o 12
  // meses, B a 1 mes o Pase Electoral) y los por nivel, su perfil fijo. Sin
  // el catálogo (o fuera de catálogo) se ofrecen los del territorial.
  const [plans, setPlans] = useState<CommercialPlanAdmin[]>([]);
  useEffect(() => {
    listCommercialPlans()
      .then((list) => setPlans(list.filter((p) => p.isActive)))
      .catch(() => setPlans([]));
  }, []);
  const [planCode, setPlanCode] = useState(defaults?.plan ?? "");
  const selectedPlan = plans.find((p) => p.code === planCode.trim());
  const levelPlan =
    selectedPlan?.pricingModel === "LEVEL" ? selectedPlan : undefined;
  const termOptions = selectedPlan?.termOptions ?? TERRITORIAL_TERM_OPTIONS;
  const [term, setTerm] = useState<SubscriptionTerm>(3);
  const [candidacy, setCandidacy] = useState<"ACTIVO" | "ASPIRANTE">(
    defaults?.candidacy ?? "ACTIVO",
  );
  const termValue = termOptions.some((o) => o.termMonths === term)
    ? term
    : termOptions[0].termMonths;
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
      termMonths: termValue,
      ...(plan
        ? {
            commercialPlanCode: plan,
            candidacy: levelPlan?.candidacy ?? candidacy,
          }
        : { listAmount: Number(form.get("amount")) }),
      ...(form.get("coupon")
        ? { couponCode: String(form.get("coupon")).trim() }
        : {}),
      ...(salesRepId
        ? {
            salesRepId,
            commissionOrigin: String(form.get("origin")) as CommissionOrigin,
          }
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
            <select
              name="term"
              className={field}
              value={termValue}
              onChange={(e) => setTerm(Number(e.target.value) as SubscriptionTerm)}
            >
              {termOptions.map((o) => (
                <option key={o.termMonths} value={o.termMonths}>
                  {termLabel(o.termMonths)}
                  {o.discountPercent ? ` (−${o.discountPercent} %)` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Código del plan comercial
            <input
              name="plan"
              className={field}
              placeholder="Vacío para venta fuera de catálogo"
              maxLength={40}
              list="commercial-plan-codes"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
            />
            <datalist id="commercial-plan-codes">
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </datalist>
            {selectedPlan && (
              <span className="text-xs text-muted-foreground">
                {selectedPlan.name}
                {levelPlan?.setupFee
                  ? ` · cuota de alta $ ${levelPlan.setupFee.toLocaleString("es-CO")} con el primer pago`
                  : ""}
              </span>
            )}
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
            {/* Un plan por nivel ya define el perfil (A en ejercicio, B campaña). */}
            <select
              name="candidacy"
              className={field}
              value={levelPlan?.candidacy ?? candidacy}
              disabled={!!levelPlan}
              onChange={(e) =>
                setCandidacy(e.target.value as "ACTIVO" | "ASPIRANTE")
              }
            >
              <option value="ACTIVO">En ejercicio</option>
              <option value="ASPIRANTE">Aspirante</option>
            </select>
          </label>
          <label>
            Cupón opcional
            <input name="coupon" maxLength={40} className={field} />
          </label>
          <label>
            Comercial de la venta
            <select
              name="salesRep"
              className={field}
              value={salesRepId}
              onChange={(e) => setSalesRepId(e.target.value)}
            >
              <option value="">Sin comercial (no genera comisión)</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {repsError && (
              <span className="text-xs text-red-600">
                No se pudo cargar la lista de comerciales.
              </span>
            )}
          </label>
          <label>
            Origen de la venta
            <select
              name="origin"
              className={field}
              disabled={!salesRepId}
              defaultValue={previousSale?.origin ?? "SALES_REP"}
            >
              {(Object.entries(COMMISSION_ORIGIN_LABEL) as [CommissionOrigin, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
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
            {termLabel(preview.input.termMonths)} · Total COP{" "}
            {preview.result.amounts.totalAmount.toLocaleString("es-CO")}.
          </p>
          {preview.result.amounts.setupAmount !== undefined && (
            <p className="text-sm">
              {preview.result.amounts.setupAmount > 0
                ? `Incluye la cuota de alta de $ ${preview.result.amounts.setupAmount.toLocaleString("es-CO")} + IVA $ ${preview.result.amounts.vatAmount.toLocaleString("es-CO")}: se cobra una sola vez, no lleva cupón y no paga comisión.`
                : "Sin cuota de alta: esta organización ya la pagó."}
            </p>
          )}
          {/* Tarea 3.9 (2026-11-07): la suscripción va sin IVA. */}
          {preview.result.amounts.exemptAmount !== undefined && (
            <p className="text-sm">
              La suscripción, $ {preview.result.amounts.exemptAmount.toLocaleString("es-CO")}, no lleva IVA.
            </p>
          )}
          <p className="text-sm">
            {preview.result.commission
              ? `Comisión para ${preview.result.commission.salesRep.name}: ${preview.result.commission.ratePercent} % del valor neto, $ ${preview.result.commission.totalAmount.toLocaleString("es-CO")} en dos cuotas. La segunda se paga a los 90 días si el cliente sigue activo.`
              : "Sin comercial: esta venta no genera comisión."}
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
