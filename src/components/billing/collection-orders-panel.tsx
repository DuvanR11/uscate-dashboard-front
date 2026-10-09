"use client";
import { useCallback, useRef, useState } from "react";
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
  type CollectionOrder,
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
      <p className="break-all text-sm">Orden: {order.id}</p>
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
            receivingAccount: "BANCOLOMBIA-3421",
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
            <p>Cuenta receptora: Bancolombia · terminación 3421</p>
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
