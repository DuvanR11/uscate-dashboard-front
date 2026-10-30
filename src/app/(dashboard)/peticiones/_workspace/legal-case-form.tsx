"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Save } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { calendarDayISO } from "@/lib/dates";
import type { LegalOptions, LegalPetition } from "./legal-model";
import { priorities } from "./legal-model";
import {
  LegalError,
  LegalField,
  legalError,
  selectClass,
  useLegalResource,
} from "./legal-ui";

export function LegalCaseForm({
  petition,
  onSaved,
  onCancel,
}: {
  petition?: LegalPetition;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const file = petition?.workspace;
  const initial = {
    subject: file?.subject || "",
    petitioner: petition?.petitioner || "",
    petitionerEmail: petition?.petitionerEmail || "",
    petitionType: petition?.petitionType || "GENERAL",
    direction: petition?.petitionDirection || "CREADA",
    applicantType: file?.applicantType || "NATURAL",
    applicantIdentification: file?.applicantIdentification || "",
    recipient: file?.recipient || "",
    notificationAddress: file?.notificationAddress || "",
    facts: file?.facts || petition?.originalText || "",
    legalBasis: file?.legalBasis || "",
    requests: file?.requests || "",
    priority: file?.priority || "NORMAL",
    visibility: file?.visibility || "TEAM",
    assignedLawyerId: petition?.assignedLawyerId || "",
    internalDueAt: calendarDayISO(file?.internalDueAt),
    workingSaturdays: file?.workingSaturdays || false,
    excludedDays: file?.excludedDays || [],
    calendarReason: file?.calendarReason || "",
    reminderDays: file?.reminderDays || [5, 2, 0],
    emailReminders: file?.emailReminders || false,
  };
  const [form, setForm] = useState(initial);
  const [reminderText, setReminderText] = useState(
    initial.reminderDays.join(", "),
  );
  const [excludedText, setExcludedText] = useState(
    initial.excludedDays.join(", "),
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const options = useLegalResource<LegalOptions>(
    "/petitions/workspace/options",
  );
  const frozen = !!petition?.signedAt;
  const termStarted = !!file?.competentReceivedAt;
  function change<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  async function save() {
    if (form.subject.trim().length < 3 || form.petitioner.trim().length < 2) {
      setError(
        "Escribe el asunto y la identificación del solicitante para guardar el borrador.",
      );
      setStep(0);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const values = {
        ...form,
        reminderDays: reminderText
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .map(Number),
        excludedDays: excludedText
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      };
      if (
        values.reminderDays.some((x) => !Number.isInteger(x) || x < 0 || x > 30)
      )
        throw new Error(
          "Los avisos deben ser días enteros entre 0 y 30, separados por comas.",
        );
      if (file && petition) {
        const payload: Record<string, unknown> = { version: file.version };
        for (const key of Object.keys(values) as (keyof typeof values)[]) {
          if (JSON.stringify(values[key]) !== JSON.stringify(initial[key]))
            payload[key] =
              (key === "petitionerEmail" || key === "internalDueAt") &&
              values[key] === ""
                ? null
                : values[key];
        }
        await api.patch(`/petitions/${petition.id}/case`, payload);
        onSaved(petition.id);
      } else {
        const payload = Object.fromEntries(
          Object.entries(values).filter(([, value]) => value !== ""),
        );
        const result = await api.post<{ id?: string }>(
          petition
            ? `/petitions/${petition.id}/case/adopt`
            : "/petitions/workspace",
          payload,
        );
        onSaved(petition?.id || result.data.id!);
      }
    } catch (e) {
      setError(legalError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="rounded-2xl border bg-card p-4 md:p-6"
      aria-label="Ficha jurídica"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {petition ? "Ficha del expediente" : "Crear petición"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Guarda el borrador en cualquier paso. La recepción competente se
            registra después con su evidencia.
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          Volver
        </Button>
      </div>
      <ol className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          "Identificación",
          "Contenido jurídico",
          "Organización",
          "Revisión",
        ].map((label, index) => (
          <li key={label}>
            <button
              type="button"
              aria-current={step === index ? "step" : undefined}
              className={`flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm ${step === index ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"}`}
              onClick={() => setStep(index)}
            >
              <span className="font-semibold">
                {index < step ? <Check className="size-4" /> : index + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      {error && <LegalError message={error} />}
      <div className="my-5 grid gap-5 md:grid-cols-2">
        {step === 0 && (
          <>
            <LegalField label="Asunto *">
              <Input
                maxLength={240}
                value={form.subject}
                onChange={(e) => change("subject", e.target.value)}
              />
            </LegalField>
            <LegalField label="Solicitante *">
              <Input
                disabled={frozen}
                maxLength={240}
                value={form.petitioner}
                onChange={(e) => change("petitioner", e.target.value)}
              />
            </LegalField>
            <LegalField label="Tipo de solicitante">
              <select
                className={selectClass}
                disabled={frozen}
                value={form.applicantType}
                onChange={(e) => change("applicantType", e.target.value)}
              >
                <option value="NATURAL">Persona natural</option>
                <option value="JURIDICA">Persona jurídica</option>
              </select>
            </LegalField>
            <LegalField label="Identificación">
              <Input
                disabled={frozen}
                maxLength={80}
                value={form.applicantIdentification}
                onChange={(e) =>
                  change("applicantIdentification", e.target.value)
                }
              />
            </LegalField>
            <LegalField label="Entidad o destinatario">
              <Input
                disabled={frozen}
                maxLength={300}
                value={form.recipient}
                onChange={(e) => change("recipient", e.target.value)}
              />
            </LegalField>
            <LegalField label="Dirección del trámite">
              <select
                disabled={frozen || termStarted}
                className={selectClass}
                value={form.direction}
                onChange={(e) =>
                  change("direction", e.target.value as "CREADA" | "RESPUESTA")
                }
              >
                <option value="CREADA">
                  Petición que presentamos a una entidad
                </option>
                <option value="RESPUESTA">
                  Petición recibida que debemos responder
                </option>
              </select>
            </LegalField>
            <LegalField label="Modalidad">
              <select
                className={selectClass}
                disabled={frozen || termStarted}
                value={form.petitionType}
                onChange={(e) => change("petitionType", e.target.value)}
              >
                <option value="GENERAL">General · 15 días hábiles</option>
                <option value="INFORMACION">
                  Información o documentos · 10 días hábiles
                </option>
                <option value="CONSULTA">Consulta · 30 días hábiles</option>
              </select>
            </LegalField>
            <LegalField label="Correo de notificación">
              <Input
                type="email"
                disabled={frozen}
                value={form.petitionerEmail}
                onChange={(e) => change("petitionerEmail", e.target.value)}
              />
            </LegalField>
            <div className="md:col-span-2">
              <LegalField label="Dirección o datos de notificación">
                <Input
                  value={form.notificationAddress}
                  onChange={(e) =>
                    change("notificationAddress", e.target.value)
                  }
                />
              </LegalField>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="md:col-span-2">
              <LegalField label="Hechos">
                <Textarea
                  disabled={frozen}
                  rows={6}
                  value={form.facts}
                  onChange={(e) => change("facts", e.target.value)}
                  maxLength={40000}
                />
              </LegalField>
            </div>
            <div className="md:col-span-2">
              <LegalField
                label="Solicitudes o pretensiones"
                hint="Escribe cada solicitud por separado para facilitar su revisión frente a la respuesta."
              >
                <Textarea
                  disabled={frozen}
                  rows={6}
                  value={form.requests}
                  onChange={(e) => change("requests", e.target.value)}
                  maxLength={40000}
                />
              </LegalField>
            </div>
            <div className="md:col-span-2">
              <LegalField label="Fundamentos jurídicos revisados por el abogado">
                <Textarea
                  disabled={frozen}
                  rows={4}
                  value={form.legalBasis}
                  onChange={(e) => change("legalBasis", e.target.value)}
                  maxLength={20000}
                />
              </LegalField>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <LegalField label="Prioridad">
              <select
                className={selectClass}
                value={form.priority}
                onChange={(e) => change("priority", e.target.value)}
              >
                {Object.entries(priorities).map(([key, value]) => (
                  <option value={key} key={key}>
                    {value}
                  </option>
                ))}
              </select>
            </LegalField>
            <LegalField label="Responsable">
              <select
                className={selectClass}
                disabled={!!petition && !options.data?.canSupervise}
                value={form.assignedLawyerId}
                onChange={(e) => change("assignedLawyerId", e.target.value)}
              >
                <option value="">Mi usuario</option>
                {options.data?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </LegalField>
            <LegalField label="Acceso al expediente">
              <select
                className={selectClass}
                value={form.visibility}
                onChange={(e) => change("visibility", e.target.value)}
              >
                <option value="TEAM">Equipo con permiso de Peticiones</option>
                <option value="ASSIGNED">
                  Creador, responsables de tareas, abogado y coordinación
                </option>
              </select>
            </LegalField>
            <LegalField
              label="Fecha interna de trabajo"
              hint="No modifica el término legal."
            >
              <Input
                type="date"
                value={form.internalDueAt}
                onChange={(e) => change("internalDueAt", e.target.value)}
              />
            </LegalField>
            <LegalField label="Avisos preventivos: días calendario antes de vencer">
              <Input
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
              />
            </LegalField>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.emailReminders}
                onChange={(e) => change("emailReminders", e.target.checked)}
              />
              También avisar por correo al responsable
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                disabled={termStarted}
                checked={form.workingSaturdays}
                onChange={(e) => change("workingSaturdays", e.target.checked)}
              />
              La entidad trabaja los sábados
            </label>
            <LegalField
              label="Otros días no hábiles de la entidad"
              hint="Fechas AAAA-MM-DD, separadas por coma; los festivos nacionales ya se contemplan."
            >
              <Input
                disabled={termStarted}
                value={excludedText}
                onChange={(e) => setExcludedText(e.target.value)}
              />
            </LegalField>
            <div className="md:col-span-2">
              <LegalField label="Fundamento del calendario de la entidad">
                <Textarea
                  disabled={termStarted}
                  rows={2}
                  value={form.calendarReason}
                  onChange={(e) => change("calendarReason", e.target.value)}
                />
              </LegalField>
            </div>
          </>
        )}
        {step === 3 && (
          <div className="space-y-4 md:col-span-2">
            <h3 className="font-semibold">
              {form.subject || "Asunto por completar"}
            </h3>
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Solicitante</dt>
                <dd>{form.petitioner || "Por completar"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Destinatario</dt>
                <dd>{form.recipient || "Por completar"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hechos</dt>
                <dd className="whitespace-pre-wrap">
                  {form.facts || "Por completar"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Solicitudes</dt>
                <dd className="whitespace-pre-wrap">
                  {form.requests || "Por completar"}
                </dd>
              </div>
            </dl>
            <p className="rounded-lg bg-muted p-4 text-sm">
              El documento, su envío, la radicación y la recepción se registran
              por separado. El término legal necesita una recepción competente
              acreditada.
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={step === 0 || busy}
            onClick={() => setStep((n) => n - 1)}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          {step < 3 && (
            <Button variant="outline" onClick={() => setStep((n) => n + 1)}>
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
        <Button disabled={busy} onClick={() => void save()}>
          <Save className="size-4" />
          {busy ? "Guardando…" : file ? "Guardar cambios" : "Guardar borrador"}
        </Button>
      </div>
    </section>
  );
}
