"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  FilePenLine,
  History,
  Paperclip,
  Pencil,
  ShieldCheck,
  Sparkles,
  ListTodo,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { LegalCaseForm } from "./legal-case-form";
import { LegalCaseActions } from "./legal-case-actions";
import { LegalCaseTasks } from "./legal-case-tasks";
import { LegalCaseDocuments } from "./legal-case-documents";
import { LegalCaseAi } from "./legal-case-ai";
import { LegalDraftEditor } from "./legal-draft-editor";
import {
  actionLabels,
  evaluations,
  LegalDetail,
  LegalEvent,
  LegalPage,
  priorities,
} from "./legal-model";
import {
  LegalEmpty,
  LegalError,
  LegalLoading,
  Pagination,
  Stage,
  legalDate,
  legalError,
  useLegalResource,
} from "./legal-ui";
import { HISTORY_ACTION_LABELS } from "../_components/petition-model";

export function LegalCaseDetail({
  id,
  canWrite,
  onBack,
}: {
  id: string;
  canWrite: boolean;
  onBack: () => void;
}) {
  const [taskPage, setTaskPage] = useState(1);
  const [documentPage, setDocumentPage] = useState(1);
  const [versionPage, setVersionPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const resource = useLegalResource<LegalDetail>(
    `/petitions/${id}/case?taskPage=${taskPage}&documentPage=${documentPage}&versionPage=${versionPage}&historyPage=${historyPage}`,
  );
  const [tab, setTab] = useState("case");
  const [editing, setEditing] = useState(false);
  const [attachmentId, setAttachmentId] = useState("");
  const [error, setError] = useState("");
  const [navigating, setNavigating] = useState(false);
  const draftSave = useRef<(() => Promise<void>) | null>(null);
  const registerDraftSave = useCallback(
    (save: (() => Promise<void>) | null) => {
      draftSave.current = save;
    },
    [],
  );
  const currentUser = useAuthStore((state) => state.user);
  if (resource.error && !resource.data)
    return (
      <>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Volver a expedientes
        </Button>
        <LegalError message={resource.error} retry={resource.reload} />
      </>
    );
  if (!resource.data) return <LegalLoading />;
  const detail = resource.data;
  const petition = detail.petition;
  const file = petition.workspace;
  function changed() {
    resource.reload();
  }
  async function navigate(action: () => void) {
    setError("");
    setNavigating(true);
    try {
      if (tab === "draft") await draftSave.current?.();
      action();
    } catch (e) {
      setError(legalError(e));
    } finally {
      setNavigating(false);
    }
  }
  async function download() {
    setError("");
    try {
      if (tab === "draft") await draftSave.current?.();
      const response = await api.get(`/petitions/${id}/case/export`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `expediente-${id}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(legalError(e));
    }
  }
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Button
            disabled={navigating}
            variant="ghost"
            className="mb-2 -ml-3"
            onClick={() => void navigate(onBack)}
          >
            <ArrowLeft className="size-4" />
            Volver a expedientes
          </Button>
          <h1 className="break-words text-2xl font-semibold">
            {file?.subject || petition.petitioner || "Expediente jurídico"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Stage value={file?.stage} />
            <span className="text-sm text-muted-foreground">
              {petition.radicado
                ? `Radicado ${petition.radicado}`
                : "Sin radicado registrado"}
            </span>
            {file && (
              <span className="text-sm text-muted-foreground">
                Prioridad {priorities[file.priority]?.toLowerCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={editing || navigating}
            onClick={() => void navigate(resource.reload)}
          >
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
          {canWrite && (
            <Button
              disabled={navigating}
              variant="outline"
              onClick={() => void navigate(() => setEditing(true))}
            >
              <Pencil className="size-4" />
              Editar ficha
            </Button>
          )}
          <Button variant="outline" onClick={() => void download()}>
            <Download className="size-4" />
            Exportar ficha e historial
          </Button>
        </div>
      </header>
      {error && <LegalError message={error} />}
      {resource.error && (
        <LegalError message={resource.error} retry={resource.reload} />
      )}
      {editing || !file ? (
        <>
          <LegalCaseForm
            key={`${id}-${file?.version || 0}`}
            petition={petition}
            onSaved={() => {
              setEditing(false);
              changed();
            }}
            onCancel={() => (file ? setEditing(false) : onBack())}
          />
          {!file && (
            <p className="text-sm text-muted-foreground">
              Este registro conserva su documento y fechas anteriores. La ficha
              habilita el seguimiento jurídico; la recepción se acredita
              mediante una actuación independiente.
            </p>
          )}
        </>
      ) : (
        <>
          <section
            className={`grid gap-4 rounded-xl border p-5 md:grid-cols-3 ${detail.daysLeft !== null && detail.daysLeft < 0 && !["CLOSED", "ARCHIVED"].includes(file.stage) ? "border-destructive/30 bg-destructive/5" : "bg-card"}`}
            aria-label="Control de términos"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Término legal
              </p>
              <p className="mt-2 text-xl font-semibold">
                {["CLOSED", "ARCHIVED"].includes(file.stage)
                  ? "Expediente cerrado"
                  : file.suspendedAt
                    ? "Suspendido por requerimiento"
                    : file.legalDueAt
                      ? legalDate(file.legalDueAt)
                      : "No iniciado"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {file.legalDueAt &&
                !file.suspendedAt &&
                !["CLOSED", "ARCHIVED"].includes(file.stage)
                  ? detail.daysLeft! < 0
                    ? `Vencido hace ${Math.abs(detail.daysLeft!)} días calendario`
                    : detail.daysLeft === 0
                      ? "Vence hoy"
                      : `${detail.daysLeft} días calendario disponibles`
                  : "La firma y el envío no acreditan recepción."}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recepción competente
              </p>
              <p className="mt-2 font-medium">
                {file.competentReceivedAt
                  ? legalDate(file.competentReceivedAt)
                  : "Por acreditar"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {file.recipient || "Entidad por definir"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Organización del trabajo
              </p>
              <p className="mt-2 font-medium">
                Fecha interna: {legalDate(file.internalDueAt)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {file.supplementationDueAt
                  ? `Subsanación: ${legalDate(file.supplementationDueAt)}`
                  : file.responseEvaluation
                    ? evaluations[file.responseEvaluation]
                    : "La fecha interna no modifica el plazo legal."}
              </p>
            </div>
          </section>
          <nav
            aria-label="Secciones del expediente"
            className="flex flex-wrap gap-1 rounded-xl border bg-card p-1.5"
          >
            {[
              ["case", "Seguimiento", History],
              ["draft", "Redacción", FilePenLine],
              ["tasks", "Tareas", ListTodo],
              ["documents", "Documentos", Paperclip],
              ...(canWrite ? [["ai", "Copiloto", Sparkles]] : []),
            ].map(([key, label, Icon]) => {
              const NavIcon = Icon as typeof History;
              return (
                <Button
                  key={String(key)}
                  variant={tab === key ? "default" : "ghost"}
                  disabled={navigating}
                  onClick={() => void navigate(() => setTab(String(key)))}
                >
                  <NavIcon className="size-4" />
                  {String(label)}
                </Button>
              );
            })}
          </nav>
          {tab === "case" && (
            <div className="grid items-start gap-5 xl:grid-cols-2">
              <div className="space-y-5">
                {canWrite && (
                  <LegalCaseActions detail={detail} onChange={changed} />
                )}
                <section className="space-y-4 rounded-xl border bg-card p-5">
                  <h2 className="font-semibold">Información del expediente</h2>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Solicitante</dt>
                      <dd>{petition.petitioner}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Correo</dt>
                      <dd className="break-all">
                        {petition.petitionerEmail || "Sin registrar"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Responsable</dt>
                      <dd>
                        {petition.assignedLawyerId === currentUser?.id
                          ? "Asignado a mí"
                          : "Usuario del equipo"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Acceso</dt>
                      <dd>
                        {file.visibility === "TEAM"
                          ? "Equipo con permiso"
                          : "Creador, responsables de tareas, abogado y coordinación"}
                      </dd>
                    </div>
                  </dl>
                  {[
                    ["Hechos", file.facts],
                    ["Solicitudes", file.requests],
                    ["Fundamentos aportados", file.legalBasis],
                    ["Respuesta recibida", file.responseText],
                  ].map(
                    ([label, value]) =>
                      value && (
                        <div key={label}>
                          <h3 className="mb-1 text-sm font-medium">{label}</h3>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {value}
                          </p>
                        </div>
                      ),
                  )}
                </section>
              </div>
              <div>
                <LegalTimeline
                  id={id}
                  revision={file.version}
                  detail={detail}
                />
                {detail.pagination.history.lastPage > 1 && (
                  <Pagination
                    {...detail.pagination.history}
                    onPage={setHistoryPage}
                  />
                )}
              </div>
            </div>
          )}
          {tab === "draft" && (
            <LegalDraftEditor
              detail={detail}
              registerSave={registerDraftSave}
              canWrite={
                canWrite &&
                !navigating &&
                !["CLOSED", "ARCHIVED"].includes(file.stage)
              }
              onChange={changed}
            />
          )}
          {tab === "tasks" && (
            <LegalCaseTasks
              id={id}
              tasks={detail.tasks}
              canWrite={
                canWrite && !["CLOSED", "ARCHIVED"].includes(file.stage)
              }
              onChange={changed}
            />
          )}
          {tab === "documents" && (
            <LegalCaseDocuments
              detail={detail}
              canWrite={
                canWrite && !["CLOSED", "ARCHIVED"].includes(file.stage)
              }
              onChange={changed}
              onExtract={(value) => {
                setAttachmentId(value);
                setTab("ai");
              }}
            />
          )}
          {tab === "ai" && canWrite && (
            <LegalCaseAi
              key={attachmentId || "case-ai"}
              detail={detail}
              attachmentId={attachmentId}
              onChange={changed}
            />
          )}
          {tab === "tasks" && detail.pagination.tasks.lastPage > 1 && (
            <Pagination {...detail.pagination.tasks} onPage={setTaskPage} />
          )}
          {tab === "documents" && detail.pagination.documents.lastPage > 1 && (
            <Pagination
              {...detail.pagination.documents}
              onPage={setDocumentPage}
            />
          )}
          {tab === "draft" && detail.pagination.versions.lastPage > 1 && (
            <Pagination
              {...detail.pagination.versions}
              onPage={setVersionPage}
            />
          )}
          <details className="rounded-xl border bg-card p-4 text-sm">
            <summary className="cursor-pointer font-medium">
              <ShieldCheck className="mr-2 inline size-4" />
              Fuentes oficiales del control de términos
            </summary>
            <ul className="mt-3 space-y-2">
              {detail.legalSources.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

function LegalTimeline({
  id,
  revision,
  detail,
}: {
  id: string;
  revision: number;
  detail: LegalDetail;
}) {
  const [page, setPage] = useState(1);
  const events = useLegalResource<LegalPage<LegalEvent>>(
    `/petitions/${id}/case/events?page=${page}&r=${revision}&tasks=${detail.tasks.length}&docs=${detail.attachments.length}`,
  );
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-5 font-semibold">Línea de tiempo del expediente</h2>
      {events.error && (
        <LegalError message={events.error} retry={events.reload} />
      )}
      {events.loading ? (
        <LegalLoading />
      ) : !events.data?.data.length ? (
        <LegalEmpty>No hay actuaciones registradas.</LegalEmpty>
      ) : (
        <>
          <ol className="ml-2 space-y-6 border-l-2 border-primary/20">
            {events.data.data.map((event) => (
              <li className="relative pl-5" key={event.id}>
                <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-primary" />
                <p className="text-sm font-semibold">
                  {actionLabels[event.kind] || "Actuación registrada"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {legalDate(event.happenedAt)} · {event.actorName || "Sistema"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {event.detail}
                </p>
                {event.evidenceId && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Evidencia:{" "}
                    {detail.attachments.find(
                      (item) => item.id === event.evidenceId,
                    )?.document.name || "Documento del expediente"}
                  </p>
                )}
                {event.metadata?.calculation !== undefined && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-primary">
                      Ver cálculo y calendario registrado
                    </summary>
                    <TermCalculation
                      value={event.metadata.calculation}
                      sources={detail.legalSources}
                    />
                  </details>
                )}
              </li>
            ))}
          </ol>
          <Pagination {...events.data.meta} page={page} onPage={setPage} />
        </>
      )}
      {!!detail.history.length && (
        <details className="mt-5 border-t pt-4">
          <summary className="cursor-pointer text-sm font-medium">
            Historial de redacción, revisión y firma
          </summary>
          <ul className="mt-4 space-y-3">
            {detail.history.map((item) => (
              <li key={item.id} className="border-l pl-3 text-sm">
                <p className="font-medium">
                  {HISTORY_ACTION_LABELS[item.action] ||
                    "Actuación del documento"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {legalDate(item.createdAt)} ·{" "}
                  {item.user?.fullName || "Sistema"}
                </p>
                {item.detail && <p className="mt-1 text-sm">{item.detail}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function TermCalculation({
  value,
  sources,
}: {
  value: unknown;
  sources: LegalDetail["legalSources"];
}) {
  if (!value || typeof value !== "object") return null;
  const calculation = value as Record<string, unknown>;
  const calendar = calculation.calendar as Record<string, unknown> | undefined;
  const excluded = Array.isArray(calendar?.excludedDays)
    ? calendar.excludedDays.filter((x): x is string => typeof x === "string")
    : [];
  const ids = Array.isArray(calculation.sourceIds) ? calculation.sourceIds : [];
  return (
    <div className="mt-3 space-y-2 rounded-lg bg-muted p-3 leading-5">
      {typeof calculation.days === "number" && (
        <p>
          Término: {calculation.days} días hábiles, contados desde el día
          siguiente a la recepción.
        </p>
      )}
      {typeof calculation.dueAt === "string" && (
        <p>
          Vencimiento calculado: <strong>{legalDate(calculation.dueAt)}</strong>
          .
        </p>
      )}
      <p>
        Calendario:{" "}
        {calendar?.workingSaturdays ? "lunes a sábado" : "lunes a viernes"},
        excluidos festivos nacionales
        {excluded.length
          ? ` y ${excluded.map((d) => legalDate(d)).join(", ")}`
          : ""}
        .
      </p>
      {sources
        .filter((s) => ids.includes(s.id))
        .map((s) => (
          <a
            className="block text-primary underline"
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
          >
            {s.title}
          </a>
        ))}
    </div>
  );
}
