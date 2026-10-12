"use client";
import { SessionForm } from "./support-session-form";
import { ReservationPanel } from "./support-reservation";
import type { SupportReservation } from "@/lib/api/support-reservations";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuerySection } from "./query-section";
import { usePlatformCapability } from "./access-context";
import { searchPlatformOrganizations } from "@/lib/api/platform";
import {
  listSupport,
  supportContacts,
  supportOperators,
} from "@/lib/api/support";
import {
  commandSession,
  createSession,
  detailSession,
  listSessions,
  SESSION_KIND,
  SESSION_STATE,
  SESSION_CHANNEL,
  SESSION_ACCOUNTING,
  type SupportSession,
} from "@/lib/api/support-sessions";
const selectClass = "block w-full rounded-md border bg-background p-2";
const date = (v: string) =>
  new Date(v).toLocaleString("es-CO", { timeZone: "America/Bogota" });
const local = (v: string) =>
  new Date(new Date(v).getTime() - 5 * 3600000).toISOString().slice(0, 19);
export const colombiaInstant = (v: string) =>
  new Date(v + "-05:00").toISOString();
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
export { SessionForm } from "./support-session-form";
function NewSession({
  organizationId,
  onSaved,
}: {
  organizationId?: string;
  onSaved: () => void;
}) {
  const [org, setOrg] = useState(organizationId ?? "");
  const canOrganizations = usePlatformCapability("ORGANIZATIONS_READ");
  const organizations = useCallback(
      () =>
        searchPlatformOrganizations(
          new URLSearchParams({ page: "1", pageSize: "100" }),
        ),
      [],
    ),
    contacts = useCallback(() => supportContacts(org), [org]),
    operators = useCallback(() => supportOperators(org), [org]),
    tickets = useCallback(
      () =>
        listSupport(
          true,
          new URLSearchParams({
            organizationId: org,
            page: "1",
            pageSize: "100",
          }),
        ),
      [org],
    );
  return (
    <SessionForm
      key={org}
      label="Guardar sesión"
      onSaved={onSaved}
      build={(d) => ({
        title: String(d.get("title")).trim(),
        kind: d.get("kind"),
        contactUserId: d.get("contact"),
        assigneeId: d.get("assignee"),
        plannedStart: colombiaInstant(String(d.get("plannedStart"))),
        plannedEnd: colombiaInstant(String(d.get("plannedEnd"))),
        channel: d.get("channel"),
        instructions: String(d.get("instructions")).trim(),
        reason: String(d.get("reason")).trim(),
        ...(d.get("ticket") ? { ticketId: d.get("ticket") } : {}),
      })}
      send={(input) => createSession(org, input)}
    >
      <p className="text-sm">
        Fechas y horas de Colombia. Puedes registrar una sesión pasada para
        documentar su atención. Programar no reserva minutos ni confirma que el
        cliente aceptó la cita.
      </p>
      {!organizationId &&
        (canOrganizations ? (
          <QuerySection title="Organización de la sesión" load={organizations}>
            {(r) => (
              <label>
                Organización
                <select
                  className={selectClass}
                  required
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                >
                  <option value="">Selecciona organización</option>
                  {r.items.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </QuerySection>
        ) : (
          <label>
            Identificador de organización
            <Input
              required
              value={org}
              onChange={(e) => setOrg(e.target.value)}
            />
          </label>
        ))}
      <label className="block">
        Tema
        <Input name="title" required minLength={5} maxLength={180} />
      </label>
      <label className="block">
        Tipo de atención
        <select name="kind" className={selectClass}>
          <Options values={SESSION_KIND} />
        </select>
      </label>
      {org && (
        <>
          <QuerySection title="Contacto de la organización" load={contacts}>
            {(rows) => (
              <select
                aria-label="Contacto"
                className={selectClass}
                required
                name="contact"
              >
                <option value="">Selecciona contacto</option>
                {rows.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            )}
          </QuerySection>
          <QuerySection title="Responsable de la sesión" load={operators}>
            {(rows) => (
              <select
                aria-label="Responsable"
                required
                name="assignee"
                className={selectClass}
              >
                <option value="">Selecciona responsable</option>
                {rows.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            )}
          </QuerySection>
          <QuerySection title="Solicitud de soporte vinculada" load={tickets}>
            {(r) => (
              <select
                aria-label="Ticket vinculado"
                name="ticket"
                className={selectClass}
              >
                <option value="">Sin ticket vinculado</option>
                {r.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
          </QuerySection>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          Inicio previsto
          <Input name="plannedStart" type="datetime-local" step={1} required />
        </label>
        <label>
          Fin previsto
          <Input name="plannedEnd" type="datetime-local" step={1} required />
        </label>
      </div>
      <label className="block">
        Canal
        <select name="channel" className={selectClass}>
          <Options values={SESSION_CHANNEL} />
        </select>
      </label>
      <label className="block">
        Instrucciones para el cliente
        <Input name="instructions" required minLength={10} maxLength={2000} />
      </label>
      <label className="block">
        Motivo del registro
        <Input name="reason" required minLength={10} maxLength={2000} />
      </label>
      <p className="text-sm">
        Fallas, acceso, cobros y orientación inicial: sin cargo.
        Capacitación/asistencia personalizada: minutos pendientes de
        conciliación; no se descontarán automáticamente.
      </p>
    </SessionForm>
  );
}
function SessionActions({
  session,
  reservation,
  onSaved,
}: {
  session: SupportSession;
  reservation: SupportReservation | null;
  onSaved: () => void;
}) {
  const [action, setAction] = useState("COMPLETE");
  const initiated = reservation?.state === "STARTED";
  const canConfirmPayment = usePlatformCapability("PAYMENT_CONFIRM");
  const canReadBilling = usePlatformCapability("BILLING_READ");
  const canCancelStarted = canConfirmPayment && canReadBilling;
  const operators = useCallback(
    () => supportOperators(session.organizationId),
    [session.organizationId],
  );
  return (
    <div className="space-y-3">
      <label>
        Acción
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className={selectClass}
        >
          <option value="COMPLETE">Registrar atención realizada</option>
          <option value="RESCHEDULE" disabled={initiated}>
            Reprogramar / cambiar responsable
          </option>
          <option value="CANCEL" disabled={initiated && !canCancelStarted}>
            Cancelar
          </option>
          <option value="NO_SHOW" disabled={initiated}>
            Registrar inasistencia
          </option>
        </select>
      </label>
      <SessionForm
        key={`${session.id}-${session.version}-${action}`}
        label="Confirmar registro"
        onSaved={onSaved}
        send={(d) => commandSession(session.id, d)}
        build={(d) => ({
          action,
          expectedVersion: session.version,
          reason: String(d.get("reason")).trim(),
          ...(d.get("internalNote")
            ? { internalNote: String(d.get("internalNote")).trim() }
            : {}),
          ...(action === "RESCHEDULE"
            ? {
                plannedStart: colombiaInstant(String(d.get("plannedStart"))),
                plannedEnd: colombiaInstant(String(d.get("plannedEnd"))),
                assigneeId: d.get("assignee"),
                channel: d.get("channel"),
                instructions: String(d.get("instructions")).trim(),
              }
            : {
                ...(action === "COMPLETE"
                  ? {
                      actualStart:
                        initiated && reservation?.startedAt
                          ? reservation.startedAt
                          : colombiaInstant(String(d.get("actualStart"))),
                      actualEnd: colombiaInstant(String(d.get("actualEnd"))),
                      effectiveSeconds: Number(d.get("effectiveSeconds")),
                      outcome: String(d.get("outcome")).trim(),
                      evidence: String(d.get("evidence")).trim(),
                      nextSteps: String(d.get("nextSteps")).trim(),
                    }
                  : {}),
              }),
        })}
      >
        {action === "RESCHEDULE" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                Nuevo inicio (Colombia)
                <Input
                  name="plannedStart"
                  type="datetime-local"
                  step={1}
                  required
                  defaultValue={local(session.plannedStart)}
                />
              </label>
              <label>
                Nuevo fin (Colombia)
                <Input
                  name="plannedEnd"
                  type="datetime-local"
                  step={1}
                  required
                  defaultValue={local(session.plannedEnd)}
                />
              </label>
            </div>
            <QuerySection title="Responsable" load={operators}>
              {(rows) => (
                <select
                  aria-label="Responsable"
                  name="assignee"
                  required
                  defaultValue={session.assigneeId}
                  className={selectClass}
                >
                  <option value="">Selecciona responsable</option>
                  {rows.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              )}
            </QuerySection>
            <label className="block">
              Canal
              <select
                name="channel"
                defaultValue={session.channel}
                className={selectClass}
              >
                <Options values={SESSION_CHANNEL} />
              </select>
            </label>
            <label className="block">
              Instrucciones
              <Input
                name="instructions"
                required
                minLength={10}
                maxLength={2000}
                defaultValue={session.instructions}
              />
            </label>
          </>
        )}
        {action === "COMPLETE" && (
          <>
            <p>
              Registra tiempo efectivo, excluyendo pausas.{" "}
              {initiated
                ? "El tiempo autorizado se descontará de la reserva. Excesos o cruces de ventana quedarán en revisión sin descuento automático."
                : "Sin reserva iniciada y confirmación previa, este registro no descuenta saldo."}{" "}
              La sesión conservará su evidencia sin edición posterior.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                Inicio real (Colombia)
                {initiated && reservation?.startedAt ? (
                  <p>
                    {date(reservation.startedAt)} (inicio registrado por el
                    servidor)
                  </p>
                ) : (
                  <Input
                    name="actualStart"
                    type="datetime-local"
                    step={1}
                    required
                  />
                )}
              </label>
              <label>
                Fin real (Colombia)
                <Input
                  name="actualEnd"
                  type="datetime-local"
                  step={1}
                  required
                />
              </label>
            </div>
            <label className="block">
              Tiempo efectivo en segundos
              <Input
                name="effectiveSeconds"
                type="number"
                min={1}
                max={86400}
                step={1}
                required
              />
            </label>
            <label className="block">
              Resultado público
              <Input name="outcome" minLength={10} maxLength={4000} required />
            </label>
            <label className="block">
              Evidencia pública
              <Input name="evidence" minLength={10} maxLength={4000} required />
            </label>
            <label className="block">
              Próximos pasos
              <Input name="nextSteps" minLength={5} maxLength={2000} required />
            </label>
          </>
        )}
        <label className="block">
          Motivo visible para el cliente
          <Input name="reason" required minLength={10} maxLength={2000} />
        </label>
        <label className="block">
          Nota interna (opcional)
          <Input name="internalNote" minLength={5} maxLength={4000} />
        </label>
      </SessionForm>
    </div>
  );
}
function SessionDetails({
  id,
  platform,
  canManage,
  onTicket,
  onSaved,
}: {
  id: string;
  platform: boolean;
  canManage: boolean;
  onTicket: (id: string) => void;
  onSaved: () => void;
}) {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const load = useCallback(
    () => detailSession(platform, id, page),
    [platform, id, page],
  );
  return (
    <QuerySection
      key={`${id}-${revision}`}
      title="Detalle de acompañamiento"
      load={load}
    >
      {({ session: s, events, total }) => (
        <div className="space-y-3 break-words">
          <h3 className="font-semibold">{s.title}</h3>
          <p>
            {SESSION_STATE[s.state]} · {SESSION_KIND[s.kind]} · {s.assigneeName}
          </p>
          <p>
            {date(s.plannedStart)} — {date(s.plannedEnd)} ·{" "}
            {SESSION_CHANNEL[s.channel]}
          </p>
          <p>Contacto: {s.contactName}</p>
          <p className="whitespace-pre-wrap">{s.instructions}</p>
          {s.ticketId && (
            <Button variant="outline" onClick={() => onTicket(s.ticketId!)}>
              Abrir solicitud vinculada
            </Button>
          )}
          <p>{SESSION_ACCOUNTING[s.accountingState]}</p>
          {s.effectiveSeconds !== null && (
            <p>
              {(s.effectiveSeconds / 60).toFixed(2)} minutos efectivos (
              {s.effectiveSeconds} segundos).{" "}
              {s.actualStart && date(s.actualStart)} —{" "}
              {s.actualEnd && date(s.actualEnd)}
            </p>
          )}
          {s.outcome && <p>Resultado: {s.outcome}</p>}
          {s.evidence && <p>Evidencia: {s.evidence}</p>}
          {s.nextSteps && <p>Próximos pasos: {s.nextSteps}</p>}
          <ReservationPanel
            session={s}
            platform={platform}
            canManage={canManage}
            onSaved={() => {
              setRevision((v) => v + 1);
              onSaved();
            }}
          >
            {(reservation) =>
              platform && canManage && s.state === "PLANNED" ? (
                <SessionActions
                  session={s}
                  reservation={reservation}
                  onSaved={() => {
                    setRevision((v) => v + 1);
                    onSaved();
                  }}
                />
              ) : null
            }
          </ReservationPanel>
          <h4 className="font-semibold">Historial</h4>
          {events.map((e) => (
            <article className="rounded border p-3 space-y-1" key={e.id}>
              <p>
                {date(e.createdAt)} · {e.actorName} ·{" "}
                {
                  (
                    {
                      CREATED: "Creación",
                      RESCHEDULE: "Reprogramación",
                      COMPLETE: "Atención realizada",
                      CANCEL: "Cancelación",
                      NO_SHOW: "Inasistencia",
                    } as Record<string, string>
                  )[e.action]
                }
              </p>
              <p>{e.body}</p>
              {e.metadata?.after?.plannedStart && (
                <p>
                  Horario registrado: {date(e.metadata.after.plannedStart)} —{" "}
                  {date(e.metadata.after.plannedEnd)}
                </p>
              )}
              {e.internalNote && (
                <p className="whitespace-pre-wrap">
                  Nota interna: {e.internalNote}
                </p>
              )}
            </article>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((v) => v - 1)}
            >
              Historial anterior
            </Button>
            <Button
              variant="outline"
              disabled={page * 25 >= total}
              onClick={() => setPage((v) => v + 1)}
            >
              Historial siguiente
            </Button>
          </div>
        </div>
      )}
    </QuerySection>
  );
}
export function SupportSessionsPanel({
  platform,
  organizationId,
  onTicket,
  onBalanceChanged,
}: {
  platform: boolean;
  organizationId?: string;
  onTicket: (id: string) => void;
  onBalanceChanged?: () => void;
}) {
  const canManage = usePlatformCapability("SUPPORT_MANAGE");
  const [state, setState] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(""),
    [creating, setCreating] = useState(false),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (organizationId) q.set("organizationId", organizationId);
    if (state) q.set("state", state);
    if (from) q.set("from", colombiaInstant(from));
    if (to) q.set("to", colombiaInstant(to));
    return listSessions(platform, q);
  }, [platform, organizationId, state, page, from, to]);
  return (
    <section className="space-y-3" aria-label="Agenda y acompañamiento">
      <h2 className="text-xl font-semibold">Agenda y acompañamiento</h2>
      <p className="text-sm">
        Sesiones, tiempo efectivo y próximos pasos. Las fechas se muestran en
        hora de Colombia. El descuento requiere reserva, confirmación previa e
        inicio registrado; no genera compras ni cobros automáticos.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label>
          Estado de sesión
          <select
            className={selectClass}
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <Options values={SESSION_STATE} />
          </select>
        </label>
        <label>
          Desde (Colombia)
          <Input
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Hasta, exclusivo (Colombia)
          <Input
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <Button variant="outline" onClick={() => setRevision((v) => v + 1)}>
          Actualizar agenda
        </Button>
        {platform && canManage && (
          <Button onClick={() => setCreating((v) => !v)}>
            {creating ? "Ocultar formulario" : "Programar o registrar sesión"}
          </Button>
        )}
      </div>
      {creating && (
        <NewSession
          organizationId={organizationId}
          onSaved={() => {
            setCreating(false);
            setRevision((v) => v + 1);
          }}
        />
      )}
      <QuerySection
        key={revision}
        title="Sesiones por organización"
        load={load}
      >
        {(r) => (
          <div className="space-y-3">
            <p>
              {r.total} sesiones · {r.summary.completed} realizadas ·{" "}
              {(r.summary.effectiveSeconds / 60).toFixed(2)} minutos efectivos ·{" "}
              {r.summary.pendingReconciliation} pendientes de conciliación.
            </p>
            <p className="text-xs">
              Corte: {date(r.cutoff)}. Resumen del filtro seleccionado.
            </p>
            {!r.items.length && <p>No hay sesiones para este filtro.</p>}
            {r.items.map((s) => (
              <article
                key={s.id}
                className="rounded-xl border p-3 space-y-1 break-words"
              >
                <h3 className="font-semibold">{s.title}</h3>
                <p>
                  {s.organizationName} · {s.assigneeName} ·{" "}
                  {SESSION_STATE[s.state]}
                </p>
                <p>
                  {date(s.plannedStart)} — {date(s.plannedEnd)}
                </p>
                <p>
                  {SESSION_KIND[s.kind]} ·{" "}
                  {SESSION_ACCOUNTING[s.accountingState]}
                </p>
                <Button variant="outline" onClick={() => setSelected(s.id)}>
                  Ver sesión
                </Button>
              </article>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((v) => v - 1)}
              >
                Sesiones anteriores
              </Button>
              <span>Página {page}</span>
              <Button
                variant="outline"
                disabled={page * 25 >= r.total}
                onClick={() => setPage((v) => v + 1)}
              >
                Sesiones siguientes
              </Button>
            </div>
          </div>
        )}
      </QuerySection>
      {selected && (
        <SessionDetails
          key={selected}
          id={selected}
          platform={platform}
          canManage={canManage}
          onTicket={onTicket}
          onSaved={() => {
            setRevision((v) => v + 1);
            onBalanceChanged?.();
          }}
        />
      )}
    </section>
  );
}
