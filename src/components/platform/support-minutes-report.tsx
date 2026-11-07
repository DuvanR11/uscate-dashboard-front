"use client";
// Fase 7 del plan de finanzas (2026-11-08), «medir y revisar»: minutos de
// soporte por organización y por mes, contra lo previsto por su plan. El
// cálculo lo hace el servidor (`support-minutes.service.ts`); aquí solo se
// muestra.
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { QuerySection } from "./query-section";
import {
  getSupportMinutes,
  type SupportMinutesRow,
} from "@/lib/api/support-minutes";

const monthLabel = (month: string) => {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 15)).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};
const n = (value: number) => value.toLocaleString("es-CO");

function Row({ row }: { row: SupportMinutesRow }) {
  return (
    <tr className={`border-t ${row.overExpected ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
      <td className="px-3 py-2">
        <p className="font-medium">{row.organizationName}</p>
        <p className="text-xs text-muted-foreground">
          {row.planCode ? `${row.planCode} · ${row.planName ?? ""}` : "Sin plan comercial"}
        </p>
      </td>
      <td className="px-3 py-2">
        {n(row.ticketMinutes)}
        {row.ticketActionsWithoutMinutes > 0 && (
          <p className="text-xs text-muted-foreground">
            {n(row.ticketActionsWithoutMinutes)} de {n(row.ticketActions)} acciones sin minutos
          </p>
        )}
      </td>
      <td className="px-3 py-2">{n(row.sessionMinutes)}</td>
      <td className="px-3 py-2">{n(row.purchasedMinutes)}</td>
      <td className="px-3 py-2">
        {n(row.includedHoursMinutes)}
        {row.trialMinutes > 0 && (
          <p className="text-xs text-muted-foreground">Prueba: {n(row.trialMinutes)}</p>
        )}
      </td>
      <td className="px-3 py-2">
        {n(row.noChargeMinutes)}
        {row.pendingMinutes > 0 && (
          <p className="text-xs text-muted-foreground">Por conciliar: {n(row.pendingMinutes)}</p>
        )}
      </td>
      <td className="px-3 py-2 font-semibold">{n(row.absorbedMinutes)}</td>
      <td className="px-3 py-2">
        {row.expectedMinutes === null ? "Sin dato" : n(row.expectedMinutes)}
      </td>
      <td className="px-3 py-2">
        {row.overExpected ? (
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            Pasa lo previsto
          </span>
        ) : row.expectedMinutes === null ? (
          "—"
        ) : (
          "Dentro de lo previsto"
        )}
      </td>
    </tr>
  );
}

export function SupportMinutesReport({ organizationId }: { organizationId?: string }) {
  const [months, setMonths] = useState(3),
    [revision, setRevision] = useState(0);
  const load = useCallback(
    () => getSupportMinutes(months, organizationId),
    [months, organizationId],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Minutos de soporte por organización</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            Meses
            <select
              className="block rounded-md border bg-background p-2"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              {[1, 3, 6, 12].map((m) => (
                <option key={m} value={m}>
                  {m === 1 ? "Este mes" : `Últimos ${m}`}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={() => setRevision((r) => r + 1)}>
            Actualizar
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Minutos registrados en cada acción de un ticket y tiempo efectivo de las
        sesiones de la agenda, por mes de Colombia. «Absorbido» es todo menos las
        horas vendidas: lo que tiene que cubrir el precio del plan. Se compara con
        el soporte previsto del modelo financiero más las horas incluidas del plan
        vigente. No incluye organizaciones de demostración.
      </p>
      <QuerySection key={`${revision}-${months}`} title="Reporte de minutos" load={load}>
        {(report) =>
          report.rows.length ? (
            <div className="space-y-4">
              {report.months
                .filter((month) => report.rows.some((r) => r.month === month))
                .map((month) => {
                  const rows = report.rows.filter((r) => r.month === month);
                  const over = rows.filter((r) => r.overExpected).length;
                  return (
                    <div key={month} className="space-y-2">
                      <h3 className="font-semibold capitalize">
                        {monthLabel(month)}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {n(rows.reduce((s, r) => s + r.absorbedMinutes, 0))} min absorbidos
                          {over > 0 && ` · ${n(over)} pasan lo previsto`}
                        </span>
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[56rem] text-left text-sm">
                          <thead>
                            <tr>
                              {[
                                "Organización",
                                "Tickets",
                                "Sesiones",
                                "Horas vendidas",
                                "Horas incluidas",
                                "Sin cobro",
                                "Absorbido",
                                "Previsto",
                                "Estado",
                              ].map((h) => (
                                <th key={h} className="px-3 py-2">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <Row key={`${row.organizationId}-${row.month}`} row={row} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              <p className="text-xs text-muted-foreground">
                Minutos en cada columna. {report.expectedSource} Las acciones del equipo
                sin minutos no se estiman: registra los minutos al atender cada ticket.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin minutos de soporte registrados en el período. Registra los minutos al
              atender cada ticket para que aparezcan aquí.
            </p>
          )
        }
      </QuerySection>
    </div>
  );
}
