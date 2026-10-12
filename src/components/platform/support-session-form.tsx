"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/api/platform";
export function SessionForm({
  build,
  send,
  onSaved,
  label,
  children,
}: {
  build: (d: FormData) => Record<string, unknown>;
  send: (d: Record<string, unknown>) => Promise<unknown>;
  onSaved: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const pending = useRef<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          pending.current ??= {
            ...build(new FormData(e.currentTarget)),
            requestKey: crypto.randomUUID(),
          };
          await send(pending.current);
          pending.current = null;
          setUncertain(false);
          onSaved();
        } catch (e) {
          const status = (e as { response?: { status: number } }).response
            ?.status;
          if (status && [400, 401, 403, 404, 409].includes(status)) {
            pending.current = null;
            setUncertain(false);
          } else setUncertain(true);
          setError(
            extractErrorMessage(e) || "No se pudo confirmar el registro.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy || uncertain} className="min-w-0 space-y-3">
        {children}
      </fieldset>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {uncertain && (
        <p>
          Reintenta la misma solicitud para confirmar su resultado sin
          duplicarla.
        </p>
      )}
      <Button type="submit" disabled={busy} className="h-auto max-w-full whitespace-normal">
        {busy
          ? "Guardando…"
          : uncertain
            ? "Reintentar la misma solicitud"
            : label}
      </Button>
    </form>
  );
}
