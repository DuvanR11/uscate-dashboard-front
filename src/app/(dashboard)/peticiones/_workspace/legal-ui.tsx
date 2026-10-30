"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatCalendarDay } from "@/lib/dates";
import { extractErrorMessage } from "../_components/petition-model";
import { stageLabels } from "./legal-model";

export const legalDate = (value?: string | null) =>
  value
    ? formatCalendarDay(value, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sin fecha";
export const legalError = (error: unknown) =>
  extractErrorMessage(error) ||
  (error instanceof Error && error.name === "Error" ? error.message : "") ||
  "No se pudo completar la acción. Inténtalo de nuevo.";
export function useLegalResource<T>(path?: string) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get<T>(path!, { signal: controller.signal });
        if (!controller.signal.aborted) setData(response.data);
      } catch (e) {
        if (!controller.signal.aborted) setError(legalError(e));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [path, revision]);
  return { data, loading, error, reload, setData };
}
export function LegalLoading() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 rounded-xl border bg-card p-10 text-muted-foreground"
    >
      <Loader2 className="size-5 animate-spin" />
      Cargando espacio jurídico…
    </div>
  );
}
export function LegalError({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
    >
      <AlertCircle className="size-5 shrink-0" />
      <span className="flex-1">{message}</span>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          <RefreshCw className="size-4" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
export function LegalEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
export function Stage({ value }: { value?: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${value === "RESPONSE_REVIEW" || value === "SUSPENDED" ? "bg-amber-50 text-amber-800" : value === "CLOSED" || value === "ARCHIVED" ? "bg-emerald-50 text-emerald-800" : "bg-primary/10 text-primary"}`}
    >
      {stageLabels[value || ""] || "Ficha por completar"}
    </span>
  );
}
export function LegalField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && (
        <span className="text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}
export const selectClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60";
export function Pagination({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number;
  lastPage: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
      <span>
        {total} registros · página {page} de {lastPage}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
