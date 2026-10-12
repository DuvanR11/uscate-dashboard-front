"use client";
import { useCallback, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuerySection } from "./query-section";
import { usePlatformCapability } from "./access-context";
import { SessionForm } from "./support-session-form";
import { SupportExtensions } from './support-extensions';
import {
  createReservation,
  reservationAction,
  reservationDetail,
  type SupportReservation,
} from "@/lib/api/support-reservations";
import { type SupportSession } from "@/lib/api/support-sessions";
const names = {
  PENDING: "Pendiente de confirmación del cliente",
  CONFIRMED: "Confirmada por el cliente",
  STARTED: "Atención iniciada",
  SETTLED: "Consumo confirmado",
  RELEASED: "Reserva liberada",
  REVIEW: "Consumo pendiente de revisión",
  EXPIRED: "Reserva vencida sin inicio",
};
const date = (s: string) =>
    new Date(s).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
  time = (seconds: number) =>
    `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
export function ReservationPanel({
  session,
  platform,
  canManage,
  onSaved,
  children,
}: {
  session: SupportSession;
  platform: boolean;
  canManage: boolean;
  onSaved: () => void;
  children: (reservation: SupportReservation | null) => React.ReactNode;
}) {
  const userId = useAuthStore((s) => s.user?.id),
    canPay = usePlatformCapability("PAYMENT_CONFIRM"),
    canBilling = usePlatformCapability("BILLING_READ");
  const [creating, setCreating] = useState(false),
    [action, setAction] = useState<"confirm" | "start" | "release" | null>(
      null,
    );
  const load = useCallback(
    () => reservationDetail(platform, session.id),
    [platform, session.id],
  );
  return (
    <QuerySection title="Reserva y consumo de acompañamiento" load={load}>
      {({ reservation: r, allocations, events, extensions = [] }) => (
        <div className="space-y-3">
          {!r && (
            <p>
              No hay reserva. El registro histórico de esta sesión no descontará
              minutos por sí solo.
            </p>
          )}
          {r && (
            <>
              <p className="font-semibold">{names[r.state]}</p>
              <p>
                Tiempo máximo previsto: {time(r.estimatedSeconds)}. Se
                descontará únicamente el tiempo efectivo autorizado; no hay
                compra automática.
              </p>
              <p className="whitespace-pre-wrap">
                Información previa: {r.notice}
              </p>
              <p>
                {date(r.plannedStart)} — {date(r.plannedEnd)} (Colombia)
              </p>
              {r.confirmedAt && (
                <p>Confirmación del cliente: {date(r.confirmedAt)}</p>
              )}
              {r.startedAt && (
                <p>Inicio registrado por el responsable: {date(r.startedAt)}</p>
              )}
              {r.reviewReason && (
                <p role="status" className="text-amber-700">
                  {r.reviewReason} {r.state === 'REVIEW' ? 'El saldo permanece comprometido hasta revisión y liberación financiera.' : 'La decisión financiera se conserva abajo.'}
                </p>
              )}
              {allocations.map((a) => (
                <p className="break-words" key={a.balanceId}>
                  {
                    (
                      {
                        MONTHLY: "Incluido mensual",
                        PURCHASED: "Comprado",
                        TRIAL: "Sesión inicial de prueba",
                      } as Record<string, string>
                    )[a.sourceType]
                  }{" "}
                  · reservado {time(a.reservedSeconds)} · consumido{" "}
                  {time(a.consumedSeconds)} · vence {date(a.expiresAt)}
                  {["SETTLED", "RELEASED", "EXPIRED"].includes(r.state) &&
                    ` · liberado ${time(a.reservedSeconds - a.consumedSeconds)}`}
                </p>
              ))}
            </>
          )}
          {platform &&
            canManage &&
            session.state === "PLANNED" &&
            ["TRAINING", "PERSONALIZED"].includes(session.kind) &&
            (!r || r.state === "RELEASED") && (
              <Button className="h-auto max-w-full whitespace-normal" variant="outline" onClick={() => setCreating((v) => !v)}>
                {creating ? "Ocultar reserva" : "Proponer reserva de minutos"}
              </Button>
            )}
          {creating && (
            <SessionForm
              label="Reservar e informar al cliente"
              onSaved={onSaved}
              send={(d) => createReservation(session.id, d)}
              build={(d) => ({
                expectedVersion: session.version,
                estimatedSeconds:
                  Number(d.get("minutes")) * 60 + Number(d.get("seconds")),
                notice: String(d.get("notice")).trim(),
                reason: String(d.get("reason")).trim(),
              })}
            >
              <p>
                Reserva antes de comenzar. El cliente debe confirmar desde su
                cuenta. El saldo debe cubrir la sesión y todos sus vencimientos;
                reprograma si cruza una ventana.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  Minutos previstos
                  <Input
                    name="minutes"
                    type="number"
                    min={0}
                    max={1440}
                    step={1}
                    required
                  />
                </label>
                <label>
                  Segundos adicionales
                  <Input
                    name="seconds"
                    type="number"
                    min={0}
                    max={59}
                    step={1}
                    defaultValue={0}
                    required
                  />
                </label>
              </div>
              <label className="block">
                Información previa para el cliente
                <Input name="notice" minLength={10} maxLength={2000} required />
              </label>
              <label className="block">
                Motivo público de la reserva
                <Input name="reason" minLength={10} maxLength={2000} required />
              </label>
            </SessionForm>
          )}
          <div className="flex flex-wrap gap-2">
            {!platform && r?.state === "PENDING" && (
              <Button className="h-auto max-w-full whitespace-normal" onClick={() => setAction("confirm")}>
                Confirmar consumo previsto
              </Button>
            )}
            {platform &&
              canManage &&
              r?.state === "CONFIRMED" &&
              userId === session.assigneeId && (
                <Button className="h-auto max-w-full whitespace-normal" onClick={() => setAction("start")}>
                  Iniciar atención con reserva
                </Button>
              )}
            {r &&
              ((!platform &&
                ["PENDING", "CONFIRMED", "EXPIRED"].includes(r.state)) ||
                (platform &&
                  canManage &&
                  (["PENDING", "CONFIRMED", "EXPIRED"].includes(r.state) ||
                    (["STARTED"].includes(r.state) &&
                      canPay &&
                      canBilling)))) && (
                <Button className="h-auto max-w-full whitespace-normal" variant="outline" onClick={() => setAction("release")}>
                  Liberar reserva sin descuento
                </Button>
              )}
          </div>
          {action && r && (
            <SessionForm
              key={`${r.id}-${r.version}-${action}`}
              label={
                action === "confirm"
                  ? "Confirmar consentimiento"
                  : action === "start"
                    ? "Registrar inicio"
                    : "Confirmar liberación"
              }
              onSaved={onSaved}
              send={(d) => reservationAction(platform, session.id, action, d)}
              build={(d) => ({
                expectedVersion: r.version,
                reason: String(d.get("reason")).trim(),
              })}
            >
              {action === "confirm" && (
                <label className="flex gap-2">
                  <input type="checkbox" required />
                  He leído el tiempo previsto y las fuentes de saldo; autorizo
                  el descuento del tiempo efectivo dentro de esta reserva.
                </label>
              )}
              {action === "start" && (
                <p>
                  El servidor registrará el inicio real. Completar con tiempo
                  autorizado descontará minutos; excesos o cambios de vigencia
                  quedarán en revisión.
                </p>
              )}
              {action === "release" && (
                <p>
                  Libera el tiempo comprometido sin aplicar descuento. Si hay
                  atención iniciada, esta decisión requiere autoridad financiera
                  y conservará el historial.
                </p>
              )}
              <label className="block">
                Motivo visible para el cliente
                <Input name="reason" minLength={10} maxLength={2000} required />
              </label>
            </SessionForm>
          )}
          {r && <SupportExtensions key={`${r.id}-${extensions.length}-${r.state}`} sessionId={session.id} reservation={r} extensions={extensions} platform={platform} canManage={canManage} canFinance={canPay && canBilling} onSaved={onSaved} />}
          {events.length > 0 && (
            <details>
              <summary>
                Historial de reserva ({events.length}, hasta 100)
              </summary>
              {events.map((e) => (
                <p className="break-words" key={e.id}>
                  {date(e.createdAt)} · {e.actorName} ·{" "}
                  {
                    (
                      {
                        CREATED: "Reserva propuesta",
                        CONFIRMED: "Cliente confirmó",
                        STARTED: "Inicio de atención",
                        SETTLED: "Consumo registrado",
                        RELEASED: "Reserva liberada",
                        REVIEW: "Revisión pendiente",
                      } as Record<string, string>
                    )[e.action]
                  }
                  : {e.body}
                </p>
              ))}
            </details>
          )}
          {children(r)}
        </div>
      )}
    </QuerySection>
  );
}
