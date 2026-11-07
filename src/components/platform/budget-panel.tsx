"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlatformAccess } from "./access-context";
import { percent } from "@/lib/api/finance-overview";
import { pesos } from "@/lib/api/monthly-close";
import {
  currentColombiaMonth,
  downloadBudgetExport,
  getBudgetChanges,
  getBudgetProjection,
  getBudgetReport,
  LIGHT_LABEL,
  METHOD_LABEL,
  parseBudgetFile,
  setBudget,
  setBudgetNote,
  setBudgetTeamActual,
  shiftMonth,
  STATUS_LABEL,
  type BudgetChange,
  type BudgetLight,
  type BudgetMonthInput,
  type BudgetMonthRow,
  type BudgetProjection,
  type BudgetReport,
} from "@/lib/api/platform-budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Fase 6c del plan de finanzas y catálogo (2026-11-07): presupuesto mensual
// con semáforo por rubro, proyección del cierre y exportación al libro.
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

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DOT: Record<BudgetLight, string> = {
  GREEN: "bg-emerald-600",
  YELLOW: "bg-amber-500",
  RED: "bg-red-600",
  NO_BUDGET: "bg-red-600",
  PENDING: "bg-slate-300",
};
const money = (value: number | null) => (value === null ? "—" : pesos(value));
const signedPercent = (value: number | null) =>
  value === null ? "—" : `${value > 0 ? "+" : ""}${percent(value)}`;
const negative = (value: number | null) =>
  value !== null && value < 0 ? "text-destructive font-medium" : "";
const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(
        new Date(iso),
      )
    : "";

/** Luz con su texto: el color nunca va solo. */
function Light({ light, compact = false }: { light: BudgetLight; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className={`inline-block size-2.5 rounded-full ${DOT[light]}`} />
      <span className={compact ? "text-xs" : "text-sm"}>{LIGHT_LABEL[light]}</span>
    </span>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

export function BudgetPanel() {
  const access = usePlatformAccess();
  const caps = access?.capabilities ?? [];
  const allowed = !!access?.allOrganizations && caps.includes("BILLING_READ") && caps.includes("PROVIDER_COSTS_READ");
  const canManage = allowed && caps.includes("PROVIDER_COSTS_MANAGE");

  const current = currentColombiaMonth();
  const [from, setFrom] = useState(() => shiftMonth(current, -2));
  const [to, setTo] = useState(() => shiftMonth(current, 3));
  const [report, setReport] = useState<BudgetReport | null>(null);
  const [projection, setProjection] = useState<BudgetProjection | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const valid = MONTH.test(from) && MONTH.test(to) && from <= to;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [r, p] = await Promise.all([getBudgetReport(from, to), getBudgetProjection(12)]);
      setReport(r);
      setProjection(p);
    } catch (e) {
      setError(await errorText(e, "No se pudo consultar el presupuesto."));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (allowed && valid) void load();
  }, [allowed, valid, load]);

  const selectedRow = useMemo(
    () => report?.months.find((m) => m.month === selected) ?? null,
    [report, selected],
  );

  if (!allowed)
    return (
      <p className="rounded-xl border p-4">
        Para ver el presupuesto necesitas consultar pagos y costos de proveedores de todas las organizaciones. Pídele
        ese permiso al administrador principal.
      </p>
    );

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadBudgetExport(from, to);
    } catch (e) {
      setError(await errorText(e, "No se pudo descargar el archivo."));
    } finally {
      setDownloading(false);
    }
  };

  const s = report?.summary;
  return (
    <section className="space-y-8" aria-label="Presupuesto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold">Presupuesto del mes</h2>
          <p className="text-sm text-muted-foreground">
            Lo real frente al presupuesto del libro del modelo (escenario medio), por rubro. Un rubro que se desvía
            más del 20 % se explica por escrito. Los ingresos son devengados, comparables con el MRR del libro; el
            mes en curso se lleva a fin de mes.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm" htmlFor="budget-from">
            Desde
            <Input id="budget-from" type="month" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-44" />
          </label>
          <label className="text-sm" htmlFor="budget-to">
            Hasta
            <Input id="budget-to" type="month" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-44" />
          </label>
          <Button variant="outline" disabled={!report || downloading} onClick={download}>
            {downloading ? "Descargando…" : "Exportar al libro (CSV)"}
          </Button>
        </div>
      </div>

      {!valid && (
        <p role="alert" className="text-sm text-destructive">
          Elige meses válidos: el mes inicial no puede ser posterior al final (hasta 12 meses).
        </p>
      )}
      {loading && <p role="status">Consultando el presupuesto…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}

      {report && s && (
        <>
          {(s.missingExplanations.length > 0 || s.monthsWithoutBudget.length > 0 || s.red.length > 0) && (
            <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              {s.missingExplanations.length > 0 && (
                <li>
                  <strong>Falta explicar</strong> la desviación de {s.missingExplanations.join(", ")}.
                </li>
              )}
              {s.red.length > 0 && <li>Fuera de rango: {s.red.join(", ")}.</li>}
              {s.monthsWithoutBudget.length > 0 && (
                <li>
                  Sin presupuesto cargado: {s.monthsWithoutBudget.join(", ")}. Cárgalo desde el libro del modelo.
                </li>
              )}
            </ul>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>Estado</TableHead>
                  {report.months[0]?.rubros.map((r) => (
                    <TableHead key={r.rubro}>{r.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">Presupuestado</TableHead>
                  <TableHead>Explicación</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.months.map((m) => (
                  <TableRow key={m.month} data-state={m.month === selected ? "selected" : undefined}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell>
                      {STATUS_LABEL[m.status]}
                      {m.status === "CURRENT" && (
                        <span className="block text-xs text-muted-foreground">{percent(m.elapsedShare)} del mes</span>
                      )}
                    </TableCell>
                    {m.rubros.map((r) => (
                      <TableCell key={r.rubro}>
                        <Light light={r.light} compact />
                        <span className="block text-xs text-muted-foreground">{signedPercent(r.deviation)}</span>
                      </TableCell>
                    ))}
                    <TableCell className={`text-right ${negative(m.resultCop)}`}>{money(m.resultCop)}</TableCell>
                    <TableCell className={`text-right ${negative(m.budgetResultCop)}`}>{money(m.budgetResultCop)}</TableCell>
                    <TableCell>
                      {m.missingExplanation ? (
                        <span className="font-medium text-destructive">Falta explicar</span>
                      ) : m.deviationNote ? (
                        "Escrita"
                      ) : m.needsExplanation ? (
                        "—"
                      ) : (
                        <span className="text-muted-foreground">No hace falta</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-expanded={m.month === selected}
                        onClick={() => setSelected(m.month === selected ? null : m.month)}
                      >
                        {m.month === selected ? "Cerrar" : "Detalle"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {selectedRow && (
            <MonthDetail key={selectedRow.month} row={selectedRow} canManage={canManage} onSaved={load} />
          )}
        </>
      )}

      {projection && <ProjectionSection projection={projection} />}

      {canManage && <BudgetUpload onSaved={load} />}
    </section>
  );
}

function MonthDetail({ row, canManage, onSaved }: { row: BudgetMonthRow; canManage: boolean; onSaved: () => Promise<void> }) {
  const [note, setNote] = useState(row.deviationNote ?? "");
  const [team, setTeam] = useState(row.rubros.find((r) => r.rubro === "team")?.actualCop?.toString() ?? "");
  const [teamReason, setTeamReason] = useState("");
  const [changes, setChanges] = useState<BudgetChange[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const run = async (work: () => Promise<unknown>, done: string, fallback: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      setMessage(done);
      await onSaved();
    } catch (e) {
      setError(await errorText(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  const teamValue = team.trim() === "" ? null : Number(team.replace(/\./g, "").replace(",", "."));
  const teamValid = teamValue === null || (Number.isFinite(teamValue) && teamValue >= 0);

  return (
    <section className="space-y-4 rounded-lg border p-4" aria-label={`Detalle de ${row.month}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {row.month} · {STATUS_LABEL[row.status]} · <Light light={row.light} />
        </h3>
        {row.source && (
          <p className="text-xs text-muted-foreground">
            Presupuesto: {row.source}
            {row.setByEmail ? `, cargado por ${row.setByEmail}` : ""}
            {row.updatedAt ? ` el ${when(row.updatedAt)}` : ""}.
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rubro</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead className="text-right">Real</TableHead>
              <TableHead className="text-right">Comparado</TableHead>
              <TableHead>Cómo</TableHead>
              <TableHead className="text-right">Desvío</TableHead>
              <TableHead>Semáforo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.rubros.map((r) => (
              <TableRow key={r.rubro}>
                <TableCell>{r.label}</TableCell>
                <TableCell className="text-right">{money(r.budgetCop)}</TableCell>
                <TableCell className="text-right">{money(r.actualCop)}</TableCell>
                <TableCell className="text-right">{money(r.comparedCop)}</TableCell>
                <TableCell className="text-xs">{r.method ? METHOD_LABEL[r.method] : "—"}</TableCell>
                <TableCell className="text-right">
                  {signedPercent(r.deviation)}
                  {r.favorable !== null && r.deviation !== null && r.deviation !== 0 && (
                    <span className="block text-xs text-muted-foreground">{r.favorable ? "a favor" : "en contra"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Light light={r.light} />
                  {r.needsExplanation && <span className="block text-xs text-muted-foreground">Se explica</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Ingresos de caja (sin IVA)</dt>
          <dd>{money(row.incomeCashCop)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Retenciones practicadas</dt>
          <dd>{money(row.withholdingCop)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Variables estimados (sin factura)</dt>
          <dd>{money(row.variableEstimatedCop)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Inversión única presupuestada</dt>
          <dd>{money(row.oneTimeBudgetCop)}</dd>
        </div>
      </dl>
      {row.invoices === 0 && row.status !== "FUTURE" && (
        <p className="text-sm text-muted-foreground">
          Sin facturas de proveedores registradas este mes: infraestructura y administración quedan sin dato. Se
          registran en Infraestructura → Costos.
        </p>
      )}
      {row.invoicesWithoutCop.length > 0 && (
        <p className="text-sm text-amber-800">
          Facturas sin importe en pesos (falta la TRM o el valor pagado), fuera de la suma: {row.invoicesWithoutCop.join(", ")}.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`note-${row.month}`}>
            Explicación de la desviación
          </label>
          {row.deviationNote && (
            <p className="text-xs text-muted-foreground">
              Escrita por {row.deviationNoteByEmail} el {when(row.deviationNoteAt)}.
            </p>
          )}
          <Textarea
            id={`note-${row.month}`}
            value={note}
            disabled={!canManage || !row.hasBudget || busy}
            onChange={(e) => setNote(e.target.value)}
            placeholder={row.hasBudget ? "Qué pasó con el rubro que se desvió y qué se hace al respecto." : "Carga primero el presupuesto de este mes."}
            rows={4}
          />
          {canManage && row.hasBudget && (
            <Button
              size="sm"
              disabled={busy || note.trim().length < 10 || note.trim() === (row.deviationNote ?? "")}
              onClick={() => run(() => setBudgetNote(row.month, note.trim()), "Explicación guardada.", "No se pudo guardar la explicación.")}
            >
              Guardar explicación
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`team-${row.month}`}>
            Real de equipo y horas (pesos)
          </label>
          <p className="text-xs text-muted-foreground">No sale del sistema: nómina, honorarios y horas pagadas del mes.</p>
          <Input
            id={`team-${row.month}`}
            inputMode="decimal"
            value={team}
            disabled={!canManage || !row.hasBudget || row.status === "FUTURE" || busy}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="Vacío = sin dato"
          />
          {canManage && row.hasBudget && row.status !== "FUTURE" && (
            <>
              <Input
                aria-label="Motivo del cambio"
                value={teamReason}
                disabled={busy}
                onChange={(e) => setTeamReason(e.target.value)}
                placeholder="Motivo (p. ej. «Honorarios del contador y 6 h de soporte»)"
              />
              {!teamValid && <p className="text-xs text-destructive">Escribe un valor en pesos, sin signo.</p>}
              <Button
                size="sm"
                disabled={busy || !teamValid || teamReason.trim().length < 3}
                onClick={() =>
                  run(
                    () => setBudgetTeamActual(row.month, teamValue, teamReason.trim()),
                    "Real de equipo guardado.",
                    "No se pudo guardar el real de equipo.",
                  )
                }
              >
                Guardar real de equipo
              </Button>
            </>
          )}
        </div>
      </div>

      {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              setChanges(await getBudgetChanges(row.month));
            } catch (e) {
              setError(await errorText(e, "No se pudo consultar el historial."));
            }
          }}
        >
          Ver historial de cambios
        </Button>
        {changes &&
          (changes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {changes.map((c) => (
                <li key={c.id}>
                  {when(c.createdAt)} · {c.operatorEmail} ·{" "}
                  {c.kind === "BUDGET" ? "Presupuesto" : c.kind === "TEAM_ACTUAL" ? "Real de equipo" : "Explicación"} ·{" "}
                  {c.reason}
                </li>
              ))}
            </ul>
          ))}
      </div>
    </section>
  );
}

function ProjectionSection({ projection }: { projection: BudgetProjection }) {
  const p = projection;
  return (
    <Section
      title="Proyección del cierre"
      hint="MRR vigente × meses − costos: el ingreso recurrente de este mes se sostiene; los fijos salen del presupuesto (o del último cargado) y lo variable sigue el ritmo actual. «Contratado» es lo que ya está pagado para ese mes."
    >
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <dt className="text-sm text-muted-foreground">MRR vigente</dt>
          <dd className="text-lg font-semibold">{pesos(p.mrrCop)}</dd>
          <p className="text-xs text-muted-foreground">Suscripciones y complementos mensuales devengados este mes.</p>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-sm text-muted-foreground">Ritmo variable mensual</dt>
          <dd className="text-lg font-semibold">{pesos(p.variableRunRateCop)}</dd>
          <p className="text-xs text-muted-foreground">
            {p.variableRunRateMethod === "CURRENT_MONTH" ? "El de este mes, llevado a fin de mes." : "El del mes anterior (este mes apenas empieza)."}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-sm text-muted-foreground">Resultado proyectado ({p.months.length} meses)</dt>
          <dd className={`text-lg font-semibold ${negative(p.totals.resultCop)}`}>{money(p.totals.resultCop)}</dd>
          {p.totals.resultCop === null && <p className="text-xs text-muted-foreground">Falta presupuesto de fijos.</p>}
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-sm text-muted-foreground">Resultado presupuestado</dt>
          <dd className={`text-lg font-semibold ${negative(p.totals.budgetResultCop)}`}>{money(p.totals.budgetResultCop)}</dd>
          {p.totals.budgetResultCop === null && (
            <p className="text-xs text-muted-foreground">Algún mes no tiene presupuesto cargado.</p>
          )}
        </div>
      </dl>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Ingreso proyectado</TableHead>
              <TableHead className="text-right">Contratado</TableHead>
              <TableHead className="text-right">Variables</TableHead>
              <TableHead className="text-right">Fijos</TableHead>
              <TableHead className="text-right">Resultado</TableHead>
              <TableHead className="text-right">Acumulado</TableHead>
              <TableHead className="text-right">Presupuestado</TableHead>
              <TableHead className="text-right">Acumulado presupuestado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {p.months.map((m) => (
              <TableRow key={m.month}>
                <TableCell className="font-medium">{m.month}</TableCell>
                <TableCell className="text-right">{pesos(m.incomeCop)}</TableCell>
                <TableCell className="text-right">{pesos(m.contractedCop)}</TableCell>
                <TableCell className="text-right">{pesos(m.variableCop)}</TableCell>
                <TableCell className="text-right">
                  {money(m.fixedCop)}
                  {m.fixedFrom === "PREVIOUS_BUDGET" && (
                    <span className="block text-xs text-muted-foreground">del último presupuesto</span>
                  )}
                </TableCell>
                <TableCell className={`text-right ${negative(m.resultCop)}`}>{money(m.resultCop)}</TableCell>
                <TableCell className={`text-right ${negative(m.cumulativeCop)}`}>{money(m.cumulativeCop)}</TableCell>
                <TableCell className={`text-right ${negative(m.budgetResultCop)}`}>{money(m.budgetResultCop)}</TableCell>
                <TableCell className={`text-right ${negative(m.cumulativeBudgetCop)}`}>{money(m.cumulativeBudgetCop)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}

function BudgetUpload({ onSaved }: { onSaved: () => Promise<void> }) {
  const [rows, setRows] = useState<BudgetMonthInput[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const read = async (file: File | undefined) => {
    setRows(null);
    setMessage("");
    setError("");
    if (!file) return;
    setFileName(file.name);
    const parsed = parseBudgetFile(await file.text());
    if ("error" in parsed) setError(parsed.error);
    else {
      setRows(parsed.months);
      if (!source) setSource(`${file.name}, escenario medio`);
    }
  };

  const save = async () => {
    if (!rows) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await setBudget({ source: source.trim(), reason: reason.trim(), months: rows });
      setMessage(
        `Guardados ${result.saved.length} meses${result.unchanged.length ? `; ${result.unchanged.length} ya estaban iguales` : ""}.`,
      );
      setRows(null);
      await onSaved();
    } catch (e) {
      setError(await errorText(e, "No se pudo cargar el presupuesto."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Cargar el presupuesto del libro"
      hint="Genera el archivo con docs/reestructuracion-comercial/exportar-presupuesto-para-panel.py (lee la hoja Presupuesto del modelo). Un mes que ya existe se reemplaza; el real de equipo y la explicación se conservan, y cada cambio queda en el historial."
    >
      <div className="grid gap-3 rounded-lg border p-4 lg:grid-cols-2">
        <label className="text-sm" htmlFor="budget-file">
          Archivo (CSV)
          <Input id="budget-file" type="file" accept=".csv,text/csv" className="mt-1" onChange={(e) => read(e.target.files?.[0])} />
        </label>
        <label className="text-sm" htmlFor="budget-source">
          De dónde sale
          <Input id="budget-source" value={source} onChange={(e) => setSource(e.target.value)} className="mt-1" placeholder="Libro del modelo, escenario medio, fecha" />
        </label>
        <label className="text-sm lg:col-span-2" htmlFor="budget-reason">
          Motivo
          <Input id="budget-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" placeholder="p. ej. «Presupuesto 2027 aprobado en la reunión del …»" />
        </label>
        {rows && (
          <p className="text-sm lg:col-span-2">
            {fileName}: {rows.length} meses, de {rows[0]?.month} a {rows[rows.length - 1]?.month}. Ingresos del primer mes{" "}
            {pesos(rows[0]?.incomeCop ?? 0)}; fijos{" "}
            {pesos((rows[0]?.infrastructureCop ?? 0) + (rows[0]?.administrationCop ?? 0) + (rows[0]?.teamCop ?? 0))}.
          </p>
        )}
        <div className="lg:col-span-2">
          <Button disabled={!rows || busy || source.trim().length < 3 || reason.trim().length < 3} onClick={save}>
            {busy ? "Guardando…" : "Cargar presupuesto"}
          </Button>
        </div>
        {message && <p role="status" className="text-sm text-emerald-800 lg:col-span-2">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive lg:col-span-2">{error}</p>}
      </div>
    </Section>
  );
}
