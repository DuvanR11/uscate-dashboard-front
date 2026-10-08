"use client";
import type { CommercialQuote } from "@/lib/api/commercial-quotes";

const labels = {
  ISSUED: "Por aceptar",
  ACCEPTED: "Aceptada",
  SUPERSEDED: "Reemplazada",
  EXPIRED: "Vencida",
};
export const quoteDate = (date: string) =>
  new Date(date).toLocaleString("es-CO", { timeZone: "America/Bogota" });
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
        Periodo: {s.termMonths} meses · {s.territory?.name ?? "Sin territorio"}{" "}
        · {s.candidacy ?? "Sin perfil"}
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
          Módulos incluidos: {s.coverage.modules.join(", ") || "Sin módulos"}
        </p>
      )}
      {s.quotas ? (
        <details>
          <summary className="cursor-pointer">Capacidades incluidas</summary>
          <dl className="grid gap-2 pt-2 sm:grid-cols-2">
            {Object.entries(s.quotas).map(([key, value]) => (
              <div key={key}>
                <dt>{quotaLabels[key] ?? key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : (
        <p className="text-sm">
          Capacidades pendientes de definición para esta propuesta.
        </p>
      )}
      <p className="text-sm">
        Persona designada para aceptar: {quote.designatedName} (
        {quote.designatedEmail})
      </p>
      {quote.acceptedAt && (
        <p className="text-sm">
          Aceptada por {quote.acceptedByName} el {quoteDate(quote.acceptedAt)}.
        </p>
      )}
      {children}
    </article>
  );
}
