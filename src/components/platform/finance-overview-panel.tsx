"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePlatformAccess } from "./access-context";
import {
  downloadFinanceCsv,
  getFinanceOverview,
  percent,
  SEGMENT_LABEL,
  type FinanceMoney,
  type FinanceOverview,
} from "@/lib/api/finance-overview";
import { pesos, previousColombiaMonth } from "@/lib/api/monthly-close";
import { usageModuleLabel } from "@/lib/provider-usage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Fase 6a del plan de finanzas y catálogo (2026-11-07): cuánto dejó cada plan
// y qué organización cuesta más de lo que paga. Todo lo calcula el servidor.
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
const marginClass = (value: number) =>
  value < 0 ? "text-destructive font-medium" : undefined;

function MoneyCells({ row }: { row: FinanceMoney }) {
  return (
    <>
      <TableCell className="text-right">{pesos(row.cashCop)}</TableCell>
      <TableCell className="text-right">{pesos(row.accruedCop)}</TableCell>
      <TableCell className="text-right">{pesos(row.variableCostCop)}</TableCell>
      <TableCell className={`text-right ${marginClass(row.marginCop) ?? ""}`}>
        {pesos(row.marginCop)}
      </TableCell>
      <TableCell className="text-right">{percent(row.marginRate)}</TableCell>
    </>
  );
}
const MONEY_HEADS = ["Cobrado (caja)", "Devengado", "Costo variable", "Margen", "Margen %"];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="overflow-x-auto rounded-lg border">{children}</div>
    </section>
  );
}

export function FinanceOverviewPanel() {
  const access = usePlatformAccess();
  const caps = access?.capabilities ?? [];
  const allowed =
    !!access?.allOrganizations &&
    caps.includes("BILLING_READ") &&
    caps.includes("PROVIDER_COSTS_READ");

  const [from, setFrom] = useState(previousColombiaMonth);
  const [to, setTo] = useState(previousColombiaMonth);
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const valid = MONTH.test(from) && MONTH.test(to) && from <= to;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      setData(await getFinanceOverview(from, to));
    } catch (e) {
      setError(await errorText(e, "No se pudo consultar la visibilidad financiera."));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (allowed && valid) void load();
  }, [allowed, valid, load]);

  if (!allowed)
    return (
      <p className="rounded-xl border p-4">
        Para ver las finanzas necesitas consultar pagos y costos de proveedores
        de todas las organizaciones. Pídele ese permiso al administrador
        principal.
      </p>
    );

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadFinanceCsv(from, to);
    } catch (e) {
      setError(await errorText(e, "No se pudo descargar el archivo."));
    } finally {
      setDownloading(false);
    }
  };

  const t = data?.totals;
  const cards: [string, number, string?][] = t
    ? [
        ["Ingreso devengado", t.accruedCop, "Base del margen: lo que corresponde al periodo, sin IVA."],
        ["Cobrado en el periodo (caja)", t.cashCop, `${t.paymentsCounted} pagos confirmados, sin IVA.`],
        ["Costo variable de los clientes", t.variableCostCop, "Proveedores (IA, SMS, correo) estimados con las tarifas vigentes."],
        [
          "Margen de contribución",
          t.marginCop,
          t.marginRate === null ? "Sin ingreso devengado." : `${percent(t.marginRate)} de lo devengado.`,
        ],
        ["Costo de la plataforma", t.platformVariableCostCop, "Consumo sin organización (Radar, salud): no se reparte entre los planes."],
        ["Costo de demostraciones y pruebas", t.demoVariableCostCop],
        ["Margen después de plataforma y demostraciones", t.marginAfterPlatformCop],
      ]
    : [];
  const multiMonth = (data?.months.length ?? 0) > 1;

  return (
    <section className="space-y-6" aria-label="Finanzas">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold">Cuánto deja cada plan</h2>
          <p className="text-sm text-muted-foreground">
            Ingresos, costo variable y margen de contribución de todas las
            organizaciones, por mes de Colombia. Las demostraciones, las
            organizaciones de prueba y los pagos anulados no suman.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm" htmlFor="finance-from">
            Desde
            <Input id="finance-from" type="month" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-44" />
          </label>
          <label className="text-sm" htmlFor="finance-to">
            Hasta
            <Input id="finance-to" type="month" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-44" />
          </label>
          <Button variant="outline" disabled={!data || downloading} onClick={download}>
            {downloading ? "Descargando…" : "Descargar CSV"}
          </Button>
        </div>
      </div>

      {!valid && (
        <p role="alert" className="text-sm text-destructive">
          Elige meses válidos: el mes inicial no puede ser posterior al final (hasta 12 meses).
        </p>
      )}
      {loading && <p role="status">Consultando las finanzas…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}

      {data && t && (
        <>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(([label, value, hint]) => (
              <div key={label} className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className={`text-lg font-semibold ${marginClass(value) ?? ""}`}>{pesos(value)}</dd>
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
              </div>
            ))}
          </dl>

          <Section
            title="Cuesta más de lo que paga"
            hint="Organizaciones cuyo costo variable del periodo supera lo que devengaron. Incluye las que consumen sin una suscripción pagada (prueba, cortesía o vencida)."
          >
            {data.overCost.length === 0 ? (
              <p className="p-4 text-sm">Ninguna organización costó más de lo que pagó en el periodo.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organización</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Devengado</TableHead>
                    <TableHead className="text-right">Costo variable</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead>Lo que más cuesta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.overCost.map((o) => (
                    <TableRow key={o.organizationId}>
                      <TableCell>
                        <Link className="text-primary underline" href={`/platform/organizations/${o.organizationId}`}>
                          {o.name}
                        </Link>
                      </TableCell>
                      <TableCell>{o.planName}</TableCell>
                      <TableCell className="text-right">{pesos(o.accruedCop)}</TableCell>
                      <TableCell className="text-right">{pesos(o.variableCostCop)}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">{pesos(o.marginCop)}</TableCell>
                      <TableCell className="text-sm">
                        {o.modules
                          .slice(0, 3)
                          .map((m) => `${usageModuleLabel(m.module, m.module)} ${pesos(m.costCop)}`)
                          .join(" · ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          <Section title="Por plan" hint="El costo variable de cada organización va al plan que la cubría ese mes.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead className="text-right">Organizaciones</TableHead>
                  {MONEY_HEADS.map((h) => (
                    <TableHead key={h} className="text-right">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byPlan.map((p) => (
                  <TableRow key={p.planCode}>
                    <TableCell>{p.planName}</TableCell>
                    <TableCell>{SEGMENT_LABEL[p.segment]}</TableCell>
                    <TableCell className="text-right">{p.organizations ?? 0}</TableCell>
                    <MoneyCells row={p} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Por segmento">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segmento</TableHead>
                    {MONEY_HEADS.map((h) => (
                      <TableHead key={h} className="text-right">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bySegment.map((s) => (
                    <TableRow key={s.segment}>
                      <TableCell>{s.label}</TableCell>
                      <MoneyCells row={s} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
            <Section title="Por tipo de ingreso">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cobrado (caja)</TableHead>
                    <TableHead className="text-right">Devengado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byType.map((row) => (
                    <TableRow key={row.type}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="text-right">{pesos(row.cashCop)}</TableCell>
                      <TableCell className="text-right">{pesos(row.accruedCop)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </div>

          {multiMonth && (
            <Section title="Margen por plan y por mes">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead>Plan</TableHead>
                    {MONEY_HEADS.map((h) => (
                      <TableHead key={h} className="text-right">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byMonth.flatMap((m) => [
                    <TableRow key={m.month} className="bg-muted/50 font-medium">
                      <TableCell>{m.month}</TableCell>
                      <TableCell>Todos los planes</TableCell>
                      <MoneyCells row={m.totals} />
                    </TableRow>,
                    ...m.plans.map((p) => (
                      <TableRow key={`${m.month}-${p.planCode}`}>
                        <TableCell />
                        <TableCell>{p.planName}</TableCell>
                        <MoneyCells row={p} />
                      </TableRow>
                    )),
                  ])}
                </TableBody>
              </Table>
            </Section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Costo variable por módulo">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Plataforma</TableHead>
                    <TableHead className="text-right">Demostraciones</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.costByModule.map((m) => (
                    <TableRow key={m.module}>
                      <TableCell title={m.module}>{usageModuleLabel(m.module, m.module)}</TableCell>
                      <TableCell className="text-right">{pesos(m.organizationCostCop)}</TableCell>
                      <TableCell className="text-right">{pesos(m.platformCostCop)}</TableCell>
                      <TableCell className="text-right">{pesos(m.demoCostCop)}</TableCell>
                      <TableCell className="text-right font-medium">{pesos(m.totalCostCop)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
            <Section title="Costo variable por proveedor">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Usos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.costByProvider.map((p) => (
                    <TableRow key={`${p.provider}-${p.service}`}>
                      <TableCell>{p.provider}</TableCell>
                      <TableCell>{p.service}</TableCell>
                      <TableCell className="text-right">{pesos(p.costCop)}</TableCell>
                      <TableCell className="text-right">{p.attempts.toLocaleString("es-CO")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <strong>Caja</strong> es lo cobrado en el periodo; <strong>devengado</strong>{" "}
              reparte la suscripción y los complementos mensuales por días entre
              los meses de su plazo (un plazo anual se reparte por días entre sus doce meses).
              La cuota de alta, los paquetes de consumo y las horas cuentan el
              mes en que se cobran. El margen se calcula sobre lo devengado.
            </li>
            <li>
              <strong>Institucional y a la medida</strong> reúne las ventas fuera
              de catálogo, sin plan comercial: las licencias institucionales por
              cotización y los precios especiales. El sistema todavía no las
              distingue entre sí.
            </li>
            <li>
              Un complemento cuenta en el plan de la suscripción que cubre el
              mes; sin ella va a «Sin suscripción pagada».
            </li>
            <li>
              El costo variable es un estimado con las tarifas y la TRM vigentes
              al registrar cada uso; la factura del proveedor es el dato contable
              (ver el cierre del mes en Cartera).
              {t.attemptsWithoutEstimate > 0 &&
                ` ${t.attemptsWithoutEstimate.toLocaleString("es-CO")} usos no tienen tarifa y quedan sin estimado.`}
            </li>
            {t.excludedPayments > 0 && (
              <li>
                {t.excludedPayments} pagos del periodo no suman: son anulados o de
                organizaciones de demostración o prueba.
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
