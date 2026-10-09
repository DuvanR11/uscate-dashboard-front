"use client";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { usePlatformCapability } from "./access-context";
import { QuerySection } from "./query-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createSupport,
  commandSupport,
  detailSupport,
  listSupport,
  supportContacts,
  supportOperators,
  SUPPORT_STATE,
  SUPPORT_PRIORITY,
  SUPPORT_CATEGORY,
  type SupportTicket,
} from "@/lib/api/support";
import {
  extractErrorMessage,
  searchPlatformOrganizations,
} from "@/lib/api/platform";

const date = (v: string) =>
  new Date(v).toLocaleString("es-CO", { timeZone: "America/Bogota" });
function Options({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </>
  );
}
const selectClass = "block w-full rounded-md border bg-background p-2";
function ReliableForm({
  build,
  send,
  onSaved,
  children,
  label,
}: {
  build: (data: FormData) => Record<string, unknown>;
  send: (input: Record<string, unknown>) => Promise<unknown>;
  onSaved: () => void;
  children: React.ReactNode;
  label: string;
}) {
  const pending = useRef<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
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
            extractErrorMessage(e) || "No se pudo confirmar el resultado.",
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      <fieldset disabled={saving || uncertain} className="space-y-3">
        {children}
      </fieldset>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {uncertain && (
        <p className="text-sm">
          El resultado es incierto. Reintenta la misma solicitud para consultar
          o completar el registro sin duplicarlo.
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving
          ? "Guardando…"
          : uncertain
            ? "Reintentar la misma solicitud"
            : label}
      </Button>
    </form>
  );
}
function NewTicket({
  platform,
  organizationId,
  onSaved,
}: {
  platform: boolean;
  organizationId?: string;
  onSaved: (ticket: SupportTicket) => void;
}) {
  const [org, setOrg] = useState(organizationId ?? "");
  const canOrganizations = usePlatformCapability("ORGANIZATIONS_READ");
  const loadOrgs = useCallback(
    () =>
      searchPlatformOrganizations(
        new URLSearchParams({ page: "1", pageSize: "100" }),
      ),
    [],
  );
  const contacts = useCallback(() => supportContacts(org), [org]);
  const saved = useRef<SupportTicket | null>(null);
  return (
    <ReliableForm
      label="Crear solicitud"
      build={(data) => ({
        title: String(data.get("title")).trim(),
        body: String(data.get("body")).trim(),
        category: String(data.get("category")),
        priority: String(data.get("priority")),
        ...(platform ? { contactUserId: String(data.get("contact")) } : {}),
      })}
      send={async (input) => {
        saved.current = await createSupport(platform, org, input);
      }}
      onSaved={() => onSaved(saved.current!)}
    >
      <h2 className="font-semibold">Nueva solicitud de soporte</h2>
      {platform &&
        !organizationId &&
        (canOrganizations ? (
          <QuerySection title="Organización" load={loadOrgs}>
            {(result) => (
              <label>
                Organización
                <select
                  required
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Selecciona una organización</option>
                  {result.items.map((o) => (
                    <option value={o.id} key={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs">
                  Primeras 100 coincidencias. También puedes crear solicitudes
                  desde la ficha de una organización.
                </p>
              </label>
            )}
          </QuerySection>
        ) : (
          <p>
            Abre la ficha de una organización autorizada para crear la
            solicitud.
          </p>
        ))}
      {platform && org && (
        <QuerySection title="Contacto de la organización" load={contacts}>
          {(items) => (
            <label>
              Contacto administrador
              <select name="contact" required className={selectClass}>
                <option value="">Selecciona contacto</option>
                {items.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
              {!items.length && (
                <p>No hay administradores activos disponibles.</p>
              )}
            </label>
          )}
        </QuerySection>
      )}
      <label className="block text-sm">
        Asunto
        <Input name="title" minLength={5} maxLength={160} required />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          Categoría
          <select name="category" className={selectClass}>
            <Options values={SUPPORT_CATEGORY} />
          </select>
        </label>
        <label>
          Prioridad
          <select name="priority" defaultValue="NORMAL" className={selectClass}>
            <Options values={SUPPORT_PRIORITY} />
          </select>
        </label>
      </div>
      <label className="block text-sm">
        Describe el problema
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={6000}
          className="block min-h-28 w-full rounded-md border p-2"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        No incluyas contraseñas ni claves de acceso. Atención de lunes a viernes
        de 9:00 a 18:00, hora de Colombia; el calendario de festivos y los
        avisos automáticos siguen pendientes.
      </p>
    </ReliableForm>
  );
}
function TicketActions({
  ticket,
  platform,
  onSaved,
}: {
  ticket: SupportTicket;
  platform: boolean;
  onSaved: () => void;
}) {
  const [action, setAction] = useState("PUBLIC_REPLY");
  const operators = useCallback(
    () => supportOperators(ticket.organizationId),
    [ticket.organizationId],
  );
  const choices = platform
    ? [
        "PUBLIC_REPLY",
        "INTERNAL_NOTE",
        ...(ticket.state !== "RESOLVED" ? ["UPDATE"] : []),
        "RESOLVE",
      ]
    : [
        "PUBLIC_REPLY",
        ...(ticket.state === "RESOLVED" ? ["CONFIRM_CLOSE"] : []),
      ];
  if (ticket.state === "CLOSED") choices.splice(0, choices.length, "REOPEN");
  const labels: Record<string, string> = {
    PUBLIC_REPLY: "Mensaje al cliente",
    INTERNAL_NOTE: "Nota interna",
    UPDATE: "Asignación y seguimiento",
    RESOLVE: "Registrar resolución",
    CONFIRM_CLOSE: "Confirmo que está resuelto: cerrar",
    REOPEN: "Reabrir por el mismo problema",
  };
  const effective = choices.includes(action) ? action : choices[0];
  return (
    <ReliableForm
      key={ticket.version}
      label="Guardar en el ticket"
      build={(data) => ({
        action: effective,
        expectedVersion: ticket.version,
        body: String(data.get("body")).trim(),
        ...(effective === "UPDATE"
          ? {
              state: String(data.get("state")),
              priority: String(data.get("priority")),
              category: String(data.get("category")),
              assigneeId: String(data.get("assignee")),
              nextAction: String(data.get("nextAction")).trim(),
              followUpAt: new Date(
                `${data.get("followUpAt")}:00-05:00`,
              ).toISOString(),
            }
          : {}),
        ...(effective === "RESOLVE"
          ? { resolutionEvidence: String(data.get("evidence")).trim() }
          : {}),
      })}
      send={(input) => commandSupport(platform, ticket.id, input)}
      onSaved={onSaved}
    >
      <h3 className="font-semibold">
        {platform ? "Atender solicitud" : "Responder y confirmar"}
      </h3>
      <label>
        Acción
        <select
          value={effective}
          onChange={(e) => setAction(e.target.value)}
          className={selectClass}
        >
          {choices.map((k) => (
            <option value={k} key={k}>
              {platform
                ? labels[k]
                : k === "PUBLIC_REPLY"
                  ? "Responder al equipo de soporte"
                  : labels[k]}
            </option>
          ))}
        </select>
      </label>
      {effective === "INTERNAL_NOTE" && (
        <p className="text-sm">
          Esta nota solo será visible para el equipo de plataforma autorizado.
        </p>
      )}
      {effective === "UPDATE" && (
        <>
          <QuerySection title="Responsable autorizado" load={operators}>
            {(items) => (
              <label>
                Responsable
                <select
                  name="assignee"
                  required
                  defaultValue={ticket.assigneeId ?? ""}
                  className={selectClass}
                >
                  <option value="">Selecciona responsable</option>
                  {items.map((u) => (
                    <option value={u.id} key={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
                {!items.length && (
                  <p>
                    No hay operadores con capacidad y ámbito de soporte para
                    esta organización.
                  </p>
                )}
              </label>
            )}
          </QuerySection>
          <label>
            Estado
            <select
              name="state"
              defaultValue={ticket.state === "NEW" ? "ASSIGNED" : ticket.state}
              className={selectClass}
            >
              <Options
                values={Object.fromEntries(
                  Object.entries(SUPPORT_STATE).filter(
                    ([k]) => !["NEW", "RESOLVED", "CLOSED"].includes(k),
                  ),
                )}
              />
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Prioridad
              <select
                name="priority"
                defaultValue={ticket.priority}
                className={selectClass}
              >
                <Options values={SUPPORT_PRIORITY} />
              </select>
            </label>
            <label>
              Categoría
              <select
                name="category"
                defaultValue={ticket.category}
                className={selectClass}
              >
                <Options values={SUPPORT_CATEGORY} />
              </select>
            </label>
          </div>
          <label className="block">
            Próxima acción
            <Input
              name="nextAction"
              required
              minLength={5}
              maxLength={1000}
              defaultValue={ticket.nextAction}
            />
          </label>
          <label className="block">
            Próximo seguimiento (hora de Colombia)
            <Input name="followUpAt" required type="datetime-local" />
          </label>
        </>
      )}
      <label className="block text-sm">
        {effective === "RESOLVE"
          ? "Explicación de la solución"
          : effective === "CONFIRM_CLOSE"
            ? "Confirmación del cliente"
            : effective === "INTERNAL_NOTE"
              ? "Nota interna"
              : "Mensaje o motivo visible para el cliente"}
        <textarea
          name="body"
          minLength={10}
          maxLength={6000}
          required
          className="block min-h-24 w-full rounded-md border p-2"
        />
      </label>
      {effective === "RESOLVE" && (
        <label className="block">
          Evidencia de la solución
          <textarea
            name="evidence"
            required
            minLength={10}
            maxLength={4000}
            className="block min-h-20 w-full rounded-md border p-2"
          />
        </label>
      )}
      {effective === "REOPEN" && (
        <p className="text-sm">
          Disponible durante 15 días calendario desde el cierre. Después, crea
          una nueva solicitud.
        </p>
      )}
    </ReliableForm>
  );
}
function TicketDetail({
  id,
  platform,
  canWrite,
  onUpdated,
}: {
  id: string;
  platform: boolean;
  canWrite: boolean;
  onUpdated: () => void;
}) {
  const [revision, setRevision] = useState(0),
    [page, setPage] = useState(1);
  const load = useCallback(
    () => detailSupport(platform, id, page),
    [platform, id, page],
  );
  return (
    <QuerySection
      key={`${id}-${revision}`}
      title="Detalle de soporte"
      load={load}
    >
      {(data) => (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{data.ticket.title}</h2>
          <p>
            {SUPPORT_STATE[data.ticket.state]} ·{" "}
            {SUPPORT_PRIORITY[data.ticket.priority]} ·{" "}
            {SUPPORT_CATEGORY[data.ticket.category]}
          </p>
          <p className="text-sm">
            Contacto: {data.ticket.contactName} · Responsable:{" "}
            {data.ticket.assigneeName ?? "Pendiente de asignación"}
          </p>
          <p className="whitespace-pre-wrap text-sm">
            Próxima acción: {data.ticket.nextAction}
          </p>
          {data.ticket.followUpAt && (
            <p className="text-sm">
              Seguimiento: {date(data.ticket.followUpAt)}
            </p>
          )}
          {data.ticket.resolution && (
            <div className="rounded-lg border p-3">
              <p className="font-medium">Última resolución registrada</p>
              <p className="whitespace-pre-wrap">{data.ticket.resolution}</p>
              <p className="whitespace-pre-wrap text-sm">
                Evidencia: {data.ticket.resolutionEvidence}
              </p>
            </div>
          )}
          <section className="space-y-3" aria-label="Conversación del ticket">
            {data.entries.map((entry) => (
              <article
                key={entry.id}
                className={`rounded-lg border p-3 ${entry.visibility === "INTERNAL" ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
              >
                <p className="text-xs text-muted-foreground">
                  {entry.actorName} · {date(entry.createdAt)} ·{" "}
                  {entry.visibility === "INTERNAL"
                    ? "Nota interna"
                    : entry.action === "PUBLIC_REPLY"
                      ? "Mensaje"
                      : "Actualización"}
                </p>
                <p className="whitespace-pre-wrap break-words">{entry.body}</p>
                {entry.metadata.resolutionEvidence && (
                  <p className="whitespace-pre-wrap text-sm">
                    Evidencia: {entry.metadata.resolutionEvidence}
                  </p>
                )}
              </article>
            ))}
          </section>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Más recientes
            </Button>
            <span className="text-sm">
              Historial: página {page} de{" "}
              {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </span>
            <Button
              variant="outline"
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Anteriores
            </Button>
            <Button variant="ghost" onClick={() => setRevision((r) => r + 1)}>
              Consultar estado
            </Button>
          </div>
          {canWrite && (
            <TicketActions
              ticket={data.ticket}
              platform={platform}
              onSaved={() => {
                setRevision((r) => r + 1);
                setPage(1);
                onUpdated();
              }}
            />
          )}
        </div>
      )}
    </QuerySection>
  );
}
export function SupportBoard({
  platform = false,
  organizationId,
}: {
  platform?: boolean;
  organizationId?: string;
}) {
  const canRead = usePlatformCapability("SUPPORT_READ"),
    canManage = usePlatformCapability("SUPPORT_MANAGE");
  const role = useAuthStore((s) => s.user?.role?.code);
  const customer = ["ADMIN", "SUPER_ADMIN"].includes(role ?? "");
  const [state, setState] = useState(""),
    [priority, setPriority] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [creating, setCreating] = useState(false),
    [selected, setSelected] = useState("");
  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (organizationId) query.set("organizationId", organizationId);
    if (state) query.set("state", state);
    if (priority) query.set("priority", priority);
    return listSupport(platform, query);
  }, [page, state, priority, organizationId, platform]);
  if (platform ? !canRead : !customer)
    return (
      <p>No tienes permiso para consultar soporte de esta organización.</p>
    );
  const canWrite = platform ? canManage : customer;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Soporte a organizaciones</h1>
      <p className="text-sm text-muted-foreground">
        Solicitudes y seguimiento dentro de la aplicación. Las fallas de
        plataforma y problemas de cobro o acceso no consumen horas. Esta entrega
        no descuenta acompañamiento ni calcula objetivos con festivos.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label>
          Estado
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">Todos</option>
            <Options values={SUPPORT_STATE} />
          </select>
        </label>
        <label>
          Prioridad
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">Todas</option>
            <Options values={SUPPORT_PRIORITY} />
          </select>
        </label>
        <Button variant="outline" onClick={() => setRevision((r) => r + 1)}>
          Actualizar bandeja
        </Button>
        {canWrite && !creating && (
          <Button onClick={() => setCreating(true)}>Nueva solicitud</Button>
        )}
      </div>
      {creating && (
        <NewTicket
          platform={platform}
          organizationId={organizationId}
          onSaved={(ticket) => {
            setCreating(false);
            setSelected(ticket.id);
            setRevision((r) => r + 1);
          }}
        />
      )}
      <QuerySection
        key={`list-${revision}`}
        title="Bandeja de soporte"
        load={load}
      >
        {(result) => (
          <>
            <p className="text-sm">
              {result.total} solicitudes · página {result.page}
            </p>
            {result.items.length ? (
              <ul className="space-y-3">
                {result.items.map((ticket) => (
                  <li key={ticket.id} className="rounded-lg border p-3">
                    <button
                      className="text-left font-semibold text-primary underline"
                      onClick={() => setSelected(ticket.id)}
                    >
                      {ticket.title}
                    </button>
                    <p className="text-sm">
                      {platform
                        ? `${ticket.organizationName ?? ticket.organizationId} · `
                        : ""}
                      {SUPPORT_STATE[ticket.state]} ·{" "}
                      {SUPPORT_PRIORITY[ticket.priority]}
                    </p>
                    <p className="text-sm">
                      {ticket.assigneeName ?? "Sin asignar"} ·{" "}
                      {ticket.nextAction}
                    </p>
                    {ticket.followUpAt && (
                      <p className="text-xs">
                        Seguimiento: {date(ticket.followUpAt)}
                      </p>
                    )}
                    {platform && (
                      <Link
                        className="text-xs text-primary underline"
                        href={`/platform/organizations/${ticket.organizationId}`}
                      >
                        Ficha de organización
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay solicitudes que coincidan con los filtros.</p>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page * 25 >= result.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </>
        )}
      </QuerySection>
      {selected && (
        <TicketDetail
          key={selected}
          id={selected}
          platform={platform}
          canWrite={canWrite}
          onUpdated={() => setRevision((r) => r + 1)}
        />
      )}
    </div>
  );
}
