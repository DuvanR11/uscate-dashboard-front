"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/auth-store";
import { calendarDayISO } from "@/lib/dates";
import type {
  LegalOptions,
  LegalTask,
  LegalPage,
  LegalEvent,
  LegalDetail,
} from "./legal-model";
import { priorities, taskStatuses } from "./legal-model";
import {
  LegalEmpty,
  LegalError,
  LegalField,
  legalDate,
  legalError,
  selectClass,
  useLegalResource,
  Pagination,
} from "./legal-ui";

export function LegalCaseTasks({
  id,
  tasks,
  canWrite,
  onChange,
}: {
  id: string;
  tasks: LegalTask[];
  canWrite: boolean;
  onChange: () => void;
}) {
  const options = useLegalResource<LegalOptions>(
    "/petitions/workspace/options",
  );
  const userId = useAuthStore((state) => state.user?.id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [assignedToId, setAssignedToId] = useState("");
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelTask, setCancelTask] = useState<LegalTask>();
  const [cancelReason, setCancelReason] = useState("");
  const [editingTask, setEditingTask] = useState<LegalTask>();
  function edit(task: LegalTask) {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setDueAt(calendarDayISO(task.dueAt));
    setReminderAt(calendarDayISO(task.reminderAt));
    setAssignedToId(task.assignedToId);
    setPriority(task.priority);
    setParentId(task.parentId || "");
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      const payload = {
        title,
        description,
        priority,
        ...(dueAt ? { dueAt } : editingTask ? { dueAt: null } : {}),
        ...(reminderAt
          ? { reminderAt }
          : editingTask
            ? { reminderAt: null }
            : {}),
        ...(assignedToId ? { assignedToId } : {}),
        ...(parentId && !editingTask ? { parentId } : {}),
      };
      if (editingTask)
        await api.patch(
          `/petitions/${id}/case/tasks/${editingTask.id}`,
          payload,
        );
      else await api.post(`/petitions/${id}/case/tasks`, payload);
      setEditingTask(undefined);
      setTitle("");
      setDescription("");
      onChange();
    } catch (e) {
      setError(legalError(e));
    } finally {
      setBusy(false);
    }
  }
  async function status(
    task: LegalTask,
    value: string,
    resolutionNote?: string,
  ) {
    if (value === "CANCELED" && !resolutionNote) {
      setCancelTask(task);
      setCancelReason("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.patch(`/petitions/${id}/case/tasks/${task.id}`, {
        status: value,
        ...(resolutionNote ? { resolutionNote } : {}),
      });
      setCancelTask(undefined);
      onChange();
    } catch (e) {
      setError(legalError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      {error && <LegalError message={error} />}
      {cancelTask && (
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Cancelar: {cancelTask.title}</h2>
          <LegalField label="Motivo de cancelación">
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={3000}
            />
          </LegalField>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCancelTask(undefined)}>
              Volver
            </Button>
            <Button
              disabled={busy || cancelReason.trim().length < 5}
              onClick={() => void status(cancelTask, "CANCELED", cancelReason)}
            >
              Confirmar cancelación
            </Button>
          </div>
        </section>
      )}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Actividades del expediente</h2>
        {!tasks.length ? (
          <LegalEmpty>
            Organiza aquí el trabajo y las siguientes actuaciones.
          </LegalEmpty>
        ) : (
          <ul className="divide-y">
            {tasks.map((task) => (
              <li
                key={task.id}
                className={`flex flex-wrap items-start justify-between gap-4 py-4 ${task.parentId ? "ml-5 border-l pl-4" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">
                    {task.parentId && (
                      <span className="text-muted-foreground">↳ </span>
                    )}
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {priorities[task.priority]} · {legalDate(task.dueAt)} ·{" "}
                    {options.data?.users.find(
                      (user) => user.id === task.assignedToId,
                    )?.fullName ||
                      (task.assignedToId === userId
                        ? "Asignada a mí"
                        : "Responsable del equipo")}
                  </p>
                  <TaskComments
                    id={id}
                    taskId={task.id}
                    canWrite={canWrite}
                    onChange={onChange}
                  />
                  {canWrite &&
                    (options.data?.canSupervise ||
                      task.createdById === userId ||
                      task.assignedToId === userId) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => edit(task)}
                      >
                        Editar tarea
                      </Button>
                    )}
                </div>
                <select
                  aria-label={`Estado de ${task.title}`}
                  className={`${selectClass} md:w-40`}
                  disabled={
                    busy ||
                    !canWrite ||
                    (!options.data?.canSupervise &&
                      task.assignedToId !== userId &&
                      task.createdById !== userId)
                  }
                  value={task.status}
                  onChange={(e) => void status(task, e.target.value)}
                >
                  {Object.entries(taskStatuses).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
      {canWrite && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">
            {editingTask ? "Editar tarea" : "Agregar tarea o subtarea"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <LegalField label="Actividad">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={240}
                />
              </LegalField>
            </div>
            <LegalField label="Responsable">
              <select
                className={selectClass}
                value={assignedToId}
                disabled={!!editingTask && !options.data?.canSupervise}
                onChange={(e) => setAssignedToId(e.target.value)}
              >
                <option value="">Mi usuario</option>
                {options.data?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </LegalField>
            <LegalField label="Prioridad">
              <select
                className={selectClass}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {Object.entries(priorities).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </LegalField>
            <LegalField label="Fecha interna de entrega">
              <Input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </LegalField>
            <LegalField label="Recordatorio interno">
              <Input
                type="date"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
              />
            </LegalField>
            <LegalField label="Tarea principal">
              <select
                className={selectClass}
                value={parentId}
                disabled={!!editingTask}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">Es una tarea principal</option>
                {tasks
                  .filter(
                    (task) =>
                      !task.parentId &&
                      !["DONE", "CANCELED"].includes(task.status),
                  )
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
              </select>
            </LegalField>
            <div className="md:col-span-2">
              <LegalField label="Instrucciones">
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={10000}
                />
              </LegalField>
            </div>
          </div>
          <Button
            className="mt-4"
            disabled={busy || title.trim().length < 3}
            onClick={() => void create()}
          >
            {busy
              ? "Guardando…"
              : editingTask
                ? "Guardar tarea"
                : "Agregar tarea"}
          </Button>
          {editingTask && (
            <Button
              className="ml-2 mt-4"
              variant="ghost"
              onClick={() => {
                setEditingTask(undefined);
                setTitle("");
                setDescription("");
                setParentId("");
              }}
            >
              Cancelar edición
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

function TaskComments({
  id,
  taskId,
  canWrite,
  onChange,
}: {
  id: string;
  taskId: string;
  canWrite: boolean;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const comments = useLegalResource<LegalPage<LegalEvent>>(
    open
      ? `/petitions/${id}/case/events?taskId=${encodeURIComponent(taskId)}&page=${page}`
      : undefined,
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function comment() {
    setBusy(true);
    setError("");
    try {
      const detail = await api.get<LegalDetail>(`/petitions/${id}/case`);
      await api.post(`/petitions/${id}/case/actions`, {
        kind: "NOTE",
        taskId,
        detail: text,
        version: detail.data.petition.workspace!.version,
        happenedAt: new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Bogota",
        }).format(new Date()),
      });
      setText("");
      comments.reload();
      onChange();
    } catch (e) {
      setError(legalError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3">
      <Button
        size="sm"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Comentarios de la tarea
      </Button>
      {open && (
        <div className="mt-2 space-y-3 rounded-lg border p-3 text-sm">
          {error && <LegalError message={error} />}
          {comments.error && (
            <LegalError message={comments.error} retry={comments.reload} />
          )}
          {comments.loading ? (
            <p>Cargando comentarios…</p>
          ) : comments.data?.data.length ? (
            <ul className="space-y-3">
              {comments.data.data.map((event) => (
                <li key={event.id}>
                  <p className="text-xs text-muted-foreground">
                    {event.actorName} · {legalDate(event.happenedAt)}
                  </p>
                  <p className="whitespace-pre-wrap">{event.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Aún no hay comentarios.</p>
          )}
          {comments.data && (
            <Pagination {...comments.data.meta} onPage={setPage} />
          )}
          {canWrite && (
            <>
              <LegalField label="Comentario sobre la tarea">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={15000}
                />
              </LegalField>
              <Button
                size="sm"
                disabled={busy || text.trim().length < 5}
                onClick={() => void comment()}
              >
                Guardar comentario
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
