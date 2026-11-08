"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiErrorMessage } from "@/lib/api-error";
import {
  createPressMembershipOrder,
  getPressMembershipOptions,
  type PressMembershipOptions,
} from "@/lib/api/press-membership";

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
const day = (value: string) =>
  new Date(value).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
const termName = (months: number) => (months === 12 ? "Anual" : "Mensual");

/** Desde cuándo cuenta lo que se paga (misma regla que aplica el servidor). */
function intro(options: PressMembershipOptions) {
  const end = options.currentPeriodEnd;
  if (options.onTrial)
    return `${end ? `Tu prueba va hasta el ${day(end)}. ` : ""}Elige plan y forma de pago. La membresía pagada empieza el día en que se confirma el pago.`;
  if (end && new Date(end) > new Date())
    return `Tu membresía va hasta el ${day(end)}; lo que pagues ahora empieza ese día. Para cambiar de plan antes, escribe a soporte.`;
  return `${end ? `Tu membresía venció el ${day(end)}. ` : ""}La nueva empieza el día en que se confirma el pago.`;
}

/**
 * Zyron Prensa, Fase 4 (2026-11-08): el periodista elige plan y plazo y
 * obtiene su orden de pago, que se paga en «Órdenes de pago» por
 * transferencia o en línea. Los montos los calcula el servidor.
 */
export function PressMembershipCheckout() {
  const router = useRouter();
  const [options, setOptions] = useState<PressMembershipOptions | null>(null);
  const [failed, setFailed] = useState(false);
  const [plan, setPlan] = useState("");
  const [term, setTerm] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Una clave por elección: repetir el clic no crea otra orden.
  const keys = useRef(new Map<string, string>());

  useEffect(() => {
    getPressMembershipOptions()
      .then((result) => {
        setOptions(result);
        setPlan(result.currentPlanCode);
      })
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;
  if (!options) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando tu membresía…
        </CardContent>
      </Card>
    );
  }

  const chosen = options.plans.find((p) => p.code === plan);
  const option = chosen?.terms.find((t) => t.termMonths === term);
  const open = options.openOrder;
  const sameAsOpen =
    open && open.commercialPlanCode === plan && open.termMonths === term;

  async function order() {
    if (!option) return;
    setBusy(true);
    setError("");
    const id = `${plan}:${term}`;
    const requestKey = keys.current.get(id) ?? crypto.randomUUID();
    keys.current.set(id, requestKey);
    try {
      await createPressMembershipOrder({
        commercialPlanCode: plan,
        termMonths: term,
        requestKey,
      });
      router.push("/organization/billing/orders");
    } catch (e) {
      setError(apiErrorMessage(e) ?? "No se pudo preparar la orden.");
      setBusy(false);
    }
  }

  return (
    <Card className="border-sky-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Newspaper className="h-5 w-5 text-sky-600" />{" "}
          {options.onTrial ? "Paga tu membresía" : "Renueva tu membresía"}
        </CardTitle>
        <p className="text-sm text-slate-500">{intro(options)} Los precios no llevan IVA.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-slate-700">Plan</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.plans.map((p) => (
              <label
                key={p.code}
                className={`flex cursor-pointer flex-col rounded-lg border p-3 text-sm ${plan === p.code ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <input
                    type="radio"
                    name="press-plan"
                    value={p.code}
                    checked={plan === p.code}
                    onChange={() => setPlan(p.code)}
                  />
                  {p.name}
                  {p.code === options.currentPlanCode && (
                    <span className="text-xs font-normal text-slate-500">
                      (tu plan)
                    </span>
                  )}
                </span>
                <span className="text-slate-600">
                  {money(p.terms[0]?.monthlyPrice ?? 0)} al mes
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {chosen && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700">
              Forma de pago
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {chosen.terms.map((t) => (
                <label
                  key={t.termMonths}
                  className={`flex cursor-pointer flex-col rounded-lg border p-3 text-sm ${term === t.termMonths ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name="press-term"
                      value={t.termMonths}
                      checked={term === t.termMonths}
                      onChange={() => setTerm(t.termMonths)}
                    />
                    {termName(t.termMonths)}
                    {t.discountPercent > 0 && (
                      <span className="rounded bg-emerald-100 px-1.5 text-xs font-medium text-emerald-800">
                        −{t.discountPercent} %
                      </span>
                    )}
                  </span>
                  <span className="text-slate-600">
                    {money(t.totalAmount)}
                    {t.termMonths === 12 ? " por 12 meses" : " por 1 mes"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {open && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            Ya tienes una orden abierta por{" "}
            <strong>{money(open.totalAmount)}</strong> (vence el{" "}
            {day(open.dueAt)}).{" "}
            {sameAsOpen
              ? "Es la que elegiste: ve a pagarla."
              : "Si pides otra, esa se reemplaza."}{" "}
            <Link href="/organization/billing/orders" className="underline">
              Ver órdenes de pago
            </Link>
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <Button onClick={order} disabled={!option || busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {sameAsOpen
            ? "Ir a pagar"
            : option
              ? `Continuar al pago de ${money(option.totalAmount)}`
              : "Continuar al pago"}
        </Button>
      </CardContent>
    </Card>
  );
}
