"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { formatCalendarDay } from "@/lib/dates";
import { getElectoralWindow, type ElectoralWindow } from "@/lib/api/electoral-window";

/**
 * Fase 3 del plan de finanzas (2026-10-30, control 3.7): en una organización
 * de campaña, el editor de difusiones recuerda desde cuándo está permitida la
 * propaganda electoral. Solo avisa: no bloquea el envío.
 */
export function ElectoralWindowNotice() {
  const [calendar, setCalendar] = useState<ElectoralWindow | null>(null);
  useEffect(() => {
    getElectoralWindow().then(setCalendar).catch(() => setCalendar(null));
  }, []);
  if (!calendar?.applies || calendar.phase === "AFTER") return null;

  const day = (value: string) => formatCalendarDay(value, { day: "numeric", month: "long", year: "numeric" });
  return (
    <div
      role="note"
      className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-bold">
          {calendar.phase === "BEFORE"
            ? "Todavía no es tiempo de propaganda electoral"
            : "Estás dentro del periodo de propaganda electoral"}
        </p>
        <p>
          Elección: {day(calendar.electionDay)}. La propaganda en espacio público se permite desde el{" "}
          {day(calendar.publicSpaceFrom)} y en medios de comunicación desde el {day(calendar.mediaFrom)} ({calendar.source}).
        </p>
        {calendar.phase === "BEFORE" && (
          <p>
            Un mensaje que pida el voto antes de esas fechas puede tomarse como propaganda anticipada. Mientras tanto,
            cuenta tu trabajo sin pedir el voto y, si tienes dudas, consúltalo con tu asesor jurídico.
          </p>
        )}
      </div>
    </div>
  );
}
