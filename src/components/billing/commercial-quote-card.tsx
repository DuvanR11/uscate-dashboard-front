"use client";
import type { CommercialQuote } from "@/lib/api/commercial-quotes";
import { COMMISSION_ORIGIN_LABEL } from "@/lib/api/billing";
import { useModuleNames } from "@/hooks/use-module-names";
import { titleCase } from "@/components/billing/territory-picker";

const labels = {
  ISSUED: "Por aceptar",
  ACCEPTED: "Aceptada",
  SUPERSEDED: "Reemplazada",
  EXPIRED: "Vencida",
};
// Recorrido de alta (Fase 2, 2026-10-18): fecha sin segundos (antes
// "4:14:15 p. m.." con doble punto al final de la frase).
export const quoteDate = (date: string) =>
  new Date(date).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "short",
  });
const CANDIDACY_LABEL: Record<string, string> = {
  ACTIVO: "En ejercicio",
  ASPIRANTE: "Aspirante",
};
const number = (value: number) => new Intl.NumberFormat("es-CO").format(value);

function quotaValue(key: string, value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (key === "aiBudgetCop") return money(n);
  if (key === "whatsappLimit" && n === 0) return "No incluido";
  return number(n);
}
const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
const quotaLabels: Record<string, string> = {
  usersLimit: "Usuarios",
  prospectsLimit: "Contactos",
  storageGbLimit: "Almacenamiento (GB)",
  whatsappLimit: "WhatsApp",
  smsLimit: "SMS",
  emailLimit: "Correo",
  aiBudgetCop: "Presupuesto IA (COP)",
  supportHours: "Acompañamiento (horas)",
};
export function CommercialQuoteCard({
  quote,
  children,
}: {
  quote: CommercialQuote;
  children?: React.ReactNode;
}) {
  const s = quote.snapshot;
  const moduleNames = useModuleNames();
  return (
    <article className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">
        {s.commercialPlan?.name ?? "Propuesta fuera de catálogo"} · Versión{" "}
        {quote.version} · {labels[quote.effectiveState]}
      </h3>
      <p className="text-sm">
        Emitida: {quoteDate(quote.issuedAt)} · Vence:{" "}
        {quoteDate(quote.expiresAt)}
      </p>
      <p>
        Periodo: {s.termMonths} meses ·{" "}
        {s.territory?.name ? titleCase(s.territory.name) : "Sin territorio"} ·{" "}
        {s.candidacy ? (CANDIDACY_LABEL[s.candidacy] ?? s.candidacy) : "Sin perfil"}
      </p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {[
          ["Precio sin impuestos", s.amounts.listAmount],
          ["Descuento", s.amounts.discountAmount],
          ["Valor neto", s.amounts.netAmount],
          ["Impuestos calculados", s.amounts.vatAmount],
          ["Total COP", s.amounts.totalAmount],
        ].map(([label, amount]) => (
          <div key={String(label)}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-medium">{money(Number(amount))}</dd>
          </div>
        ))}
      </dl>
      {s.coupon && (
        <p>
          Cupón: {s.coupon.code} ({s.coupon.discountPercent} %). Su
          disponibilidad se verificará antes de contratar; esta propuesta no
          reserva usos del cupón.
        </p>
      )}
      {s.coverage && (
        <p className="text-sm break-words">
          Módulos incluidos:{" "}
          {s.coverage.modules
            .map((code) => moduleNames?.get(code) ?? code)
            .join(", ") || "Sin módulos"}
        </p>
      )}
      {s.quotas ? (
        <div>
          <p className="text-sm font-semibold">Capacidades incluidas cada mes</p>
          <dl className="grid gap-2 pt-2 sm:grid-cols-2">
            {Object.entries(s.quotas).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3 text-sm">
                <dt className="text-muted-foreground">{quotaLabels[key] ?? key}</dt>
                <dd className="font-medium tabular-nums">{quotaValue(key, value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="text-sm">
          Capacidades pendientes de definición para esta propuesta.
        </p>
      )}
      <p className="text-sm">
        Persona designada para aceptar: {quote.designatedName} (
        {quote.designatedEmail})
      </p>
      {/* Solo llega en el panel del operador; el cliente no la recibe. */}
      {quote.commission !== undefined && (
        <p className="text-sm">
          {quote.commission
            ? `Comercial de la venta: ${quote.commission.salesRepName ?? "comercial retirado"} · comisión del ${quote.commission.ratePercent} % (${COMMISSION_ORIGIN_LABEL[quote.commission.origin].replace(/\s*\(\d+ %\)$/, "").toLowerCase()})`
            : "Sin comercial: esta venta no genera comisión."}
        </p>
      )}
      {quote.acceptedAt && (
        <p className="text-sm">
          Aceptada por {quote.acceptedByName} el {quoteDate(quote.acceptedAt)}
        </p>
      )}
      {children}
    </article>
  );
}
