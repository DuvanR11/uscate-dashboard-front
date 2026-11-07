"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatformAccess } from "./access-context";
import { percent, SEGMENT_LABEL } from "@/lib/api/finance-overview";
import { pesos } from "@/lib/api/monthly-close";
import { currentColombiaMonth, shiftMonth } from "@/lib/api/platform-budget";
import {
  colombiaToday,
  downloadClientsCsv,
  downloadInvoicingCsv,
  downloadPrepaidCsv,
  getClientsReport,
  getInvoiceHistory,
  getInvoicingReport,
  getPrepaidReport,
  INVOICING_STATUS_LABEL,
  recordInvoice,
  RECOGNITION_LABEL,
  type ClientsReport,
  type InvoiceHistory,
  type InvoicingReport,
  type InvoicingRow,
  type InvoicingStatus,
  type PrepaidReport,
} from "@/lib/api/platform-finance-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Fase 6b del plan de finanzas y catálogo (2026-11-07): cada cliente en una
// fila, saldos prepagos con vencimiento y facturas emitidas fuera.
async function errorText(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { message?: string | string[] } | Blob } })?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message as string;
    } catch {
      return fallback;
    }
  }
  return data && "message" in data && data.message ? [data.message].flat().join(" ") : fallback;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const negative = (value: number) => (value < 0 ? "text-destructive font-medium" : "");
const day = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" }).format(
        new Date(iso.length === 10 ? `${iso}T17:00:00.000Z` : iso),
      )
    : "—";
const quantity = (value: number | null) =>
  value === null ? "—" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value);

function useFinanceAccess() {
  const access = usePlatformAccess();
  const caps = access?.capabilities ?? [];
  const global = !!access?.allOrganizations;
  return {
    canRead: global && caps.includes("BILLING_READ"),
    canReadCosts: global && caps.includes("BILLING_READ") && caps.includes("PROVIDER_COSTS_READ"),
    canConfirm: global && caps.includes("PAYMENT_CONFIRM"),
  };
}

function NoAccess({ text }: { text: string }) {
  return <p className="rounded-xl border p-4">{text}</p>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`text-lg font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

// ------------------------------------------------------------ Por cliente

export function ClientsPanel() {
  const { canReadCosts } = useFinanceAccess();
  const [month, setMonth] = useState(() => currentColombiaMonth());
  const [report, setReport] = useState<ClientsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await getClientsReport(month));
    } catch (e) {
      setError(await errorText(e, "No se pudieron consultar las finanzas por cliente."));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    if (canReadCosts && MONTH.test(month)) void load();
  }, [canReadCosts, month, load]);

  if (!canReadCosts)
    return (
      <NoAccess text="Ver las finanzas por cliente requiere consultar pagos y costos de proveedores, con acceso a todas las organizaciones." />
    );

  const s = report?.summary;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span>Mes</span>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
        </label>
        <Button
          variant="outline"
          disabled={downloading || !report}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadClientsCsv(month);
            } catch (e) {
              setError(await errorText(e, "No se pudo descargar el CSV."));
            } finally {
              setDownloading(false);
            }
          }}
        >
          Descargar CSV
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        La utilidad es la del mes: ingreso devengado menos costo variable. El saldo prepagado, lo que falta por facturar y
        lo que te deben van al día de hoy.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading && !report && <p className="text-sm">Cargando…</p>}
      {s && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Utilidad del mes" value={pesos(s.marginCop)} tone={negative(s.marginCop)} />
          <Stat label="Saldo prepagado" value={pesos(s.prepaidValueCop)} />
          <Stat label={`Sin factura (${s.pendingInvoices})`} value={pesos(s.pendingInvoiceTotalCop)} />
          <Stat
            label="Por cobrar (vencido)"
            value={`${pesos(s.outstandingCop)} (${pesos(s.overdueCop)})`}
            tone={s.overdueCop > 0 ? "text-destructive" : ""}
          />
        </div>
      )}
      {s && s.overCost > 0 && (
        <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          {s.overCost === 1 ? "Una organización cuesta" : `${s.overCost} organizaciones cuestan`} más de lo que pagan este
          mes: van primero en la tabla.
        </p>
      )}
      {report && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead className="text-right">Devengado</TableHead>
                <TableHead className="text-right">Costo variable</TableHead>
                <TableHead className="text-right">Utilidad</TableHead>
                <TableHead className="text-right">Saldo prepagado</TableHead>
                <TableHead>Próximo vencimiento</TableHead>
                <TableHead className="text-right">Sin factura</TableHead>
                <TableHead className="text-right">Por cobrar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground text-center">
                    No hay clientes con ingresos, consumo, saldos ni cobros en este mes.
                  </TableCell>
                </TableRow>
              )}
              {report.rows.map((r) => (
                <TableRow key={r.organizationId}>
                  <TableCell>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {r.planName ?? "Sin suscripción en el mes"}
                      {r.segment ? ` · ${SEGMENT_LABEL[r.segment]}` : ""}
                      {r.overCost ? " · cuesta más de lo que paga" : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">{pesos(r.accruedCop)}</TableCell>
                  <TableCell className="text-right">{pesos(r.variableCostCop)}</TableCell>
                  <TableCell className={`text-right ${negative(r.marginCop)}`}>
                    {pesos(r.marginCop)}
                    {r.marginRate !== null && <span className="text-muted-foreground block text-xs">{percent(r.marginRate)}</span>}
                  </TableCell>
                  <TableCell className="text-right">{pesos(r.prepaidValueCop)}</TableCell>
                  <TableCell>
                    {r.nextExpiry ? (
                      <>
                        <p>{r.nextExpiry.label}</p>
                        <p className={`text-xs ${r.nextExpiry.daysLeft <= 30 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {day(r.nextExpiry.endsAt)} · {r.nextExpiry.daysLeft === 1 ? "1 día" : `${r.nextExpiry.daysLeft} días`}
                        </p>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.pendingInvoices > 0 ? `${r.pendingInvoices} · ${pesos(r.pendingInvoiceTotalCop)}` : "—"}
                  </TableCell>
                  <TableCell className={`text-right ${r.overdueCop > 0 ? "text-destructive" : ""}`}>
                    {r.outstandingCop > 0 ? pesos(r.outstandingCop) : "—"}
                    {r.overdueCop > 0 && <span className="block text-xs">vencido {pesos(r.overdueCop)}</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------- Saldos prepagos

export function PrepaidPanel() {
  const { canRead } = useFinanceAccess();
  const [report, setReport] = useState<PrepaidReport | null>(null);
  const [error, setError] = useState("");
  const [onlySoon, setOnlySoon] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!canRead) return;
    getPrepaidReport()
      .then(setReport)
      .catch(async (e) => setError(await errorText(e, "No se pudieron consultar los saldos prepagos.")));
  }, [canRead]);

  if (!canRead) return <NoAccess text="Ver los saldos prepagos requiere consultar pagos, con acceso a todas las organizaciones." />;

  const rows = report ? report.rows.filter((r) => !onlySoon || (r.expiresSoon && r.kind !== "SUBSCRIPTION")) : [];
  const s = report?.summary;
  return (
    <section className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Lo que los clientes ya pagaron y todavía no reciben, sin IVA. La suscripción y los complementos mensuales se
        reparten por días: es lo que falta por devengar. Los paquetes y las horas se reconocieron completos al cobrarse;
        su valor no consumido es informativo hasta que el contador decida si es ingreso diferido.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {!report && !error && <p className="text-sm">Cargando…</p>}
      {s && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Falta por devengar" value={pesos(s.unearnedCop)} />
          <Stat label="No consumido (paquetes y horas)" value={pesos(s.unconsumedCop)} />
          <Stat label="Total" value={pesos(s.totalCop)} />
          <Stat
            label={`Vence en ${report?.expiryWindowDays ?? 30} días (${s.expiringSoon})`}
            value={pesos(s.expiringSoonCop)}
            tone={s.expiringSoon > 0 ? "text-amber-700 dark:text-amber-400" : ""}
          />
        </div>
      )}
      {report && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlySoon} onChange={(e) => setOnlySoon(e.target.checked)} />
            Solo paquetes y horas por vencer
          </label>
          <Button
            variant="outline"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              try {
                await downloadPrepaidCsv();
              } catch (e) {
                setError(await errorText(e, "No se pudo descargar el CSV."));
              } finally {
                setDownloading(false);
              }
            }}
          >
            Descargar CSV
          </Button>
        </div>
      )}
      {report && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead className="text-right">Restante</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead className="text-right">Valor sin IVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    {onlySoon ? "Nada vence en los próximos días." : "No hay saldos prepagos vigentes."}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={`${r.kind}-${r.paymentId ?? ""}-${r.balanceId ?? ""}`}>
                  <TableCell className="font-medium">{r.organizationName}</TableCell>
                  <TableCell>
                    <p>{r.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {r.kindLabel} · {RECOGNITION_LABEL[r.recognition]}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    {quantity(r.remaining)} {r.unit}
                    {r.total !== null && (
                      <span className="text-muted-foreground block text-xs">
                        de {quantity(r.total)} · usado {quantity(r.consumed)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={r.expiresSoon && r.kind !== "SUBSCRIPTION" ? "text-amber-700 dark:text-amber-400" : ""}>
                    {day(r.endsAt)}
                    <span className="block text-xs">{r.daysLeft === 1 ? "1 día" : `${r.daysLeft} días`}</span>
                  </TableCell>
                  <TableCell className="text-right">{r.valued ? pesos(r.valueCop) : "Incluido en el plan"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

// -------------------------------------------------------- Por facturar

export function InvoicingPanel() {
  const { canRead, canConfirm } = useFinanceAccess();
  const current = currentColombiaMonth();
  const [from, setFrom] = useState(() => shiftMonth(current, -2));
  const [to, setTo] = useState(current);
  const [status, setStatus] = useState<InvoicingStatus>("PENDING");
  const [report, setReport] = useState<InvoicingReport | null>(null);
  const [selected, setSelected] = useState<InvoicingRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState("");

  const valid = MONTH.test(from) && MONTH.test(to) && from <= to;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await getInvoicingReport(from, to, status));
    } catch (e) {
      setError(await errorText(e, "No se pudo consultar la facturación."));
    } finally {
      setLoading(false);
    }
  }, [from, to, status]);

  useEffect(() => {
    if (canRead && valid) void load();
  }, [canRead, valid, load]);

  if (!canRead) return <NoAccess text="Ver la facturación requiere consultar pagos, con acceso a todas las organizaciones." />;

  const s = report?.summary;
  return (
    <section className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Pagos confirmados de clientes reales y su factura electrónica. La factura se emite fuera de Zyron; aquí registras su
        número y fecha. Descarga lo pendiente para el contador.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span>Desde</span>
          <Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Hasta</span>
          <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Mostrar</span>
          <Select value={status} onValueChange={(v) => setStatus(v as InvoicingStatus)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(INVOICING_STATUS_LABEL) as InvoicingStatus[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {INVOICING_STATUS_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button
          variant="outline"
          disabled={downloading || !valid}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadInvoicingCsv(from, to, status);
            } catch (e) {
              setError(await errorText(e, "No se pudo descargar el CSV."));
            } finally {
              setDownloading(false);
            }
          }}
        >
          Descargar CSV para el contador
        </Button>
      </div>
      {!valid && <p className="text-destructive text-sm">Revisa el rango: hasta 12 meses y el inicio antes del final.</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {saved && <p className="rounded-xl border p-3 text-sm">{saved}</p>}
      {loading && !report && <p className="text-sm">Cargando…</p>}
      {s && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={`Sin factura (${s.pending} de ${s.payments})`} value={pesos(s.pendingTotalCop)} tone={s.pending ? "text-amber-700 dark:text-amber-400" : ""} />
          <Stat label="IVA sin facturar" value={pesos(s.pendingVatCop)} />
          <Stat label="Retenciones sin facturar" value={pesos(s.pendingWithholdingCop)} />
          <Stat label="El más antiguo" value={s.oldestPendingDays === null ? "—" : `${s.oldestPendingDays} días`} />
        </div>
      )}
      {s && s.pendingBeforeRange > 0 && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Hay {s.pendingBeforeRange === 1 ? "1 pago" : `${s.pendingBeforeRange} pagos`} sin factura de antes de este rango.
          Amplía el inicio para verlos.
        </p>
      )}
      {report && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cobro</TableHead>
                <TableHead>Organización y concepto</TableHead>
                <TableHead className="text-right">Base gravada</TableHead>
                <TableHead className="text-right">Base excluida</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Retención</TableHead>
                <TableHead>Factura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground text-center">
                    {status === "PENDING" ? "Todos los pagos del rango tienen factura." : "No hay pagos en el rango."}
                  </TableCell>
                </TableRow>
              )}
              {report.rows.map((r) => (
                <TableRow
                  key={r.paymentId}
                  className={selected?.paymentId === r.paymentId ? "bg-muted/60" : "cursor-pointer"}
                  onClick={() => setSelected(r)}
                >
                  <TableCell>
                    {day(r.paidAt)}
                    <span className="text-muted-foreground block text-xs">{r.method}{r.reference ? ` · ${r.reference}` : ""}</span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{r.organizationName}</p>
                    <p className="text-muted-foreground text-xs">{r.concept}</p>
                  </TableCell>
                  <TableCell className="text-right">{pesos(r.taxableCop)}</TableCell>
                  <TableCell className="text-right">{pesos(r.exemptCop)}</TableCell>
                  <TableCell className="text-right">{pesos(r.vatCop)}</TableCell>
                  <TableCell className="text-right">{pesos(r.totalCop)}</TableCell>
                  <TableCell className="text-right">
                    {r.withholdingCop > 0 ? pesos(r.withholdingCop) : "—"}
                    {r.withholdingNote && <span className="text-muted-foreground block text-xs">{r.withholdingNote}</span>}
                  </TableCell>
                  <TableCell>
                    {r.invoice ? (
                      <>
                        <p className="font-medium">{r.invoice.invoiceNumber}</p>
                        <p className="text-muted-foreground text-xs">
                          {r.invoice.issuedOn ? day(r.invoice.issuedOn) : "Escrita al registrar el pago"}
                          {r.invoice.corrections > 0 ? ` · ${r.invoice.corrections === 1 ? "1 corrección" : `${r.invoice.corrections} correcciones`}` : ""}
                        </p>
                      </>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">
                        Sin factura · {r.daysWithoutInvoice === 1 ? "1 día" : `${r.daysWithoutInvoice ?? 0} días`}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {selected && (
        <InvoiceDetail
          key={selected.paymentId}
          row={selected}
          canConfirm={canConfirm}
          onClose={() => setSelected(null)}
          onSaved={async (message) => {
            setSelected(null);
            setSaved(message);
            await load();
          }}
        />
      )}
    </section>
  );
}

function InvoiceDetail({
  row,
  canConfirm,
  onClose,
  onSaved,
}: {
  row: InvoicingRow;
  canConfirm: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [history, setHistory] = useState<InvoiceHistory | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState(() => colombiaToday());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const correcting = !!row.invoice;

  useEffect(() => {
    getInvoiceHistory(row.paymentId)
      .then(setHistory)
      .catch(async (e) => setError(await errorText(e, "No se pudo consultar el historial de la factura.")));
  }, [row.paymentId]);

  const number = invoiceNumber.trim();
  const ready = number.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(issuedOn) && (!correcting || reason.trim().length >= 10);

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">
            {row.organizationName} · {pesos(row.totalCop)}
          </h3>
          <p className="text-muted-foreground text-sm">
            {row.concept} · cobrado el {day(row.paidAt)} · recibido {pesos(row.receivedCop)}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      {history && history.records.length > 0 && (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Historial</p>
          {history.typedAtRegistration && (
            <p className="text-muted-foreground">Escrita al registrar el pago: {history.typedAtRegistration}</p>
          )}
          {history.records.map((r) => (
            <p key={r.id} className={r.id === history.current?.recordId ? "" : "text-muted-foreground line-through"}>
              {r.invoiceNumber} · emitida el {day(r.issuedOn)} · registrada por {r.recordedByEmail}
              {r.reason ? ` · motivo: ${r.reason}` : ""}
            </p>
          ))}
        </div>
      )}

      {canConfirm ? (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ready) return;
            setSaving(true);
            setError("");
            try {
              const result = await recordInvoice(row.paymentId, {
                invoiceNumber: number,
                issuedOn,
                ...(correcting ? { reason: reason.trim() } : {}),
              });
              const base = `Factura ${number} ${result.corrected ? "corregida" : "registrada"} para ${row.organizationName}.`;
              await onSaved(
                result.sharedWithOtherPayments > 0
                  ? `${base} Ese número también está en ${result.sharedWithOtherPayments === 1 ? "otro pago" : `${result.sharedWithOtherPayments} pagos más`}: revisa que la factura los cubra.`
                  : base,
              );
            } catch (err) {
              setError(await errorText(err, "No se pudo registrar la factura."));
            } finally {
              setSaving(false);
            }
          }}
        >
          <p className="font-medium">{correcting ? "Corregir la factura" : "Registrar la factura emitida"}</p>
          <div className="flex flex-wrap gap-3">
            <label className="space-y-1 text-sm">
              <span>Número de la factura</span>
              <Input
                id={`invoice-number-${row.paymentId}`}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ej.: FE-1024"
                maxLength={40}
                className="w-56"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Fecha de emisión</span>
              <Input
                id={`invoice-date-${row.paymentId}`}
                type="date"
                value={issuedOn}
                max={colombiaToday()}
                onChange={(e) => setIssuedOn(e.target.value)}
                className="w-44"
              />
            </label>
          </div>
          {correcting && (
            <label className="block space-y-1 text-sm">
              <span>Motivo de la corrección (queda en el historial)</span>
              <Textarea
                id={`invoice-reason-${row.paymentId}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="Ej.: el facturador asignó otro consecutivo"
              />
            </label>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={!ready || saving}>
            {saving ? "Guardando…" : correcting ? "Guardar la corrección" : "Guardar la factura"}
          </Button>
          <p className="text-muted-foreground text-xs">
            Nada se borra: una corrección reemplaza a la factura anterior y las dos quedan en el historial.
          </p>
        </form>
      ) : (
        <p className="text-muted-foreground text-sm">Registrar facturas requiere el permiso de confirmar pagos.</p>
      )}
    </div>
  );
}
