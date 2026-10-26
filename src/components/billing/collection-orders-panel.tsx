"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { QuerySection } from "@/components/platform/query-section";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/api/platform";
import {
  addTransferInformation,
  downloadTransferEvidence,
  listCollectionOrders,
  reviewTransfer,
  previewOrderApplication,
  applyOrderToPlan,
  type ApplicationPreview,
  type ApplyOrderInput,
  submitTransfer,
  recordTransfer,
  confirmOnlinePayment,
  listOnlinePayments,
  listOrderOnlineAttempts,
  startOnlinePayment,
  type OnlineAttemptStatus,
  type OnlinePayments,
  type OperatorOnlineAttempt,
  type CollectionOrder,
  type RecordTransferInput,
  type ReviewTransferInput,
  type TransferRequest,
} from "@/lib/api/collection-orders";

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value: string) =>
  new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" });
const stateLabels = {
  APPLIED: "Aplicado al plan",
  AWAITING_TRANSFER: "Pendiente de transferencia",
  UNDER_REVIEW: "En revisión",
  PARTIAL: "Abono parcial",
  PAID_PENDING_APPLICATION: "Importe cubierto · aplicación pendiente",
};
const requestLabels = {
  PENDING: "Pendiente de revisión",
  NEEDS_INFORMATION: "Falta información",
  REJECTED: "No confirmado",
  CONFIRMED: "Ingreso verificado",
};
const fieldClass = "w-full rounded border bg-background p-2";
const attemptLabels: Record<OnlineAttemptStatus, string> = {
  CREATED: "Enlace de pago abierto",
  PENDING: "En proceso",
  APPROVED: "Aprobado",
  DECLINED: "Rechazado",
  VOIDED: "Anulado",
  ERROR: "Con error",
};
const methodLabels: Record<string, string> = {
  CARD: "tarjeta",
  PSE: "PSE",
  NEQUI: "Nequi",
  BANCOLOMBIA_TRANSFER: "botón Bancolombia",
  DAVIPLATA: "Daviplata",
};
const methodLabel = (method: string) =>
  methodLabels[method] ?? method.toLowerCase().replace(/_/g, " ");
const eventResultLabels: Record<string, string> = {
  UPDATED: "actualizó el intento",
  NO_CHANGE: "sin cambios",
  IGNORED_SIGNATURE: "ignorado: firma inválida",
  IGNORED_TYPE: "ignorado: tipo de aviso",
  UNKNOWN_REFERENCE: "referencia desconocida",
  MISMATCH: "datos distintos al intento: revisar",
  RETRY: "Wompi lo reintentará",
};

export function CollectionOrdersPanel({
  organizationId,
  canReview = false,
  refresh = 0,
}: {
  organizationId?: string;
  canReview?: boolean;
  refresh?: number;
}) {
  const [revision, setRevision] = useState(0);
  const load = useCallback(
    () => listCollectionOrders(organizationId),
    [organizationId],
  );
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">
        Órdenes de cobro y transferencias
      </h2>
      <p className="text-sm text-muted-foreground">
        El comprobante pasa a revisión. Finanzas puede aplicar el importe
        completo verificado al plan, conservando las condiciones aceptadas.
      </p>
      <QuerySection
        key={`${refresh}-${revision}`}
        title="Órdenes e historial"
        load={load}
      >
        {(orders) =>
          orders.length ? (
            <div className="space-y-5">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  organizationId={organizationId}
                  canReview={canReview}
                  onChanged={() => setRevision((n) => n + 1)}
                />
              ))}
            </div>
          ) : (
            <p>No hay órdenes de cobro registradas.</p>
          )
        }
      </QuerySection>
    </section>
  );
}

function ApplyOrderForm({
  organizationId,
  order,
  onChanged,
}: {
  organizationId: string;
  order: CollectionOrder;
  onChanged: () => void;
}) {
  const [preview, setPreview] = useState<ApplicationPreview | null>(null);
  const [notes, setNotes] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef<ApplyOrderInput | null>(null);
  async function consult() {
    setBusy(true);
    setError(undefined);
    try {
      const current = await previewOrderApplication(organizationId, order.id);
      if (current.applied) {
        onChanged();
        return;
      }
      pending.current = null;
      setUncertain(false);
      setPreview(current);
    } catch (e) {
      setError(extractErrorMessage(e) ?? "No se pudo revisar la aplicación.");
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!preview) return;
    pending.current ??= {
      requestKey: crypto.randomUUID(),
      expectedSubscriptionUpdatedAt: preview.expectedSubscriptionUpdatedAt,
      notes: notes.trim(),
      acknowledgeReconciliation: acknowledge,
    };
    setBusy(true);
    setError(undefined);
    try {
      await applyOrderToPlan(organizationId, order.id, pending.current);
      onChanged();
    } catch (e) {
      setUncertain(true);
      setError(
        extractErrorMessage(e) ??
          "No se confirmó el resultado. Consulta el estado o reintenta la misma operación.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 rounded border p-3">
      <Button variant="outline" disabled={busy} onClick={consult}>
        {uncertain
          ? "Consultar resultado y actualizar vista previa"
          : "Revisar aplicación al plan"}
      </Button>
      {preview && (
        <>
          <p>
            {preview.planName} · {preview.termMonths} meses ·{" "}
            {money(preview.totalAmount)}
          </p>
          <p className="text-sm">
            {preview.renewing ? "Extensión de vigencia" : "Inicio de servicio"}:{" "}
            {date(preview.periodStart)} a {date(preview.periodEnd)}.
          </p>
          <p className="text-sm">
            {preview.quotasPreserved
              ? "Se conserva el consumo y el aniversario mensual actuales."
              : "La vigencia comienza al confirmar y se inicia la ventana mensual de cupos."}
          </p>
          <label className="block text-sm">
            Motivo de la aplicación
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              minLength={10}
              maxLength={2000}
              disabled={busy || uncertain}
              className={fieldClass}
            />
          </label>
          {preview.requiresReconciliation && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acknowledge}
                onChange={(e) => setAcknowledge(e.target.checked)}
                disabled={busy || uncertain}
              />
              Concilié las condiciones de la propuesta original. Los excedentes
              permanecen pendientes de elección y no se aplican al plan.
            </label>
          )}
          <Button
            disabled={
              busy ||
              notes.trim().length < 10 ||
              (preview.requiresReconciliation && !acknowledge)
            }
            onClick={apply}
          >
            {uncertain
              ? "Reintentar la misma aplicación"
              : "Confirmar y aplicar al plan"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="break-words text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function OrderCard({
  order,
  organizationId,
  canReview,
  onChanged,
}: {
  order: CollectionOrder;
  organizationId?: string;
  canReview: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = useState("");
  const pending = order.requests.some((r) =>
    ["PENDING", "NEEDS_INFORMATION"].includes(r.state),
  );
  async function download(request: TransferRequest, evidenceId: string) {
    setError("");
    try {
      const { url } = await downloadTransferEvidence(
        organizationId,
        order.id,
        request.id,
        evidenceId,
      );
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener noreferrer";
      a.target = "_blank";
      a.click();
    } catch (e) {
      setError(
        extractErrorMessage(e) ?? "No se pudo descargar el comprobante.",
      );
    }
  }
  return (
    <article className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-semibold">
          Cotización v{order.quoteVersion} · {money(order.totalAmount)}
        </h3>
        <span>{stateLabels[order.state]}</span>
      </div>
      {!organizationId && !order.application && (
        <OnlinePaymentBox
          order={order}
          transferPending={pending}
          onChanged={onChanged}
        />
      )}
      {/* Recorrido de alta, Fase 1B: antes solo "Orden: <id interno>" y ninguna
          cuenta a la cual transferir. */}
      {order.outstandingAmount > 0 && !order.application && (
        <PayToBox order={order} />
      )}
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt>Ingreso aplicado a la orden</dt>
          <dd>{money(order.allocatedAmount)}</dd>
        </div>
        <div>
          <dt>Pendiente</dt>
          <dd>{money(order.outstandingAmount)}</dd>
        </div>
        <div>
          <dt>Límite de la propuesta</dt>
          <dd>{date(order.dueAt)}</dd>
        </div>
      </dl>
      {order.onlinePayments?.map((payment) => (
        <p key={payment.id} className="break-words text-sm">
          Pagado en línea: {money(payment.amount)} · {date(payment.paidAt)} ·
          transacción {payment.providerTransactionId}
          {payment.excessAmount > 0 &&
            ` · excedente ${money(payment.excessAmount)}`}
        </p>
      ))}
      {organizationId && (
        <OnlineAttemptsDetails organizationId={organizationId} order={order} />
      )}
      {order.requiresReconciliation && (
        <p className="text-sm text-amber-700">
          La propuesta venció o fue reemplazada. Finanzas debe conciliar
          cualquier ingreso con esta orden original.
        </p>
      )}
      {order.excessAmount > 0 && (
        <p>
          Excedente: {money(order.excessAmount)}. Pendiente de elección del
          cliente y gestión de Finanzas.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {order.application && (
        <div className="rounded border p-3 text-sm">
          <p>
            Aplicado el {date(order.application.appliedAt)} por{" "}
            {order.application.appliedByEmail}.
          </p>
          <p>
            Vigencia hasta {date(order.application.after.currentPeriodEnd)}.
          </p>
          <p className="whitespace-pre-wrap break-words">
            {order.application.notes}
          </p>
        </div>
      )}
      {organizationId &&
        canReview &&
        order.state === "PAID_PENDING_APPLICATION" && (
          <ApplyOrderForm
            organizationId={organizationId}
            order={order}
            onChanged={onChanged}
          />
        )}
      {order.requests.map((request) => (
        <section key={request.id} className="space-y-3 rounded border p-3">
          <h4 className="font-medium">{requestLabels[request.state]}</h4>
          <p className="break-words text-sm">
            Reportado: {money(request.reportedAmount)} ·{" "}
            {date(request.reportedPaidAt)} · referencia{" "}
            {request.reportedReference}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">
            {request.notes}
          </p>
          <div className="flex flex-wrap gap-2">
            {request.evidence.map((file) => (
              <Button
                key={file.id}
                variant="outline"
                className="h-auto max-w-full whitespace-normal break-all"
                onClick={() => download(request, file.id)}
              >
                Descargar {file.fileName}
              </Button>
            ))}
          </div>
          {request.receipt && (
            <p className="break-words text-sm">
              Verificado: {money(request.receipt.amount)} · referencia bancaria{" "}
              {request.receipt.bankReference} ·{" "}
              {date(request.receipt.verifiedAt)}
            </p>
          )}
          <details>
            <summary className="cursor-pointer">Historial de revisión</summary>
            <ol className="mt-2 space-y-2 text-sm">
              {request.events.map((event) => (
                <li key={event.id} className="break-words">
                  {date(event.createdAt)} · {event.notes}
                </li>
              ))}
            </ol>
          </details>
          {organizationId &&
            canReview &&
            ["PENDING", "NEEDS_INFORMATION"].includes(request.state) && (
              <ReviewForm
                organizationId={organizationId}
                order={order}
                request={request}
                onChanged={onChanged}
              />
            )}
          {!organizationId && request.state === "NEEDS_INFORMATION" && (
            <ProofForm order={order} request={request} onChanged={onChanged} />
          )}
        </section>
      ))}
      {!organizationId && !pending && order.outstandingAmount > 0 && (
        <ProofForm order={order} onChanged={onChanged} />
      )}
      {organizationId &&
        canReview &&
        !pending &&
        !order.application &&
        order.outstandingAmount > 0 && (
          <RecordTransferForm
            organizationId={organizationId}
            order={order}
            onChanged={onChanged}
          />
        )}
    </article>
  );
}

/** An uncertain retry keeps its exact payload and key until the server answers definitively. */
function ProofForm({
  order,
  request,
  onChanged,
}: {
  order: CollectionOrder;
  request?: TransferRequest;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<FormData | null>(null);
  const [retry, setRetry] = useState(false);
  async function send(form: HTMLFormElement) {
    setBusy(true);
    setError("");
    try {
      if (!pending.current) {
        const body = new FormData(form);
        body.set("requestKey", crypto.randomUUID());
        const file = body.get("file");
        if (file instanceof File && file.size > 5 * 1024 * 1024)
          throw new Error("El comprobante supera los 5 MB.");
        if (file instanceof File && file.size === 0) body.delete("file");
        if (!request) {
          body.set("currency", "COP");
          body.set(
            "paidAt",
            new Date(String(body.get("paidAt"))).toISOString(),
          );
        }
        pending.current = body;
      }
      if (request)
        await addTransferInformation(order.id, request.id, pending.current);
      else await submitTransfer(order.id, pending.current);
      pending.current = null;
      onChanged();
    } catch (e) {
      setRetry(!!pending.current);
      setError(
        extractErrorMessage(e) ??
          (e instanceof Error ? e.message : "No se pudo enviar."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send(e.currentTarget);
      }}
    >
      <h4 className="font-medium">
        {request ? "Completar información" : "Enviar comprobante para revisión"}
      </h4>
      <fieldset disabled={busy || retry} className="space-y-3">
        {!request && (
          <>
            <label className="block">
              Importe en COP
              <input
                className={fieldClass}
                name="amount"
                type="number"
                min="1"
                max="999999999999"
                step="1"
                required
              />
            </label>
            <label className="block">
              Fecha y hora de la transferencia
              <input
                className={fieldClass}
                name="paidAt"
                type="datetime-local"
                required
              />
            </label>
            <label className="block">
              Referencia del comprobante
              <input
                className={fieldClass}
                name="reference"
                minLength={2}
                maxLength={120}
                required
              />
            </label>
          </>
        )}
        <label className="block">
          {request ? "Comprobante adicional (opcional)" : "Comprobante"} · PDF,
          PNG o JPEG, hasta 5 MB
          <input
            className={fieldClass}
            name="file"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            required={!request}
          />
        </label>
        <label className="block">
          {request
            ? "Información solicitada"
            : "Información de la transferencia"}
          <textarea
            className={fieldClass}
            name="notes"
            minLength={5}
            maxLength={1000}
            required
          />
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy
            ? "Enviando…"
            : retry
              ? "Reintentar el mismo envío"
              : "Enviar a revisión"}
        </Button>
        {retry && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              pending.current = null;
              onChanged();
            }}
          >
            Consultar estado antes de otro envío
          </Button>
        )}
      </div>
    </form>
  );
}

function ReviewForm({
  organizationId,
  order,
  request,
  onChanged,
}: {
  organizationId: string;
  order: CollectionOrder;
  request: TransferRequest;
  onChanged: () => void;
}) {
  const [action, setAction] =
    useState<ReviewTransferInput["action"]>("NEEDS_INFORMATION");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(false);
  const pending = useRef<ReviewTransferInput | null>(null);
  async function send(form: HTMLFormElement) {
    setBusy(true);
    setError("");
    try {
      if (!pending.current) {
        const data = new FormData(form);
        const input: ReviewTransferInput = {
          requestKey: crypto.randomUUID(),
          action,
          expectedState: request.state as "PENDING" | "NEEDS_INFORMATION",
          notes: String(data.get("notes")),
        };
        if (action === "CONFIRMED")
          Object.assign(input, {
            receivingAccount: order.payTo?.code,
            bankReference: String(data.get("bankReference")),
            amount: Number(data.get("amount")),
            currency: "COP",
            paidAt: new Date(String(data.get("paidAt"))).toISOString(),
            acknowledgeReconciliation: data.get("reconciliation") === "on",
          });
        pending.current = input;
      }
      await reviewTransfer(
        organizationId,
        order.id,
        request.id,
        pending.current,
      );
      pending.current = null;
      onChanged();
    } catch (e) {
      setRetry(!!pending.current);
      setError(extractErrorMessage(e) ?? "No se pudo guardar la revisión.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-3 border-t pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send(e.currentTarget);
      }}
    >
      <h5 className="font-semibold">Revisión de Finanzas</h5>
      <fieldset disabled={busy || retry} className="space-y-3">
        <label className="block">
          Decisión
          <select
            className={fieldClass}
            value={action}
            onChange={(e) =>
              setAction(e.target.value as ReviewTransferInput["action"])
            }
          >
            <option value="NEEDS_INFORMATION">Solicitar información</option>
            <option value="REJECTED">No confirmar el ingreso</option>
            <option value="CONFIRMED">
              Confirmar ingreso bancario verificado
            </option>
          </select>
        </label>
        {action === "CONFIRMED" && (
          <>
            <p>
              {order.payTo
                ? `Cuenta receptora: ${order.payTo.bankName} · terminación ${order.payTo.accountNumber.slice(-4)}`
                : "Falta configurar la cuenta que recibe los pagos: no se puede confirmar el ingreso."}
            </p>
            <label className="block">
              Referencia bancaria verificada
              <input
                className={fieldClass}
                name="bankReference"
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label className="block">
              Importe recibido en COP
              <input
                className={fieldClass}
                name="amount"
                type="number"
                min="1"
                max="999999999999"
                step="1"
                required
              />
            </label>
            <label className="block">
              Fecha y hora del ingreso
              <input
                className={fieldClass}
                name="paidAt"
                type="datetime-local"
                required
              />
            </label>
            <label className="flex items-start gap-2">
              <input name="reconciliation" type="checkbox" className="mt-1" />
              <span>
                Revisé las diferencias, el posible excedente y la vigencia de la
                orden original.
              </span>
            </label>
            <p className="text-sm">
              Confirma solo después de verificar el ingreso en el banco. La
              evidencia del cliente no sustituye esa comprobación.
            </p>
          </>
        )}
        <label className="block">
          Motivo y resultado (visible para el cliente)
          <textarea
            className={fieldClass}
            name="notes"
            minLength={10}
            maxLength={1000}
            required
          />
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} type="submit">
          {busy
            ? "Guardando…"
            : retry
              ? "Reintentar la misma decisión"
              : "Guardar revisión"}
        </Button>
        {retry && (
          <Button
            variant="outline"
            type="button"
            disabled={busy}
            onClick={() => {
              pending.current = null;
              onChanged();
            }}
          >
            Actualizar historial
          </Button>
        )}
      </div>
    </form>
  );
}

/** A dónde transferir y con qué referencia (recorrido de alta, Fase 1B). */
/**
 * Pago en línea con Wompi (fase W3). Solo aparece si el servidor lo habilita
 * para esta organización; el plan se activa cuando Wompi confirma el pago.
 */
function OnlinePaymentBox({
  order,
  transferPending,
  onChanged,
}: {
  order: CollectionOrder;
  transferPending: boolean;
  onChanged: () => void;
}) {
  const [state, setState] = useState<OnlinePayments | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    listOnlinePayments(order.id)
      .then((result) => alive && setState(result))
      .catch(() => alive && setState(null));
    return () => {
      alive = false;
    };
  }, [order.id]);
  if (!state?.enabled) return null;
  const last = state.attempts.at(-1);
  const inProgress = last?.status === "PENDING" || last?.status === "APPROVED";
  const canPay =
    order.outstandingAmount > 0 && !transferPending && !inProgress;
  const failed =
    last?.status === "DECLINED" ||
    last?.status === "ERROR" ||
    last?.status === "VOIDED";
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const attempt = await startOnlinePayment(order.id);
      if (!attempt.checkoutUrl)
        throw new Error("No se pudo abrir el pago. Inténtalo de nuevo.");
      window.location.assign(attempt.checkoutUrl);
    } catch (e) {
      setError(
        extractErrorMessage(e) ??
          (e instanceof Error ? e.message : "No se pudo abrir el pago."),
      );
      setBusy(false);
    }
  }
  async function check() {
    if (!last?.providerTransactionId) return onChanged();
    setBusy(true);
    setError("");
    try {
      await confirmOnlinePayment(last.providerTransactionId);
      onChanged();
    } catch (e) {
      setError(extractErrorMessage(e) ?? "No se pudo consultar el pago.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
      <p className="font-semibold">
        Paga en línea{" "}
        {order.outstandingAmount > 0 && money(order.outstandingAmount)}
      </p>
      <p>
        Con PSE, tarjeta o Nequi en la página segura de Wompi. Cuando el pago se
        aprueba, tu plan se activa solo.
      </p>
      {state.mode === "sandbox" && (
        <p className="font-medium text-amber-800">
          Modo de pruebas: solo funcionan los medios de prueba de Wompi y no se
          cobra dinero real.
        </p>
      )}
      {last && (
        <p className="break-words">
          Último intento: {attemptLabels[last.status]} · {money(last.amount)}
          {last.paymentMethodType &&
            ` · ${methodLabel(last.paymentMethodType)}`}{" "}
          · {date(last.createdAt)}
          {last.statusMessage && ` — ${last.statusMessage}`}
        </p>
      )}
      {last?.status === "PENDING" && (
        <>
          <p>
            El banco todavía no confirma el pago; con PSE puede tardar unos
            minutos. No pagues de nuevo mientras tanto.
          </p>
          <Button variant="outline" disabled={busy} onClick={check}>
            {busy ? "Consultando…" : "Consultar estado"}
          </Button>
        </>
      )}
      {last?.status === "APPROVED" && (
        <p>
          Pago aprobado. Tu plan se activa en unos segundos; si la orden
          necesita revisión, Finanzas la aplica.
        </p>
      )}
      {transferPending && !inProgress && (
        <p>
          Tienes un comprobante de transferencia en revisión; espera esa
          revisión antes de pagar en línea.
        </p>
      )}
      {canPay && (
        <Button disabled={busy} onClick={pay}>
          {busy
            ? "Abriendo Wompi…"
            : failed
              ? "Intentar de nuevo en línea"
              : "Pagar en línea"}
        </Button>
      )}
      {error && (
        <p role="alert" className="break-words">
          {error}
        </p>
      )}
    </div>
  );
}

/** Operador: intentos de pago en línea de la orden y los avisos de Wompi. */
function OnlineAttemptsDetails({
  organizationId,
  order,
}: {
  organizationId: string;
  order: CollectionOrder;
}) {
  const [data, setData] = useState<{
    enabled: boolean;
    mode: OnlinePayments["mode"];
    attempts: OperatorOnlineAttempt[];
  } | null>(null);
  const [error, setError] = useState("");
  async function load() {
    if (data) return;
    setError("");
    try {
      setData(await listOrderOnlineAttempts(organizationId, order.id));
    } catch (e) {
      setError(
        extractErrorMessage(e) ?? "No se pudieron cargar los pagos en línea.",
      );
    }
  }
  return (
    <details
      className="rounded border p-3 text-sm"
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
    >
      <summary className="cursor-pointer font-medium">
        Pagos en línea (Wompi)
      </summary>
      {error && (
        <p role="alert" className="mt-2">
          {error}
        </p>
      )}
      {data && (
        <div className="mt-2 space-y-3">
          <p className="text-muted-foreground">
            {data.mode === "sandbox"
              ? "Wompi en modo pruebas"
              : data.mode === "production"
                ? "Wompi en producción"
                : "Wompi sin configurar"}
            {data.mode && !data.enabled &&
              " · esta organización no puede pagar en línea"}
          </p>
          {data.attempts.length === 0 ? (
            <p>Sin intentos de pago en línea.</p>
          ) : (
            data.attempts.map((attempt) => (
              <div key={attempt.id} className="space-y-1 rounded border p-2">
                <p className="font-medium">
                  {attempt.reference} · {attemptLabels[attempt.status]} ·{" "}
                  {money(attempt.amount)}
                </p>
                <p className="break-words">
                  Abierto por {attempt.createdByEmail} el{" "}
                  {date(attempt.createdAt)}
                  {attempt.paymentMethodType &&
                    ` · ${methodLabel(attempt.paymentMethodType)}`}
                  {attempt.providerTransactionId &&
                    ` · transacción ${attempt.providerTransactionId}`}
                </p>
                {attempt.statusMessage && (
                  <p className="break-words">{attempt.statusMessage}</p>
                )}
                {attempt.events.length > 0 && (
                  <ol className="list-inside list-disc text-xs text-muted-foreground">
                    {attempt.events.map((event) => (
                      <li key={event.id} className="break-words">
                        {date(event.receivedAt)} · aviso{" "}
                        {event.reportedStatus ?? event.eventType} ·{" "}
                        {event.checksumValid ? "firma válida" : "firma inválida"}{" "}
                        ·{" "}
                        {event.result
                          ? (eventResultLabels[event.result] ?? event.result)
                          : "en proceso"}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </details>
  );
}

function PayToBox({ order }: { order: CollectionOrder }) {
  const pay = order.payTo;
  return (
    <div className="space-y-1 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
      <p className="font-semibold">Transfiere {money(order.outstandingAmount)}</p>
      {pay ? (
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          <div>
            <dt className="inline text-sky-800">Banco: </dt>
            <dd className="inline">{pay.bankName}</dd>
          </div>
          <div>
            <dt className="inline text-sky-800">Cuenta de {pay.accountType.toLowerCase()}: </dt>
            <dd className="inline font-mono">{pay.accountNumber}</dd>
          </div>
          <div>
            <dt className="inline text-sky-800">Titular: </dt>
            <dd className="inline">{pay.holderName}</dd>
          </div>
          {pay.holderId && (
            <div>
              <dt className="inline text-sky-800">Documento: </dt>
              <dd className="inline">{pay.holderId}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p>Pide a tu asesor los datos de la cuenta para transferir.</p>
      )}
      <p>
        Escribe esta referencia en la descripción de la transferencia:{" "}
        <strong className="font-mono">{order.paymentReference}</strong>
      </p>
    </div>
  );
}

/** Finanzas registra una transferencia que ya verificó en el banco (Fase 1B). */
function RecordTransferForm({
  organizationId,
  order,
  onChanged,
}: {
  organizationId: string;
  order: CollectionOrder;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(false);
  const pending = useRef<RecordTransferInput | null>(null);
  async function send(form: HTMLFormElement) {
    setBusy(true);
    setError("");
    try {
      if (!pending.current) {
        const data = new FormData(form);
        pending.current = {
          requestKey: crypto.randomUUID(),
          amount: Number(data.get("amount")),
          paidAt: new Date(String(data.get("paidAt"))).toISOString(),
          bankReference: String(data.get("bankReference")),
          notes: String(data.get("notes")),
          acknowledgeReconciliation: data.get("reconciliation") === "on",
        };
      }
      await recordTransfer(organizationId, order.id, pending.current);
      pending.current = null;
      onChanged();
    } catch (e) {
      setRetry(!!pending.current);
      setError(extractErrorMessage(e) ?? "No se pudo registrar la transferencia.");
    } finally {
      setBusy(false);
    }
  }
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Registrar transferencia recibida
      </Button>
    );
  const last4 = order.payTo ? order.payTo.accountNumber.slice(-4) : "";
  return (
    <form
      className="space-y-3 rounded border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send(e.currentTarget);
      }}
    >
      <h4 className="font-semibold">Registrar transferencia recibida</h4>
      <p className="text-sm text-muted-foreground">
        Para cuando el cliente envió el comprobante por fuera de la plataforma.
        Regístrala solo después de verificar el ingreso en el banco
        {order.payTo ? ` (${order.payTo.bankName}, terminación ${last4})` : ""}.
        Después, aplica la orden al plan.
      </p>
      <fieldset disabled={busy || retry} className="space-y-3">
        <label className="block">
          Referencia bancaria verificada
          <input className={fieldClass} name="bankReference" minLength={2} maxLength={120} required />
        </label>
        <label className="block">
          Importe recibido en COP
          <input
            className={fieldClass}
            name="amount"
            type="number"
            min="1"
            max="999999999999"
            step="1"
            defaultValue={order.outstandingAmount}
            required
          />
        </label>
        <label className="block">
          Fecha y hora del ingreso
          <input className={fieldClass} name="paidAt" type="datetime-local" required />
        </label>
        <label className="flex items-start gap-2">
          <input name="reconciliation" type="checkbox" className="mt-1" />
          <span>
            Revisé las diferencias, el posible excedente y la vigencia de la
            orden original.
          </span>
        </label>
        <label className="block">
          Detalle (visible para el cliente)
          <textarea className={fieldClass} name="notes" minLength={10} maxLength={1000} required />
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !order.payTo} type="submit">
          {busy ? "Guardando…" : retry ? "Reintentar el mismo registro" : "Registrar transferencia"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            pending.current = null;
            setRetry(false);
            setOpen(false);
            if (retry) onChanged();
          }}
        >
          {retry ? "Actualizar historial" : "Cancelar"}
        </Button>
      </div>
    </form>
  );
}
