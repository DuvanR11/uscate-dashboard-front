"use client";
import { useCallback, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api/platform";
import { usePlatformAccess, usePlatformCapability } from "./access-context";
import { QuerySection } from "./query-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const root = "/platform/support/attention";
const date = (s: string) =>
  new Date(s).toLocaleString("es-CO", { timeZone: "America/Bogota" });
type Calendar = { fromYear: number; toYear: number; holidays: string[] };
type Configuration = {
  version: number;
  enabled: boolean;
  technicalUserId: string | null;
  operationsUserId: string | null;
  supportUserId: string | null;
  calendar: Calendar | null;
};
type ConfigResult = {
  config: Configuration | null;
  calendar: Calendar;
  operators: { id: string; email: string; fullName: string }[];
};
type AttentionResult = {
  now: string;
  enabled: boolean;
  total: number;
  alertsTotal: number;
  pageSize: number;
  rows: {
    id: string;
    title: string;
    priority: string;
    assigneeName: string | null;
    nextAction: string;
    firstResponseAt: string | null;
    firstResponseUpcoming: boolean;
    firstResponseBeforeClock: boolean;
    clockPending: boolean;
    calendarError: string | null;
    deadlines: {
      firstDue: string;
      firstResponseLate: boolean;
      updateDue: string | null;
      followUpDue: string | null;
    } | null;
  }[];
  alerts: {
    id: string;
    ticketId: string;
    kind: string;
    state: string;
    version: number;
    dueAt: string;
    recipients: Record<string, string | null>;
    ticket: { title: string };
  }[];
};
const kinds: Record<string, string> = {
  CRITICAL: "Escalamiento crítico a Técnica y Operación",
  FIRST_RESPONSE: "Primera respuesta fuera de objetivo",
  FOLLOW_UP: "Seguimiento vencido",
  UPDATE: "Avance público pendiente",
  UNASSIGNED: "Ticket sin responsable",
};
function Settings({ onSaved }: { onSaved: () => void }) {
  const load = useCallback(() => apiGet<ConfigResult>(root + "/config"), []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <QuerySection title="Configuración de atención" load={load}>
      {({ config, operators, calendar }) => (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const data = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              await apiPost(root + "/config", {
                expectedVersion: config?.version ?? 0,
                enabled: data.get("enabled") === "on",
                fromYear: Number(data.get("fromYear")),
                toYear: Number(data.get("toYear")),
                technicalUserId: String(data.get("technical")) || undefined,
                operationsUserId: String(data.get("operations")) || undefined,
                supportUserId: String(data.get("support")) || undefined,
                reason: String(data.get("reason")).trim(),
              });
              onSaved();
            } catch (e) {
              setError(
                extractErrorMessage(e) ||
                  "No se confirmó el cambio. Recarga para consultar su resultado antes de reintentar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Horario: lunes a viernes, 9:00 a 18:00, Colombia. Se excluyen los
            festivos nacionales y sus traslados al lunes. Sin cierres
            adicionales.
          </p>
          <p>
            Objetivos internos de primera respuesta: crítica 1 hora; alta 4
            horas; normal 9 horas de atención. La resolución depende del
            diagnóstico.
          </p>
          <fieldset disabled={busy} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Primer año
                <Input
                  name="fromYear"
                  type="number"
                  min={2026}
                  max={2094}
                  required
                  defaultValue={config?.calendar?.fromYear ?? calendar.fromYear}
                />
              </label>
              <label>
                Último año
                <Input
                  name="toYear"
                  type="number"
                  min={2026}
                  max={2099}
                  required
                  defaultValue={config?.calendar?.toYear ?? calendar.toYear}
                />
              </label>
            </div>
            {(
              [
                ["technical", "Técnica"],
                ["operations", "Operación"],
                ["support", "Soporte"],
              ] as const
            ).map(([role, label]) => (
              <label className="block" key={role}>
                Responsable de {label}
                <select
                  name={role}
                  defaultValue={config?.[`${role}UserId`] ?? ""}
                  className="block w-full rounded-md border bg-background p-2"
                >
                  <option value="">Sin designar</option>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.fullName} · {o.email}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="flex gap-2">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={config?.enabled ?? false}
              />
              Activar cálculo y escalamiento interno
            </label>
            <label className="block">
              Motivo
              <Input name="reason" required minLength={10} maxLength={1000} />
            </label>
          </fieldset>
          <p className="text-sm">
            La activación requiere los tres responsables con gestión de soporte
            para todas las organizaciones. Las asignaciones de permisos se
            administran por separado.
          </p>
          <p className="text-xs">
            Cada ticket conserva su calendario de inicio. Cambios futuros no
            borran incumplimientos ni reinician relojes existentes. No hay
            cierre automático ni avisos por correo.
          </p>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <Button disabled={busy} type="submit">
            {busy ? "Guardando…" : "Guardar configuración"}
          </Button>
        </form>
      )}
    </QuerySection>
  );
}
function Acknowledge({
  alert,
  onSaved,
}: {
  alert: AttentionResult["alerts"][number];
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const reason = String(
          new FormData(e.currentTarget).get("reason"),
        ).trim();
        setBusy(true);
        setError("");
        try {
          await apiPost(`${root}/escalations/${alert.id}/acknowledge`, {
            expectedVersion: alert.version,
            reason,
          });
          onSaved();
        } catch (e) {
          setError(
            extractErrorMessage(e) || "No se confirmó el reconocimiento.",
          );
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-wrap gap-2"
    >
      <Input
        name="reason"
        required
        minLength={10}
        maxLength={1000}
        placeholder="Acción que asumes para atender la alerta"
        aria-label="Motivo del reconocimiento"
        disabled={busy}
      />
      <Button disabled={busy} type="submit">
        Reconocer alerta
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
export function SupportAttentionPanel({
  organizationId,
  onSelect,
}: {
  organizationId?: string;
  onSelect: (id: string) => void;
}) {
  const access = usePlatformAccess(),
    canManage = usePlatformCapability("SUPPORT_MANAGE");
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [settings, setSettings] = useState(false);
  const load = useCallback(
    () =>
      apiGet<AttentionResult>(
        `${root}?page=${page}&pageSize=25${organizationId ? `&organizationId=${organizationId}` : ""}`,
      ),
    [page, organizationId],
  );
  const refresh = () => setRevision((r) => r + 1);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={refresh}>
          Actualizar tiempos y escalamiento
        </Button>
        {access?.principal && (
          <Button variant="outline" onClick={() => setSettings((v) => !v)}>
            Configurar atención
          </Button>
        )}
      </div>
      {settings && <Settings key={`config-${revision}`} onSaved={refresh} />}
      <QuerySection
        key={`attention-${revision}`}
        title="Tiempos de atención y escalamiento"
        load={load}
      >
        {(result) => (
          <div className="space-y-4">
            {!result.enabled && (
              <p>
                La automatización está desactivada. El principal debe confirmar
                calendario y responsables para activarla.
              </p>
            )}
            <p className="text-sm">
              Corte: {date(result.now)}. Revisión automática cada 5 minutos
              dentro del horario; no representa cobertura 24/7. Reconocer una
              alerta no resuelve el ticket ni detiene sus objetivos.
            </p>
            <ul className="space-y-3">
              {result.rows.map((t) => (
                <li key={t.id} className="rounded-lg border p-3 space-y-2">
                  <button
                    className="text-left text-primary underline"
                    onClick={() => onSelect(t.id)}
                  >
                    {t.title}
                  </button>
                  <p className="text-sm">
                    {t.assigneeName ?? "Sin responsable"} · {t.nextAction}
                  </p>
                  {t.calendarError ? (
                    <p role="alert">
                      El calendario del ticket requiere revisión de cobertura.
                    </p>
                  ) : t.deadlines ? (
                    <>
                      <p className="text-sm">
                        Primera respuesta: {date(t.deadlines.firstDue)} ·{" "}
                        {t.firstResponseAt
                          ? t.firstResponseBeforeClock
                            ? "Respondida antes del inicio del reloj"
                            : t.deadlines.firstResponseLate
                              ? "Respondida fuera de objetivo"
                              : "Respondida en objetivo"
                          : new Date(result.now) >
                              new Date(t.deadlines.firstDue)
                            ? "Vencida"
                            : t.firstResponseUpcoming
                              ? "Próxima a vencer"
                              : "Pendiente"}
                      </p>
                      {t.deadlines.updateDue && (
                        <p className="text-sm">
                          Próximo avance público: {date(t.deadlines.updateDue)}{" "}
                          {new Date(result.now) >
                          new Date(t.deadlines.updateDue)
                            ? "· Vencido"
                            : ""}
                        </p>
                      )}
                      {t.deadlines.followUpDue && (
                        <p className="text-sm">
                          Seguimiento: {date(t.deadlines.followUpDue)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm">
                      Reloj pendiente de configuración o primera revisión
                      automática.
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <h3 className="font-semibold">
              Alertas y escalamientos pendientes ({result.alertsTotal})
            </h3>
            {!result.alerts.length && (
              <p>No hay alertas pendientes en esta página.</p>
            )}
            <ul className="space-y-3">
              {result.alerts.map((a) => (
                <li key={a.id} className="rounded-lg border p-3 space-y-2">
                  <p className="font-medium">{kinds[a.kind] ?? a.kind}</p>
                  <button
                    className="text-primary underline"
                    onClick={() => onSelect(a.ticketId)}
                  >
                    {a.ticket.title}
                  </button>
                  <p className="text-sm">
                    Desde {date(a.dueAt)} ·{" "}
                    {a.state === "ACKNOWLEDGED"
                      ? "Reconocida; condición aún vigente"
                      : "Pendiente de reconocimiento"}
                  </p>
                  <p className="text-xs">
                    Roles registrados:{" "}
                    {Object.keys(a.recipients)
                      .map(
                        (role) =>
                          (
                            ({
                              technical: "Técnica",
                              operations: "Operación",
                              support: "Soporte",
                            }) as Record<string, string>
                          )[role] ?? role,
                      )
                      .join(", ")}
                    .{" "}
                    {Object.values(a.recipients).some((v) => !v) &&
                      "Falta responsable autorizado; revisar configuración."}
                  </p>
                  {canManage && a.state === "OPEN" && (
                    <Acknowledge alert={a} onSaved={refresh} />
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anteriores
              </Button>
              <span>Página {page}</span>
              <Button
                variant="outline"
                disabled={
                  page * result.pageSize >=
                  Math.max(result.total, result.alertsTotal)
                }
                onClick={() => setPage((p) => p + 1)}
              >
                Siguientes
              </Button>
            </div>
          </div>
        )}
      </QuerySection>
    </div>
  );
}
