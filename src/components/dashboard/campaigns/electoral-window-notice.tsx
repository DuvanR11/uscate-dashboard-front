"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { formatCalendarDay } from "@/lib/dates";
import { getElectoralWindow, type ElectoralWindow } from "@/lib/api/electoral-window";

/**
 * Fase 3 del plan de finanzas (2026-10-30, control 3.7): en una organización
 * de campaña, el editor de difusiones recuerda desde cuándo está permitida la
 * propaganda electoral.
 *
 * Respuesta del abogado (2026-11-08): la ventana cubre SMS, WhatsApp y
 * correo. No se bloquea: fuera de la ventana, quien envía confirma que el
 * mensaje no es propaganda, y el servidor rechaza el envío sin esa marca. El
 * editor que pasa `onNotPropagandaChange` muestra la casilla.
 */
export function ElectoralWindowNotice({
  id = "notPropaganda",
  notPropaganda = false,
  onNotPropagandaChange,
}: {
  id?: string;
  notPropaganda?: boolean;
  onNotPropagandaChange?: (checked: boolean) => void;
} = {}) {
  const [calendar, setCalendar] = useState<ElectoralWindow | null>(null);
  useEffect(() => {
    getElectoralWindow().then(setCalendar).catch(() => setCalendar(null));
  }, []);
  if (!calendar?.applies) return null;
  const asks = Boolean(calendar.requiresNotPropaganda && onNotPropagandaChange);
  if (calendar.phase === "AFTER" && !asks) return null;

  const day = (value: string) => formatCalendarDay(value, { day: "numeric", month: "long", year: "numeric" });
  const title =
    calendar.phase === "BEFORE"
      ? "Todavía no es tiempo de propaganda electoral"
      : calendar.phase === "OPEN"
        ? "Estás dentro del periodo de propaganda electoral"
        : "Ya terminó el periodo de propaganda electoral";
  return (
    <div
      role="note"
      className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-bold">{title}</p>
        <p>
          Elección: {day(calendar.electionDay)}. La propaganda en espacio público se permite desde el{" "}
          {day(calendar.publicSpaceFrom)} y en medios de comunicación desde el {day(calendar.mediaFrom)} ({calendar.source}).
          Cubre los SMS, el WhatsApp y el correo.
        </p>
        {calendar.phase === "BEFORE" && (
          <p>
            Un mensaje que pida el voto antes de esas fechas puede tomarse como propaganda anticipada. Mientras tanto,
            cuenta tu trabajo sin pedir el voto y, si tienes dudas, consúltalo con tu asesor jurídico.
          </p>
        )}
        {asks && (
          <label
            htmlFor={id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-300 bg-white p-3 text-amber-950"
          >
            <input
              type="checkbox"
              id={id}
              checked={notPropaganda}
              onChange={(e) => onNotPropagandaChange?.(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-amber-600"
            />
            <span>
              <span className="font-bold">Confirmo que este mensaje no es propaganda electoral.</span> No pide el voto: es,
              por ejemplo, una convocatoria, un agradecimiento o información de mi trabajo. Sin esta confirmación no se
              envía, y queda en el registro de la difusión.
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
