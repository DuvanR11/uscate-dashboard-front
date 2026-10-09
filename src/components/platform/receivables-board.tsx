"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlatformCapability } from "./access-context";
import {
  exportReceivables,
  getReceivables,
  receivableMoney,
  RECEIVABLE_AGING,
  RECEIVABLE_STATE,
  type ReceivablesReport,
} from "@/lib/api/receivables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const date = (value: string) =>
  new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" });
async function message(error: unknown) {
  const response = (
    error as { response?: { data?: { message?: string | string[] } | Blob } }
  )?.response?.data;
  if (response instanceof Blob) {
    try {
      return JSON.parse(await response.text()).message as string;
    } catch {
      return "No se pudo exportar la cartera.";
    }
  }
  return response && "message" in response
    ? [response.message].flat().join(" ")
    : "No se pudo consultar la cartera. Intenta nuevamente.";
}
export function ReceivablesBoard() {
  const allowed = usePlatformCapability("BILLING_READ");
  const [filters, setFilters] = useState({
    search: "",
    state: "",
    aging: "",
    currency: "",
    from: "",
    to: "",
  });
  const [params, setParams] = useState("page=1&pageSize=25");
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState<ReceivablesReport | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState("");
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    // Clear previous scope/filter results while reloading; never label old data as new.
    setLoading(true);
    setError("");
    setReport(null);
    setExportError("");
    getReceivables(params)
      .then((data) => {
        if (active) setReport(data);
      })
      .catch(async (e) => {
        const text = await message(e);
        if (active) setError(text);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed, params, revision]);
  if (!allowed) return <p>No tienes permiso para consultar la cartera.</p>;
  const changePage = (page: number) => {
    const query = new URLSearchParams(params);
    query.set("page", String(page));
    setParams(query.toString());
  };
  const download = async () => {
    setExporting(true);
    setExportError("");
    try {
      await exportReceivables(params);
    } catch (e) {
      setExportError(await message(e));
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cartera comercial</h1>
          <p className="text-muted-foreground">
            Órdenes de cobro, ingresos verificados y saldos por organización.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading || exporting}
          onClick={download}
        >
          {exporting ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>
      <p className="rounded-lg border bg-muted/30 p-4 text-sm">
        El plazo corresponde a la fecha límite de cada orden. Un saldo fuera de
        plazo requiere seguimiento; no acredita mora contable. Los comprobantes
        en revisión no se cuentan como ingresos. Los pagos manuales históricos y
        las cuotas futuras no están incluidos.
      </p>
      <form
        className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const query = new URLSearchParams({ page: "1", pageSize: "25" });
          Object.entries(filters).forEach(([k, v]) => {
            if (v.trim()) query.set(k, v.trim());
          });
          setParams(query.toString());
          setRevision((r) => r + 1);
        }}
      >
        <label className="text-sm">
          Organización o ID de orden
          <Input
            value={filters.search}
            maxLength={100}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Buscar organización u orden"
          />
        </label>
        <label className="text-sm">
          Estado
          <select
            className="mt-1 h-9 w-full rounded-md border bg-background px-2"
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
          >
            <option value="">Todos los estados</option>
            {Object.entries(RECEIVABLE_STATE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Antigüedad del saldo
          <select
            className="mt-1 h-9 w-full rounded-md border bg-background px-2"
            value={filters.aging}
            onChange={(e) => setFilters({ ...filters, aging: e.target.value })}
          >
            <option value="">Todas las antigüedades</option>
            {Object.entries(RECEIVABLE_AGING).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Moneda
          <Input
            value={filters.currency}
            maxLength={3}
            placeholder="Todas (COP, USD…)"
            onChange={(e) =>
              setFilters({
                ...filters,
                currency: e.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
              })
            }
          />
        </label>
        <label className="text-sm">
          Órdenes creadas desde
          <Input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Órdenes creadas hasta
          <Input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={loading}>
            Aplicar filtros
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setFilters({
                search: "",
                state: "",
                aging: "",
                currency: "",
                from: "",
                to: "",
              });
              setParams("page=1&pageSize=25");
              setRevision((r) => r + 1);
            }}
          >
            Limpiar
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={() => setRevision((r) => r + 1)}
          >
            Actualizar
          </Button>
        </div>
      </form>
      {exportError && (
        <p role="alert" className="text-destructive">
          {exportError}
        </p>
      )}
      {loading && <p role="status">Consultando cartera…</p>}
      {error && (
        <div role="alert">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => setRevision((r) => r + 1)}>
            Reintentar consulta
          </Button>
        </div>
      )}
      {report && (
        <>
          <p className="text-sm text-muted-foreground">
            Corte: {date(report.asOf)} · {report.total} órdenes en tu ámbito y
            filtros. Las fechas usan el horario de Colombia. La exportación
            consulta todas las coincidencias, hasta 5.000 órdenes, con un nuevo
            corte.
          </p>
          {report.summaries.map((s) => (
            <section
              key={s.currency}
              className="space-y-4 rounded-xl border p-4"
              aria-label={`Resumen ${s.currency}`}
            >
              <h2 className="font-semibold">
                Resumen {s.currency} · {s.orders} órdenes
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Total de órdenes", s.totalAmount],
                  ["Ingreso verificado", s.receivedAmount],
                  ["Pendiente de cobro", s.outstandingAmount],
                  ["Dentro del plazo", s.notDueAmount],
                  ["Fuera del plazo", s.overdueAmount],
                  ["Excedentes pendientes de gestión", s.excessAmount],
                ].map(([label, amount]) => (
                  <div key={label}>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="break-words text-lg font-semibold">
                      {receivableMoney(amount, s.currency)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm">
                {s.paidPendingApplication} órdenes pagadas pendientes de aplicar
                · {s.pendingReviews} comprobantes pendientes de revisión.
              </p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["0–30 días", s.due0To30],
                  ["31–60 días", s.due31To60],
                  ["61–90 días", s.due61To90],
                  ["91 días o más", s.due91Plus],
                ].map(([label, amount]) => (
                  <div key={label}>
                    <dt>{label} fuera de plazo</dt>
                    <dd className="font-medium">
                      {receivableMoney(amount, s.currency)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {!report.rows.length ? (
            <p>No hay órdenes que coincidan con los filtros.</p>
          ) : (
            <section className="space-y-3" aria-label="Órdenes de cartera">
              {report.rows.map((row) => (
                <article key={row.id} className="min-w-0 rounded-xl border p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <Link
                      href={`/platform/organizations/${row.organizationId}`}
                      className="font-semibold text-primary underline"
                    >
                      {row.organizationName}
                    </Link>
                    <span className="text-sm">
                      {RECEIVABLE_STATE[row.state]}
                    </span>
                  </div>
                  <p className="break-all text-xs text-muted-foreground">
                    Orden {row.id} · Cotización v{row.quoteVersion}
                  </p>
                  <dl className="my-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      ["Total", row.totalAmount],
                      ["Verificado", row.receivedAmount],
                      ["Asignado a orden", row.allocatedAmount],
                      ["Pendiente", row.outstandingAmount],
                      ["Excedente", row.excessAmount],
                    ].map(([label, amount]) => (
                      <div key={label}>
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="break-words font-medium">
                          {receivableMoney(amount, row.currency)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-sm">
                    Límite: {date(row.dueAt)} · {RECEIVABLE_AGING[row.aging]}
                    {row.daysPastDue !== null
                      ? ` (${row.daysPastDue} días completos)`
                      : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Creada: {date(row.createdAt)}
                    {row.appliedAt ? ` · Aplicada: ${date(row.appliedAt)}` : ""}
                  </p>
                  {row.pendingReviews > 0 && (
                    <p className="text-sm">
                      {row.pendingReviews} comprobantes por revisar.
                    </p>
                  )}
                  {row.requiresReconciliation && !row.appliedAt && (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Revisar conciliación antes de aplicar el pago al plan.
                    </p>
                  )}
                  <Link
                    href={`/platform/organizations/${row.organizationId}`}
                    className="mt-2 inline-block text-sm text-primary underline"
                  >
                    Abrir ficha para revisar Cobros y Gestiones
                  </Link>
                </article>
              ))}
            </section>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={report.page <= 1}
              onClick={() => changePage(report.page - 1)}
            >
              Anterior
            </Button>
            <p className="text-sm">
              Página {report.page} de{" "}
              {Math.max(1, Math.ceil(report.total / report.pageSize))}
            </p>
            <Button
              variant="outline"
              disabled={report.page * report.pageSize >= report.total}
              onClick={() => changePage(report.page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
