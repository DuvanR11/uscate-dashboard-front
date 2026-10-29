"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatformAccess, usePlatformCapability } from "./access-context";
import {
  downloadMonthlyCloseCsv,
  getExchangeRates,
  getMonthlyClose,
  pesos,
  previousColombiaMonth,
  setExchangeRate,
  type ExchangeRate,
  type MonthlyCloseSummary,
} from "@/lib/api/monthly-close";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Fase 1 del plan de finanzas y catálogo (2026-10-29, tareas 1.2 y 1.4).
async function errorText(error: unknown, fallback: string) {
  const data = (
    error as { response?: { data?: { message?: string | string[] } | Blob } }
  )?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message as string;
    } catch {
      return fallback;
    }
  }
  return data && "message" in data && data.message
    ? [data.message].flat().join(" ")
    : fallback;
}

export function MonthlyClosePanel() {
  const access = usePlatformAccess();
  const caps = access?.capabilities ?? [];
  const allowed =
    !!access?.allOrganizations &&
    caps.includes("BILLING_READ") &&
    caps.includes("PROVIDER_COSTS_READ");
  // La escritura pide además PLATAFORMA con escritura, como el resto del panel.
  const canSetRate = usePlatformCapability("PROVIDER_COSTS_MANAGE");

  const [month, setMonth] = useState(previousColombiaMonth);
  const [summary, setSummary] = useState<MonthlyCloseSummary | null>(null);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<"" | "payments" | "costs">("");
  const [rateForm, setRateForm] = useState({ copPerUsd: "", source: "" });
  const [savingRate, setSavingRate] = useState(false);
  const [rateMessage, setRateMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSummary(null);
    try {
      const [s, r] = await Promise.all([getMonthlyClose(month), getExchangeRates()]);
      setSummary(s);
      setRates(r);
    } catch (e) {
      setError(await errorText(e, "No se pudo consultar el cierre del mes."));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    if (allowed && /^\d{4}-\d{2}$/.test(month)) void load();
  }, [allowed, month, load]);

  if (!allowed) return null;

  const rateOfMonth = rates.find((r) => r.month === month);
  const download = async (kind: "payments" | "costs") => {
    setDownloading(kind);
    setError("");
    try {
      await downloadMonthlyCloseCsv(kind, month);
    } catch (e) {
      setError(await errorText(e, "No se pudo descargar el archivo."));
    } finally {
      setDownloading("");
    }
  };
  const saveRate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingRate(true);
    setRateMessage("");
    try {
      await setExchangeRate(month, {
        copPerUsd: Number(rateForm.copPerUsd.replace(",", ".")),
        source: rateForm.source.trim(),
      });
      setRateForm({ copPerUsd: "", source: "" });
      setRateMessage("TRM guardada.");
      await load();
    } catch (e) {
      setRateMessage(await errorText(e, "No se pudo guardar la TRM."));
    } finally {
      setSavingRate(false);
    }
  };

  const rows: [string, number | null, string?][] = summary
    ? [
        ["Ingresos del mes, sin IVA", summary.payments.incomeBaseCop],
        ["IVA facturado", summary.payments.vatCop],
        ["Facturas de proveedores", summary.costs.invoicesCop],
        ["Utilidad operativa", summary.operatingProfitCop],
        ["Provisión de renta (35 %)", summary.incomeTaxProvisionCop],
        [
          "Consumo estimado de proveedores",
          summary.costs.usageEstimatedCop,
          "Referencia: no se suma a la utilidad, la cubren las facturas.",
        ],
      ]
    : [];

  return (
    <section className="space-y-4 rounded-xl border p-4" aria-label="Cierre del mes">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Cierre del mes para el contador</h2>
          <p className="text-sm text-muted-foreground">
            Pagos y costos de todas las organizaciones en el mes de Colombia.
            Las organizaciones de demostración y los pagos no confirmados se
            exportan marcados, pero no suman.
          </p>
        </div>
        <label className="text-sm">
          Mes
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-44"
          />
        </label>
      </div>

      {loading && <p role="status">Consultando el cierre…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}

      {summary && (
        <>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(([label, value, hint]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-lg font-semibold">
                  {value === null ? "Sin dato" : pesos(value)}
                </dd>
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
              </div>
            ))}
          </dl>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              {summary.payments.confirmed} pagos suman de {summary.payments.count}{" "}
              registrados en el mes.
            </li>
            {summary.costs.invoicesWithoutCop > 0 && (
              <li className="text-amber-700 dark:text-amber-400">
                {summary.costs.invoicesWithoutCop} facturas en dólares no
                suman porque falta la TRM.
              </li>
            )}
            {summary.costs.usageWithoutEstimate > 0 && (
              <li>
                {summary.costs.usageWithoutEstimate} usos de proveedores no
                tienen tarifa y quedan sin estimado.
              </li>
            )}
            <li>
              Las retenciones que practiquen los clientes se registran a mano
              hasta que el contador confirme cómo llevarlas.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!!downloading}
              onClick={() => download("payments")}
            >
              {downloading === "payments" ? "Descargando…" : "Descargar pagos (CSV)"}
            </Button>
            <Button
              variant="outline"
              disabled={!!downloading}
              onClick={() => download("costs")}
            >
              {downloading === "costs" ? "Descargando…" : "Descargar costos (CSV)"}
            </Button>
          </div>
        </>
      )}

      <div className="space-y-2 border-t pt-4">
        <h3 className="font-semibold">TRM del mes</h3>
        <p className="text-sm">
          {rateOfMonth
            ? `${month}: $${Number(rateOfMonth.copPerUsd).toLocaleString("es-CO")} por dólar (${rateOfMonth.source}).`
            : summary?.trm
              ? `${month} no tiene TRM propia: se usa la de ${summary.trm.month}, $${summary.trm.copPerUsd.toLocaleString("es-CO")} por dólar.`
              : `${month} no tiene TRM. Las tarifas en dólares quedan sin estimado.`}
        </p>
        {canSetRate && (
          <form className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end" onSubmit={saveRate}>
            <label className="text-sm">
              Pesos por dólar
              <Input
                inputMode="decimal"
                required
                value={rateForm.copPerUsd}
                onChange={(e) =>
                  setRateForm({ ...rateForm, copPerUsd: e.target.value.replace(/[^\d.,]/g, "") })
                }
                placeholder="4000"
              />
            </label>
            <label className="text-sm">
              De dónde sale
              <Input
                required
                minLength={3}
                maxLength={300}
                value={rateForm.source}
                onChange={(e) => setRateForm({ ...rateForm, source: e.target.value })}
                placeholder="Promedio del mes, Superfinanciera"
              />
            </label>
            <Button type="submit" disabled={savingRate}>
              {savingRate ? "Guardando…" : rateOfMonth ? "Cambiar TRM" : "Guardar TRM"}
            </Button>
          </form>
        )}
        {rateMessage && (
          <p role="status" className="text-sm">
            {rateMessage}
          </p>
        )}
      </div>
    </section>
  );
}
