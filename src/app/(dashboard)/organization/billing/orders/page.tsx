"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CollectionOrdersPanel } from "@/components/billing/collection-orders-panel";
import {
  confirmOnlinePayment,
  type OnlineAttempt,
} from "@/lib/api/collection-orders";
import { extractErrorMessage } from "@/lib/api/platform";

type Notice = { tone: "ok" | "wait" | "error"; text: string };

function noticeFor(attempt: OnlineAttempt): Notice {
  switch (attempt.status) {
    case "APPROVED":
      return {
        tone: "ok",
        text: "Pago aprobado. Tu plan se activa en unos segundos.",
      };
    case "PENDING":
      return {
        tone: "wait",
        text: "El pago está en proceso. Te mostraremos el resultado en cuanto el banco lo confirme; no pagues de nuevo mientras tanto.",
      };
    case "CREATED":
      return {
        tone: "wait",
        text: "El pago no se completó. Puedes intentarlo de nuevo.",
      };
    default:
      return {
        tone: "error",
        text: `El pago no se aprobó${attempt.statusMessage ? `: ${attempt.statusMessage}` : ""}. Puedes intentarlo de nuevo o pagar por transferencia.`,
      };
  }
}

const toneClass = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-950",
  wait: "border-amber-200 bg-amber-50 text-amber-950",
  error: "border-red-200 bg-red-50 text-red-950",
};

/** Vuelta del checkout de Wompi (`?id=<transacción>`): el servidor la confirma. */
function PaymentReturn({ onDone }: { onDone: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const transactionId = params.get("id");
  const [notice, setNotice] = useState<Notice | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!transactionId || started.current) return;
    started.current = true;
    confirmOnlinePayment(transactionId)
      .then((attempt) => setNotice(noticeFor(attempt)))
      .catch((e) =>
        setNotice({
          tone: "error",
          text:
            extractErrorMessage(e) ??
            "No pudimos confirmar el pago con Wompi. Si se aprobó, lo verás aquí en unos minutos.",
        }),
      )
      .finally(() => {
        router.replace("/organization/billing/orders");
        onDone();
      });
  }, [transactionId, router, onDone]);
  if (!notice)
    return transactionId ? (
      <p role="status">Confirmando el pago con Wompi…</p>
    ) : null;
  return (
    <p
      role="status"
      className={`rounded-lg border p-3 text-sm ${toneClass[notice.tone]}`}
    >
      {notice.text}
    </p>
  );
}

export default function MyCollectionOrdersPage() {
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((n) => n + 1), []);
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <Link
        className="text-primary underline"
        href="/organization/billing/quotes"
      >
        Volver a cotizaciones
      </Link>
      <Suspense fallback={null}>
        <PaymentReturn onDone={reload} />
      </Suspense>
      <CollectionOrdersPanel refresh={refresh} />
    </div>
  );
}
