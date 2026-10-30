"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  Library,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  ChartNoAxesCombined,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PetitionOfficeProfile } from "@/components/dashboard/petitions/office-profile";
import { useAuthStore } from "@/store/auth-store";
import { LegalCaseForm } from "./legal-case-form";
import { LegalCaseDetail } from "./legal-case-detail";
import { LegalAgenda } from "./legal-agenda";
import { LegalTemplates } from "./legal-templates";
import { LegalReports } from "./legal-reports";
import {
  LegalDashboard,
  LegalPage,
  LegalPetition,
  priorities,
} from "./legal-model";
import {
  LegalEmpty,
  LegalError,
  LegalLoading,
  Pagination,
  Stage,
  legalDate,
  selectClass,
  useLegalResource,
} from "./legal-ui";

const views = {
  all: "Todos los expedientes",
  urgent: "Próximos a vencer",
  overdue: "Términos vencidos",
  filing: "Por radicar",
  responses: "Respuestas por revisar",
  review: "Documentos en revisión",
  closed: "Cerrados y archivados",
};
export function LegalWorkspace() {
  const user = useAuthStore((state) => state.user);
  const canWrite = !!user?.permissions.some(
    (permission) => permission.module === "PETICIONES" && permission.canWrite,
  );
  const [section, setSection] = useState("today");
  const [selected, setSelected] = useState("");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState("all");
  const [revision, setRevision] = useState(0);
  const dashboard = useLegalResource<LegalDashboard>(
    `/petitions/workspace/dashboard?r=${revision}`,
  );
  useEffect(() => {
    const initialId = new URLSearchParams(window.location.search).get(
      "expediente",
    );
    if (initialId) Promise.resolve().then(() => setSelected(initialId));
  }, []);
  function open(id: string) {
    setSelected(id);
    setCreating(false);
  }
  function back() {
    setSelected("");
    setRevision((n) => n + 1);
  }
  function filter(value: string) {
    setView(value);
    setSection("cases");
  }
  if (selected)
    return (
      <div className="p-3 md:p-6">
        <LegalCaseDetail
          key={selected}
          id={selected}
          canWrite={canWrite}
          onBack={back}
        />
      </div>
    );
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-3 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Scale className="size-4" />
            Derechos de petición
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Tu espacio de trabajo jurídico
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Prioriza tu jornada, prepara documentos y conserva el seguimiento de
            cada expediente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setRevision((n) => n + 1)}>
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
          <PetitionOfficeProfile
            canEdit={canWrite}
            onChange={() => undefined}
          />
          {canWrite && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Crear petición
            </Button>
          )}
        </div>
      </header>
      <nav
        aria-label="Secciones del espacio jurídico"
        className="flex flex-wrap gap-1 rounded-xl border bg-card p-1.5"
      >
        {[
          ["today", "Mi jornada", LayoutDashboard],
          ["cases", "Expedientes", ClipboardList],
          ["calendar", "Agenda y tareas", CalendarDays],
          ["templates", "Plantillas", Library],
          ["reports", "Indicadores", ChartNoAxesCombined],
        ].map(([key, label, Icon]) => {
          const NavIcon = Icon as typeof Scale;
          return (
            <Button
              key={String(key)}
              variant={section === key && !creating ? "default" : "ghost"}
              onClick={() => {
                setCreating(false);
                setSection(String(key));
              }}
              className="gap-2"
            >
              <NavIcon className="size-4" />
              {String(label)}
            </Button>
          );
        })}
      </nav>
      {creating ? (
        <LegalCaseForm onSaved={open} onCancel={() => setCreating(false)} />
      ) : (
        <>
          {section === "today" && (
            <>
              {dashboard.error && (
                <LegalError
                  message={dashboard.error}
                  retry={dashboard.reload}
                />
              )}
              {dashboard.loading && !dashboard.data ? (
                <LegalLoading />
              ) : (
                dashboard.data && (
                  <>
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                      {[
                        ["active", "Peticiones activas", "all"],
                        ["filing", "Por radicar", "filing"],
                        ["dueSoon", "Próximas a vencer", "urgent"],
                        ["overdue", "Vencidas", "overdue"],
                        [
                          "responseReview",
                          "Respuestas por revisar",
                          "responses",
                        ],
                        ["documentReview", "Documentos por aprobar", "review"],
                        ["tasks", "Mis tareas abiertas", "tasks"],
                        ["closed", "Cerradas o archivadas", "closed"],
                      ].map(([key, label, destination]) => (
                        <button
                          key={key}
                          onClick={() =>
                            destination === "tasks"
                              ? setSection("calendar")
                              : filter(destination)
                          }
                          className={`rounded-xl border bg-card p-4 text-left transition hover:border-primary focus-visible:outline-primary ${key === "overdue" && dashboard.data!.counts[key] ? "border-destructive/40" : ""}`}
                        >
                          <p className="text-sm text-muted-foreground">
                            {label}
                          </p>
                          <p
                            className={`mt-2 text-3xl font-semibold tabular-nums ${key === "overdue" && dashboard.data!.counts[key] ? "text-destructive" : ""}`}
                          >
                            {dashboard.data!.counts[key] ?? 0}
                          </p>
                        </button>
                      ))}
                    </div>
                    {!!dashboard.data.counts.legacy && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Hay {dashboard.data.counts.legacy} registros anteriores
                        que conservan sus fechas originales. Abre su expediente
                        para completar la ficha y acreditar la recepción antes
                        de usar el nuevo control de términos.
                      </p>
                    )}
                    <div className="grid gap-5 xl:grid-cols-2">
                      <section className="rounded-xl border bg-card p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="font-semibold">
                            Atención a los términos
                          </h2>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => filter("urgent")}
                          >
                            Ver bandeja
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                        {!dashboard.data.deadlines.length ? (
                          <LegalEmpty>
                            No hay términos activos registrados.
                          </LegalEmpty>
                        ) : (
                          <ul className="divide-y">
                            {dashboard.data.deadlines.map((item) => (
                              <li key={item.petitionId}>
                                <button
                                  onClick={() => open(item.petitionId)}
                                  className="flex w-full items-start justify-between gap-4 py-4 text-left hover:text-primary"
                                >
                                  <span className="min-w-0 break-words text-sm font-medium">
                                    {item.subject}
                                    <span className="mt-1 block text-xs text-muted-foreground">
                                      {priorities[item.priority]} ·{" "}
                                      {item.legalDueAt.slice(0, 10) <
                                      dashboard.data!.today
                                        ? "Vencida"
                                        : "Término legal"}
                                    </span>
                                  </span>
                                  <span className="shrink-0 text-sm">
                                    {legalDate(item.legalDueAt)}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                      <section className="rounded-xl border bg-card p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="font-semibold">
                            Mis próximas actividades
                          </h2>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSection("calendar")}
                          >
                            Abrir agenda
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                        {!dashboard.data.agenda.length ? (
                          <LegalEmpty>
                            No tienes tareas abiertas asignadas.
                          </LegalEmpty>
                        ) : (
                          <ul className="divide-y">
                            {dashboard.data.agenda.map((task) => (
                              <li key={task.id}>
                                <button
                                  onClick={() => open(task.petitionId)}
                                  className="w-full py-4 text-left text-sm hover:text-primary"
                                >
                                  <span className="font-medium">
                                    {task.title}
                                  </span>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {task.case?.subject} ·{" "}
                                    {legalDate(task.dueAt)}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    </div>
                  </>
                )
              )}
            </>
          )}
          {section === "cases" && (
            <LegalCases
              key={revision}
              view={view}
              onView={setView}
              onOpen={open}
            />
          )}
          {section === "calendar" && (
            <LegalAgenda onOpen={open} canWrite={canWrite} />
          )}
          {section === "templates" && <LegalTemplates canWrite={canWrite} />}
          {section === "reports" && (
            <section className="space-y-5 rounded-xl border bg-card p-5">
              <h2 className="text-xl font-semibold">
                Indicadores de la gestión
              </h2>
              <p className="text-sm text-muted-foreground">
                Cifras calculadas por el servidor sobre los expedientes a los
                que tienes acceso.
              </p>
              {dashboard.error && (
                <LegalError
                  message={dashboard.error}
                  retry={dashboard.reload}
                />
              )}
              {dashboard.data ? (
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["total", "Registros totales"],
                    ["active", "Expedientes activos"],
                    ["closed", "Expedientes cerrados"],
                    ["overdue", "Términos vencidos"],
                    ["dueSoon", "Próximos vencimientos"],
                    ["responseReview", "Evaluaciones pendientes"],
                    ["documentReview", "Aprobaciones pendientes"],
                    ["tasks", "Mis tareas abiertas"],
                  ].map(([key, label]) => (
                    <div key={key} className="rounded-lg bg-muted/50 p-4">
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd className="mt-2 text-2xl font-semibold">
                        {dashboard.data!.counts[key] || 0}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <LegalLoading />
              )}
              <LegalReports key={revision} />
              <div className="flex gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-5 shrink-0" />
                <p>
                  La firma del documento no cierra el término del trámite. La
                  recepción, la evaluación y el cierre tienen su propia
                  trazabilidad.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LegalCases({
  view,
  onView,
  onOpen,
}: {
  view: string;
  onView: (value: string) => void;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("updatedAt");
  const [order, setOrder] = useState("desc");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  const params = new URLSearchParams({
    view,
    page: String(page),
    limit: "20",
    q: search,
    mine: String(mine),
    sort,
    order,
  });
  const resource = useLegalResource<LegalPage<LegalPetition>>(
    `/petitions/workspace?${params}`,
  );
  function changeSort(key: string) {
    setSort(key);
    setOrder((old) => (old === "asc" ? "desc" : "asc"));
    setPage(1);
  }
  return (
    <section className="rounded-xl border bg-card p-4 md:p-5">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Buscar expediente por asunto, solicitante, entidad o radicado"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Asunto, solicitante, entidad o radicado"
          />
        </div>
        <select
          aria-label="Bandeja de expedientes"
          className={`${selectClass} md:w-60`}
          value={view}
          onChange={(e) => {
            onView(e.target.value);
            setPage(1);
          }}
        >
          {Object.entries(views).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => {
              setMine(e.target.checked);
              setPage(1);
            }}
          />
          Mis expedientes
        </label>
      </div>
      {resource.error && (
        <LegalError message={resource.error} retry={resource.reload} />
      )}
      {resource.loading ? (
        <LegalLoading />
      ) : !resource.data?.data.length ? (
        <LegalEmpty>
          <FilePlus2 className="mx-auto mb-3 size-6" />
          No hay expedientes que coincidan con estos filtros.
        </LegalEmpty>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="p-3">Expediente</th>
                  <th className="p-3">
                    <button onClick={() => changeSort("petitioner")}>
                      Solicitante ↕
                    </button>
                  </th>
                  <th className="p-3">
                    <button onClick={() => changeSort("radicado")}>
                      Radicado ↕
                    </button>
                  </th>
                  <th className="p-3">Trámite</th>
                  <th className="p-3">Término legal</th>
                  <th className="p-3">
                    <button onClick={() => changeSort("updatedAt")}>
                      Actualización ↕
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {resource.data.data.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="min-w-56 max-w-sm p-3">
                      <button
                        className="text-left font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => onOpen(item.id)}
                      >
                        {item.workspace?.subject || "Completar ficha jurídica"}
                      </button>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.workspace
                          ? priorities[item.workspace.priority]
                          : "Registro anterior"}{" "}
                        ·{" "}
                        {item.petitionDirection === "CREADA"
                          ? "Petición presentada"
                          : "Petición recibida"}
                      </span>
                    </td>
                    <td className="p-3">{item.petitioner}</td>
                    <td className="p-3">{item.radicado || "Sin radicado"}</td>
                    <td className="p-3">
                      <Stage value={item.workspace?.stage} />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {item.workspace?.suspendedAt
                        ? "Suspendido por requerimiento"
                        : item.workspace?.legalDueAt
                          ? legalDate(item.workspace.legalDueAt)
                          : "Sin recepción acreditada"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {legalDate(item.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...resource.data.meta} page={page} onPage={setPage} />
        </>
      )}
    </section>
  );
}
