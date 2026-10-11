"use client";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuerySection } from "./query-section";
import {
  supportAttachments,
  uploadSupportAttachment,
  downloadSupportAttachment,
  type SupportDetail,
  type SupportAttachment,
} from "@/lib/api/support";
import { extractErrorMessage } from "@/lib/api/platform";

export function SupportAttachments({
  platform,
  detail,
  canWrite,
}: {
  platform: boolean;
  detail: SupportDetail;
  canWrite: boolean;
}) {
  const id = detail.ticket.id;
  const [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef<FormData | null>(null);
  const [resuming, setResuming] = useState<SupportAttachment | null>(null);
  const load = useCallback(
    () => supportAttachments(platform, id),
    [platform, id],
  );
  return (
    <div className="space-y-3">
      <QuerySection key={revision} title="Adjuntos privados" load={load}>
        {(result) => (
          <>
            {!result.items.length && <p>No hay adjuntos visibles.</p>}
            <ul className="space-y-2">
              {result.items.map((a) => (
                <li key={a.id} className="rounded-lg border p-3 break-words">
                  <p className="font-medium">{a.fileName}</p>
                  <p className="text-xs">
                    {(a.bytes / 1024 / 1024).toFixed(2)} MB ·{" "}
                    {a.visibility === "INTERNAL"
                      ? "Solo equipo de soporte"
                      : "Cliente y soporte"}
                  </p>
                  {a.state === "STORED" ? (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          const result = await downloadSupportAttachment(
                            platform,
                            id,
                            a.id,
                          );
                          window.location.assign(result.url);
                        } catch (e) {
                          setError(
                            extractErrorMessage(e) ||
                              "No se pudo autorizar la descarga.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Descargar archivo
                    </Button>
                  ) : (
                    <>
                      <p className="text-sm">
                        Carga pendiente de confirmación. Quien la inició debe
                        reintentar el mismo archivo.
                      </p>
                      {canWrite &&
                        detail.ticket.state !== "CLOSED" &&
                        a.resumeRequestKey && (
                          <Button
                            variant="outline"
                            disabled={busy || uncertain}
                            onClick={() => setResuming(a)}
                          >
                            Retomar carga
                          </Button>
                        )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setRevision((r) => r + 1)}
            >
              Actualizar adjuntos
            </Button>
          </>
        )}
      </QuerySection>
      {canWrite && detail.ticket.state !== "CLOSED" && (
        <form
          key={resuming?.id ?? "new"}
          className="space-y-3 rounded-lg border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const form = e.currentTarget;
            setBusy(true);
            setError("");
            try {
              if (!pending.current) {
                const data = new FormData(form),
                  file = data.get("file");
                if (
                  !(file instanceof File) ||
                  !file.size ||
                  file.size > 10 * 1024 * 1024
                )
                  throw new Error("Selecciona un archivo de hasta 10 MB.");
                if (resuming) data.set("entryId", resuming.entryId);
                data.set(
                  "requestKey",
                  resuming?.resumeRequestKey ?? crypto.randomUUID(),
                );
                pending.current = data;
              }
              await uploadSupportAttachment(platform, id, pending.current);
              pending.current = null;
              setUncertain(false);
              setResuming(null);
              form.reset();
              setRevision((r) => r + 1);
            } catch (e) {
              const status = (e as { response?: { status: number } }).response
                ?.status;
              if (
                !pending.current ||
                (status && [400, 401, 403, 404, 409, 413].includes(status))
              ) {
                pending.current = null;
                setUncertain(false);
              } else setUncertain(true);
              setError(
                extractErrorMessage(e) ||
                  (e instanceof Error
                    ? e.message
                    : "No se pudo confirmar la carga."),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy || uncertain} className="space-y-3">
            {resuming && (
              <p>
                Retomar «{resuming.fileName}»: selecciona el mismo archivo
                original.
              </p>
            )}
            <label className="block">
              Adjuntar al mensaje
              <select
                required
                disabled={!!resuming}
                name="entryId"
                defaultValue={resuming?.entryId ?? ""}
                className="block w-full rounded-md border bg-background p-2"
              >
                <option value="">
                  Selecciona un mensaje del historial visible
                </option>
                {resuming &&
                  !detail.entries.some((e) => e.id === resuming.entryId) && (
                    <option value={resuming.entryId}>
                      Mensaje de la carga original
                    </option>
                  )}
                {detail.entries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.visibility === "INTERNAL" ? "Nota interna" : "Público"}:{" "}
                    {e.body.slice(0, 100)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Archivo PDF, JPEG, PNG o WebP
              <Input
                type="file"
                name="file"
                required
                accept="application/pdf,image/jpeg,image/png,image/webp"
              />
            </label>
          </fieldset>
          <p className="text-xs">
            Hasta 10 MB por archivo, 20 archivos y 100 MB por ticket. El archivo
            conserva la visibilidad del mensaje elegido. No incluyas contraseñas
            ni claves.
          </p>
          {uncertain && (
            <p role="status">
              El resultado es incierto. Reintenta el mismo archivo para
              completar la carga sin duplicarlo. Conserva esta pantalla hasta
              confirmar.
            </p>
          )}
          <Button disabled={busy} type="submit">
            {busy
              ? "Procesando…"
              : uncertain
                ? "Reintentar la misma carga"
                : "Adjuntar archivo"}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
