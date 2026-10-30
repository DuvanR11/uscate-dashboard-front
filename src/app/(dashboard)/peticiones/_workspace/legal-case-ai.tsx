"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LegalDetail } from "./legal-model";
import { plainTextHtml } from "./legal-model";
import { LegalError, LegalField, legalError, selectClass } from "./legal-ui";

type AiResult = {
  summary: string;
  draft: string;
  extractedText: string;
  missing: string[];
  comparisons: string[];
  suggestedTasks: string[];
  humanReviewRequired: boolean;
};
export function LegalCaseAi({
  detail,
  attachmentId,
  onChange,
}: {
  detail: LegalDetail;
  attachmentId?: string;
  onChange: () => void;
}) {
  const [mode, setMode] = useState(
    attachmentId ? "DOCUMENT_EXTRACT" : "SUMMARY",
  );
  const [selectedFile, setSelectedFile] = useState(attachmentId || "");
  const [job, setJob] = useState("");
  const [result, setResult] = useState<AiResult>();
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const id = detail.petition.id;
  useEffect(() => {
    if (!job) return;
    let canceled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await api.get<{
          state: string;
          result?: AiResult;
          error?: string;
        }>(`/petitions/${id}/case/ai/${job}`);
        if (canceled) return;
        if (response.data.state === "completed" && response.data.result) {
          setResult(response.data.result);
          setText(
            response.data.result.draft ||
              response.data.result.extractedText ||
              "",
          );
          setBusy(false);
          setJob("");
        } else if (response.data.state === "failed") {
          setError(
            response.data.error || "No se pudo completar la asistencia.",
          );
          setBusy(false);
          setJob("");
        } else timer = setTimeout(() => void poll(), 2000);
      } catch (e) {
        if (!canceled) {
          setError(legalError(e));
          setBusy(false);
          setJob("");
        }
      }
    }
    void poll();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [job, id]);
  async function request() {
    setBusy(true);
    setError("");
    setMessage("");
    setResult(undefined);
    setReviewed(false);
    try {
      const response = await api.post<{ jobId: string }>(
        `/petitions/${id}/case/ai`,
        {
          mode,
          ...(mode === "DOCUMENT_EXTRACT"
            ? { attachmentId: selectedFile }
            : {}),
        },
      );
      setJob(response.data.jobId);
    } catch (e) {
      setError(legalError(e));
      setBusy(false);
    }
  }
  async function apply() {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/petitions/${id}`, {
        generatedDraft: plainTextHtml(text),
      });
      setMessage(
        "Contenido incorporado al borrador. Continúa la revisión en Redacción.",
      );
      onChange();
    } catch (e) {
      setError(legalError(e));
    } finally {
      setBusy(false);
    }
  }
  async function task(title: string) {
    setError("");
    try {
      await api.post(`/petitions/${id}/case/tasks`, {
        title: title.slice(0, 240),
        priority: "NORMAL",
      });
      setMessage("Tarea incorporada. Puedes organizarla en la pestaña Tareas.");
      onChange();
    } catch (e) {
      setError(legalError(e));
    }
  }
  return (
    <section className="space-y-5 rounded-xl border bg-card p-5">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-5 text-ai" />
          Copiloto del expediente
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Asistencia sobre el contenido aportado. Revisa cada resultado: no
          sustituye la evaluación jurídica ni modifica términos o estados.
        </p>
      </div>
      {error && <LegalError message={error} />}
      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}
      <div className="grid items-end gap-4 md:grid-cols-2">
        <LegalField label="Qué necesitas">
          <select
            className={selectClass}
            disabled={busy}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            {[
              ["SUMMARY", "Resumir el expediente"],
              ["RESPONSE_REVIEW", "Comparar solicitudes y respuesta"],
              ["MISSING_INFORMATION", "Identificar información faltante"],
              ["DRAFT", "Preparar un borrador"],
              ["DOCUMENT_EXTRACT", "Extraer texto de un PDF"],
            ].map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </LegalField>
        {mode === "DOCUMENT_EXTRACT" ? (
          <LegalField label="PDF del expediente">
            <select
              className={selectClass}
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
            >
              <option value="">Seleccionar archivo</option>
              {detail.attachments
                .filter(
                  (item) =>
                    item.document.currentVersion?.mimeType ===
                    "application/pdf",
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.document.name}
                  </option>
                ))}
            </select>
          </LegalField>
        ) : (
          <p className="text-xs text-muted-foreground">
            La asistencia se limita a los hechos, solicitudes y respuesta
            registrados. La decisión de utilizar el resultado es del
            profesional.
          </p>
        )}
      </div>
      <Button
        disabled={busy || (mode === "DOCUMENT_EXTRACT" && !selectedFile)}
        onClick={() => void request()}
      >
        {busy ? "Procesando en segundo plano…" : "Solicitar asistencia"}
      </Button>
      {result && (
        <div className="space-y-5 border-t pt-5">
          <p className="whitespace-pre-wrap text-sm leading-6">
            {result.summary}
          </p>
          {[
            ["Información por completar", result.missing],
            ["Solicitudes frente a respuesta", result.comparisons],
          ].map(
            ([label, rows]) =>
              (rows as string[]).length > 0 && (
                <section key={String(label)}>
                  <h3 className="mb-2 font-semibold">{String(label)}</h3>
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {(rows as string[]).map((value, index) => (
                      <li key={index}>{value}</li>
                    ))}
                  </ul>
                </section>
              ),
          )}
          {text && (
            <>
              <LegalField
                label={
                  result.extractedText
                    ? "Texto extraído · revisa y corrige su integridad"
                    : "Borrador revisable y editable"
                }
              >
                <Textarea
                  value={text}
                  rows={16}
                  onChange={(e) => {
                    setText(e.target.value);
                    setReviewed(false);
                  }}
                />
              </LegalField>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                He revisado el contenido antes de utilizarlo
              </label>
              <div className="flex flex-wrap gap-2">
                {result.draft && !detail.petition.signedAt && (
                  <Button
                    disabled={!reviewed || busy}
                    onClick={() => void apply()}
                  >
                    Incorporar al borrador
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={!reviewed}
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(text)
                      .then(() => setMessage("Texto revisado copiado."))
                      .catch(() =>
                        setError("Selecciona y copia el texto desde el campo."),
                      )
                  }
                >
                  Copiar texto revisado
                </Button>
              </div>
            </>
          )}
          {!!result.suggestedTasks.length && (
            <section>
              <h3 className="mb-3 font-semibold">
                Actividades sugeridas para revisar
              </h3>
              <ul className="space-y-3">
                {result.suggestedTasks.map((value, index) => (
                  <li
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    <span className="min-w-0 flex-1">{value}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void task(value)}
                    >
                      Agregar como tarea
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
