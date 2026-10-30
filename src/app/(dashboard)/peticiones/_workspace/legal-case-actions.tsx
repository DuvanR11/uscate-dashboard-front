"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LegalDetail } from "./legal-model";
import { actionLabels, evaluations } from "./legal-model";
import { LegalError, LegalField, legalError, selectClass } from "./legal-ui";

export function LegalCaseActions({
  detail,
  onChange,
}: {
  detail: LegalDetail;
  onChange: () => void;
}) {
  const file = detail.petition.workspace!;
  const [kind, setKind] = useState("NOTE");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(new Date());
  const [day, setDay] = useState(today);
  const [note, setNote] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [radicado, setRadicado] = useState(detail.petition.radicado || "");
  const [channel, setChannel] = useState("");
  const [recipient, setRecipient] = useState(file.recipient || "");
  const [dueAt, setDueAt] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [response, setResponse] = useState("");
  const evidenceRequired = [
    "FILED",
    "RECEIVED",
    "TRANSFERRED",
    "REQUEST_INFORMATION",
    "RESUMED",
    "EXTENDED",
    "PARTIAL_RESPONSE",
    "FINAL_RESPONSE",
  ].includes(kind);
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/petitions/${detail.petition.id}/case/actions`, {
        kind,
        version: file.version,
        happenedAt: day,
        detail: note,
        ...(evidenceId ? { evidenceId } : {}),
        ...(radicado && kind === "FILED" ? { radicado } : {}),
        ...(channel ? { channel } : {}),
        ...(recipient ? { recipient } : {}),
        ...(dueAt && kind === "EXTENDED" ? { dueAt } : {}),
        ...(evaluation && kind === "EVALUATED" ? { evaluation } : {}),
        ...(response ? { responseText: response } : {}),
      });
      setNote("");
      setResponse("");
      setEvidenceId("");
      onChange();
    } catch (e) {
      setError(legalError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-2 font-semibold">Registrar actuación</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Cada actuación conserva fecha, responsable, observaciones y evidencia.
        Un envío o una firma no acreditan recepción.
      </p>
      {error && <LegalError message={error} />}
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <LegalField label="Actuación">
          <select
            className={selectClass}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {Object.entries(actionLabels)
              .filter(([key]) =>
                [
                  "NOTE",
                  "SENT",
                  "FILED",
                  "RECEIVED",
                  "TRANSFERRED",
                  "REQUEST_INFORMATION",
                  "RESUMED",
                  "EXTENDED",
                  "PARTIAL_RESPONSE",
                  "FINAL_RESPONSE",
                  "EVALUATED",
                  "CLOSED",
                  "ARCHIVED",
                  "REOPENED",
                ].includes(key),
              )
              .map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
          </select>
        </LegalField>
        <LegalField label="Fecha de la actuación">
          <Input
            type="date"
            value={day}
            max={today}
            onChange={(e) => setDay(e.target.value)}
          />
        </LegalField>
        {["SENT", "FILED"].includes(kind) && (
          <LegalField label="Canal utilizado">
            <select
              className={selectClass}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="">Seleccionar canal</option>
              {[
                ["EMAIL", "Correo electrónico"],
                ["WEB", "Sede electrónica"],
                ["IN_PERSON", "Presencial"],
                ["POSTAL", "Correo postal"],
                ["OTHER", "Otro canal"],
              ].map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </LegalField>
        )}
        {kind === "FILED" && (
          <LegalField label="Número de radicado">
            <Input
              value={radicado}
              maxLength={120}
              onChange={(e) => setRadicado(e.target.value)}
            />
          </LegalField>
        )}
        {["FILED", "RECEIVED", "TRANSFERRED"].includes(kind) && (
          <LegalField
            label={
              kind === "RECEIVED"
                ? "Autoridad competente que recibió"
                : "Entidad receptora"
            }
          >
            <Input
              value={recipient}
              maxLength={300}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </LegalField>
        )}
        {kind === "EXTENDED" && (
          <LegalField
            label="Nueva fecha comunicada para responder"
            hint="La comunicación debe estar acreditada antes del vencimiento; se valida el tope legal."
          >
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </LegalField>
        )}
        {kind === "EVALUATED" && (
          <LegalField label="Resultado de la revisión jurídica">
            <select
              value={evaluation}
              onChange={(e) => setEvaluation(e.target.value)}
              className={selectClass}
            >
              <option value="">Seleccionar resultado</option>
              {Object.entries(evaluations).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </LegalField>
        )}
        {(evidenceRequired || !!detail.attachments.length) && (
          <LegalField
            label={`Evidencia del expediente${evidenceRequired ? " *" : ""}`}
            hint="Incorpora primero el archivo en Documentos."
          >
            <select
              className={selectClass}
              value={evidenceId}
              onChange={(e) => setEvidenceId(e.target.value)}
            >
              <option value="">Seleccionar documento</option>
              {detail.attachments
                .filter((item) => item.document.status === "ACTIVE")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.document.name} · v{item.document.currentVersionNumber}
                  </option>
                ))}
            </select>
          </LegalField>
        )}
        {["PARTIAL_RESPONSE", "FINAL_RESPONSE"].includes(kind) && (
          <div className="md:col-span-2">
            <LegalField
              label="Texto de la respuesta"
              hint="Puedes extraer el texto de un PDF desde Documentos y revisarlo antes de incorporarlo."
            >
              <Textarea
                rows={6}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                maxLength={40000}
              />
            </LegalField>
          </div>
        )}
        <div className="md:col-span-2">
          <LegalField
            label={
              [
                "EXTENDED",
                "REQUEST_INFORMATION",
                "TRANSFERRED",
                "RESUMED",
              ].includes(kind)
                ? "Fundamento, constancia de comunicación y observaciones *"
                : "Observaciones *"
            }
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              minLength={5}
              maxLength={15000}
            />
          </LegalField>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs text-muted-foreground">
          Las respuestas parciales conservan el seguimiento. El cierre exige
          evaluación jurídica y atención a las actuaciones pendientes.
        </p>
        <Button
          disabled={
            busy || note.trim().length < 5 || (evidenceRequired && !evidenceId)
          }
          onClick={() => void save()}
        >
          {busy ? "Registrando…" : "Registrar actuación"}
        </Button>
      </div>
    </section>
  );
}
