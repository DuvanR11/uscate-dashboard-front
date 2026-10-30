"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LegalCase,
  LegalOptions,
  LegalPage,
  LegalTask,
  taskStatuses,
} from "./legal-model";
import {
  LegalEmpty,
  LegalError,
  LegalLoading,
  Pagination,
  legalDate,
  legalError,
  selectClass,
  useLegalResource,
} from "./legal-ui";

type CalendarData = {
  files: Pick<
    LegalCase,
    | "petitionId"
    | "subject"
    | "legalDueAt"
    | "internalDueAt"
    | "supplementationDueAt"
    | "suspendedAt"
  >[];
  tasks: LegalTask[];
  truncated: boolean;
};
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
export function LegalAgenda({
  onOpen,
  canWrite,
}: {
  onOpen: (id: string) => void;
  canWrite: boolean;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(new Date());
  const [view, setView] = useState("month");
  const [selected, setSelected] = useState(today);
  const [showTasks, setShowTasks] = useState(false);
  const [team, setTeam] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const options = useLegalResource<LegalOptions>(
    "/petitions/workspace/options",
  );
  const date = new Date(`${selected || today}T12:00:00Z`);
  const start = new Date(date);
  const end = new Date(date);
  if (view === "month") {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  }
  if (view === "week") {
    const offset = (date.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - offset);
    end.setUTCDate(start.getUTCDate() + 6);
  }
  const calendar = useLegalResource<CalendarData>(
    `/petitions/workspace/calendar?from=${dateKey(start)}&to=${dateKey(end)}`,
  );
  const tasks = useLegalResource<LegalPage<LegalTask>>(
    showTasks
      ? `/petitions/workspace/tasks?page=${page}&team=${team}`
      : undefined,
  );
  const entries: {
    id: string;
    petitionId: string;
    day: string;
    label: string;
    title: string;
  }[] = [];
  for (const file of calendar.data?.files || []) {
    for (const [key, label] of [
      ["legalDueAt", "Término legal"],
      ["internalDueAt", "Fecha interna"],
      ["supplementationDueAt", "Subsanación"],
    ] as const) {
      if (key === "legalDueAt" && file.suspendedAt) continue;
      if (file[key])
        entries.push({
          id: `${file.petitionId}-${key}`,
          petitionId: file.petitionId,
          day: file[key]!.slice(0, 10),
          label,
          title: file.subject,
        });
    }
  }
  for (const task of calendar.data?.tasks || []) {
    if (task.dueAt)
      entries.push({
        id: task.id,
        petitionId: task.petitionId,
        day: task.dueAt.slice(0, 10),
        label: "Tarea",
        title: task.title,
      });
    if (task.reminderAt)
      entries.push({
        id: `${task.id}-reminder`,
        petitionId: task.petitionId,
        day: task.reminderAt.slice(0, 10),
        label: "Recordatorio",
        title: task.title,
      });
  }
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(dateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  async function update(task: LegalTask, status: string) {
    setError("");
    try {
      await api.patch(`/petitions/${task.petitionId}/case/tasks/${task.id}`, {
        status,
      });
      tasks.reload();
      calendar.reload();
    } catch (e) {
      setError(legalError(e));
    }
  }
  return (
    <section className="space-y-5 rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Agenda y actividades</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!showTasks ? "default" : "outline"}
            onClick={() => setShowTasks(false)}
          >
            Calendario jurídico
          </Button>
          <Button
            variant={showTasks ? "default" : "outline"}
            onClick={() => setShowTasks(true)}
          >
            Mis tareas
          </Button>
        </div>
      </div>
      {error && <LegalError message={error} />}
      {showTasks ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Fechas de trabajo y recordatorios internos, separados de los
              términos legales.
            </p>
            {options.data?.canSupervise && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={team}
                  onChange={(e) => {
                    setTeam(e.target.checked);
                    setPage(1);
                  }}
                />
                Ver tareas del equipo
              </label>
            )}
          </div>
          {tasks.error && (
            <LegalError message={tasks.error} retry={tasks.reload} />
          )}
          {tasks.loading ? (
            <LegalLoading />
          ) : !tasks.data?.data.length ? (
            <LegalEmpty>No hay tareas abiertas en esta vista.</LegalEmpty>
          ) : (
            <>
              <ul className="divide-y">
                {tasks.data.data.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <button
                      className="min-w-0 flex-1 text-left hover:text-primary"
                      onClick={() => onOpen(task.petitionId)}
                    >
                      <span className="font-medium">{task.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {task.case?.subject} · {legalDate(task.dueAt)}
                      </span>
                    </button>
                    <select
                      aria-label={`Estado de ${task.title}`}
                      className={`${selectClass} md:w-44`}
                      disabled={!canWrite}
                      value={task.status}
                      onChange={(e) => void update(task, e.target.value)}
                    >
                      {Object.entries(taskStatuses).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
              <Pagination {...tasks.data.meta} page={page} onPage={setPage} />
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              Fecha de referencia
              <Input
                type="date"
                value={selected}
                onChange={(e) => {
                  if (e.target.value) setSelected(e.target.value);
                }}
              />
            </label>
            <label className="grid min-w-36 gap-1 text-sm">
              Vista
              <select
                className={selectClass}
                value={view}
                onChange={(e) => setView(e.target.value)}
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </label>
            <Button variant="outline" onClick={() => setSelected(today)}>
              Hoy
            </Button>
            <p className="text-sm text-muted-foreground">
              {legalDate(dateKey(start))} – {legalDate(dateKey(end))}
            </p>
          </div>
          {calendar.error && (
            <LegalError message={calendar.error} retry={calendar.reload} />
          )}
          {calendar.loading ? (
            <LegalLoading />
          ) : (
            <>
              <div
                className={`grid gap-2 ${view === "day" ? "grid-cols-1" : view === "month" ? "grid-cols-7" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-7"}`}
              >
                {view === "month" &&
                  ["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
                    <span
                      aria-hidden="true"
                      className="text-center text-xs text-muted-foreground"
                      key={`weekday-${index}`}
                    >
                      {label}
                    </span>
                  ))}
                {view === "month" &&
                  Array.from(
                    { length: (start.getUTCDay() + 6) % 7 },
                    (_, index) => <div key={`empty-${index}`} />,
                  )}
                {days.map((day) => (
                  <section
                    key={day}
                    className={`${view === "month" ? "min-h-16 p-1 xl:min-h-32 xl:p-3" : "min-h-32 p-3"} min-w-0 rounded-lg border ${day === today ? "border-primary bg-primary/5" : ""}`}
                  >
                    <h3 className="mb-2 text-xs font-semibold xl:text-sm">
                      <button
                        className="min-h-9 w-full rounded text-left focus-visible:outline-primary"
                        aria-label={`Ver actividades del ${legalDate(day)}`}
                        onClick={() => {
                          setSelected(day);
                          setView("day");
                        }}
                      >
                        {view === "month" ? (
                          <>
                            <span className="xl:hidden">
                              {Number(day.slice(-2))}
                            </span>
                            <span className="hidden xl:inline">
                              {new Date(`${day}T12:00:00Z`).toLocaleDateString(
                                "es-CO",
                                {
                                  weekday: "short",
                                  day: "numeric",
                                  timeZone: "UTC",
                                },
                              )}
                            </span>
                          </>
                        ) : (
                          new Date(`${day}T12:00:00Z`).toLocaleDateString(
                            "es-CO",
                            {
                              weekday: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            },
                          )
                        )}
                      </button>
                    </h3>
                    {view === "month" &&
                      entries.some((entry) => entry.day === day) && (
                        <button
                          className="block w-full rounded bg-primary/10 py-1 text-xs font-semibold text-primary xl:hidden"
                          aria-label={`Ver ${entries.filter((entry) => entry.day === day).length} actividades del ${legalDate(day)}`}
                          onClick={() => {
                            setSelected(day);
                            setView("day");
                          }}
                        >
                          {entries.filter((entry) => entry.day === day).length}
                        </button>
                      )}
                    <ul
                      className={`space-y-2 ${view === "month" ? "hidden xl:block" : ""}`}
                    >
                      {entries
                        .filter((entry) => entry.day === day)
                        .map((entry) => (
                          <li key={entry.id}>
                            <button
                              onClick={() => onOpen(entry.petitionId)}
                              className={`w-full break-words rounded-md p-2 text-left text-xs ${entry.label === "Término legal" ? "bg-amber-50 text-amber-900" : "bg-muted hover:bg-muted/60"}`}
                            >
                              <span className="block font-semibold">
                                {entry.label}
                              </span>
                              <span className="mt-1 block">{entry.title}</span>
                            </button>
                          </li>
                        ))}
                    </ul>
                  </section>
                ))}
              </div>
              {calendar.data?.truncated && (
                <p className="text-sm text-amber-800">
                  Hay más registros en este periodo. Selecciona una vista
                  semanal o diaria para consultar el detalle.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                El calendario distingue términos legales, subsanaciones, fechas
                internas, tareas y recordatorios.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
