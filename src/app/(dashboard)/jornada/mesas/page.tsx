"use client";

// Plan hacia la versión estable, Fase 5 (2026-11-10): «Jornada electoral —
// Mesas y E-14». Cada mesa con su testigo y su E-14: los que llegaron con
// alertas quedan «por revisar»; quien administra ve la foto (enlace de 2
// minutos), corrige si hace falta y lo marca revisado. Si un testigo no tiene
// datos, la campaña digita el E-14 que le dictó por teléfono.
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  ContestPicker,
  ElectionDayOff,
  useSelectedContest,
} from "@/components/dashboard/election-day/contest-picker";
import { apiErrorMessage } from "@/lib/api-error";
import {
  electionDayApi,
  number,
  RESULT_FLAG_LABEL,
  RESULT_STATUS_LABEL,
  timeOf,
  type Contest,
  type ResultDetail,
  type ResultPage,
  type ResultRow,
} from "@/lib/api/election-day";

const FILTERS = [
  { value: "ALL", label: "Todas las mesas" },
  { value: "MISSING", label: "Sin E-14" },
  { value: "FLAGGED", label: "Por revisar" },
  { value: "SUBMITTED", label: "Enviadas" },
  { value: "REVIEWED", label: "Revisadas" },
];

function StatusCell({ row }: { row: ResultRow }) {
  const result = row.result;
  if (!result || result.status === "DRAFT")
    return <span className="text-sm text-muted-foreground">Sin E-14</span>;
  const flagged = result.status === "SUBMITTED" && result.flags.length > 0;
  return (
    <div className="space-y-1">
      <Badge
        variant="outline"
        className={
          flagged ? "border-amber-500 text-amber-800 dark:text-amber-300" : ""
        }
      >
        {flagged && <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />}
        {flagged ? "Por revisar" : RESULT_STATUS_LABEL[result.status]}
      </Badge>
      {result.flags.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {result.flags.map((f) => RESULT_FLAG_LABEL[f]).join(" · ")}
        </p>
      )}
    </div>
  );
}

/** Formulario de votos por renglón (revisar o digitar). */
function VotesForm({
  lines,
  totalVoters,
  votes,
  readVotes,
  readTotal,
  onTotal,
  onVote,
}: {
  lines: Contest["lines"];
  totalVoters: string;
  votes: Record<string, string>;
  readVotes?: Record<string, number | null>;
  readTotal?: number | null;
  onTotal: (value: string) => void;
  onVote: (lineId: string, value: string) => void;
}) {
  const sum = lines.reduce((acc, l) => acc + (Number(votes[l.id]) || 0), 0);
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[1fr_6rem_5rem] items-center gap-2 text-xs text-muted-foreground">
        <span>Renglón</span>
        <span className="text-right">Votos</span>
        <span className="text-right">{readVotes ? "Foto (IA)" : ""}</span>
      </div>
      {lines.map((line, index) => {
        const read = readVotes?.[line.id];
        const differs =
          read !== undefined &&
          read !== null &&
          String(read) !== votes[line.id];
        return (
          <div
            key={line.id}
            className="grid grid-cols-[1fr_6rem_5rem] items-center gap-2"
          >
            <Label
              htmlFor={`vote-${index}`}
              className={line.isOwn ? "font-semibold" : "font-normal"}
            >
              {line.label}
            </Label>
            <Input
              id={`vote-${index}`}
              type="number"
              inputMode="numeric"
              min={0}
              value={votes[line.id] ?? ""}
              onChange={(e) => onVote(line.id, e.target.value)}
              className={`h-8 text-right ${differs ? "border-amber-500" : ""}`}
            />
            <span className="text-right text-sm tabular-nums text-muted-foreground">
              {read === undefined ? "" : number(read)}
            </span>
          </div>
        );
      })}
      <div className="grid grid-cols-[1fr_6rem_5rem] items-center gap-2 border-t pt-2">
        <Label htmlFor="vote-total" className="font-semibold">
          Total de votantes de la mesa
        </Label>
        <Input
          id="vote-total"
          type="number"
          inputMode="numeric"
          min={0}
          value={totalVoters}
          onChange={(e) => onTotal(e.target.value)}
          className="h-8 text-right"
        />
        <span className="text-right text-sm tabular-nums text-muted-foreground">
          {readTotal === undefined ? "" : number(readTotal)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Suma de los renglones: {number(sum)}
      </p>
    </div>
  );
}

function toInputs(lines: { lineId: string; votes: number | null }[]) {
  return Object.fromEntries(
    lines.map((l) => [l.lineId, l.votes === null ? "" : String(l.votes)]),
  );
}

function ResultDialog({
  contest,
  row,
  onClose,
  onSaved,
}: {
  contest: Contest;
  row: ResultRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [total, setTotal] = useState("");
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const resultId =
    row?.result && row.result.status !== "DRAFT" ? row.result.id : null;

  useEffect(() => {
    setDetail(null);
    setNote("");
    setTotal("");
    setVotes({});
    if (!resultId) return;
    electionDayApi
      .result(resultId)
      .then((d) => {
        setDetail(d);
        setTotal(d.totalVoters === null ? "" : String(d.totalVoters));
        setVotes(toInputs(d.lines));
        setNote(d.reviewNote ?? "");
      })
      .catch((e) =>
        toast.error("No se pudo abrir el E-14", {
          description: apiErrorMessage(e),
        }),
      );
  }, [resultId]);

  if (!row) return null;
  const lines = contest.lines;
  const allFilled =
    lines.every((l) => votes[l.id] !== undefined && votes[l.id] !== "") &&
    total !== "";

  const openPhoto = async () => {
    if (!resultId) return;
    try {
      const { url } = await electionDayApi.resultPhoto(resultId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("No se pudo abrir la foto", {
        description: apiErrorMessage(e),
      });
    }
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      totalVoters: Number(total),
      lines: lines.map((l) => ({ lineId: l.id, votes: Number(votes[l.id]) })),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    try {
      if (resultId) await electionDayApi.review(resultId, payload);
      else await electionDayApi.staffResult(contest.id, row.id, payload);
      toast.success(resultId ? "E-14 revisado" : "E-14 guardado");
      onSaved();
    } catch (e) {
      toast.error("No se pudo guardar", { description: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const readVotes =
    detail?.readingStatus === "DONE"
      ? Object.fromEntries(detail.lines.map((l) => [l.lineId, l.readVotes]))
      : undefined;

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {row.pollingStation.name} · mesa {row.number}
          </DialogTitle>
          <DialogDescription>
            {resultId
              ? detail
                ? `Enviado ${timeOf(detail.submittedAt)}${detail.witness ? ` por ${detail.witness.user.fullName}` : detail.reportedBy ? ` por ${detail.reportedBy.fullName}` : ""}${detail.reviewedBy ? ` · revisado por ${detail.reviewedBy.fullName}` : ""}`
                : "Cargando…"
              : "Esta mesa no tiene E-14. Digita el que te dictó el testigo."}
          </DialogDescription>
        </DialogHeader>
        {resultId && !detail ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="grid gap-4">
            {detail && detail.flagLabels.length > 0 && (
              <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" aria-hidden /> Alertas
                </p>
                <ul className="ml-6 list-disc">
                  {detail.flagLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </div>
            )}
            {detail?.hasPhoto && (
              <Button variant="outline" className="w-fit" onClick={openPhoto}>
                <ExternalLink className="mr-2 h-4 w-4" /> Ver la foto del E-14
              </Button>
            )}
            {detail?.readingStatus === "PENDING" && (
              <p className="text-xs text-muted-foreground">
                La foto se está leyendo; la comparación aparece en unos minutos.
              </p>
            )}
            {detail?.readingError && (
              <p className="text-xs text-muted-foreground">
                {detail.readingError}
              </p>
            )}
            <VotesForm
              lines={lines}
              totalVoters={total}
              votes={votes}
              readVotes={readVotes}
              readTotal={
                detail?.readingStatus === "DONE"
                  ? detail.readTotalVoters
                  : undefined
              }
              onTotal={setTotal}
              onVote={(lineId, value) =>
                setVotes((v) => ({ ...v, [lineId]: value }))
              }
            />
            <div className="grid gap-1.5">
              <Label htmlFor="review-note">Nota (opcional)</Label>
              <Textarea
                id="review-note"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={save} disabled={!allFilled || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {resultId ? "Marcar revisado" : "Guardar E-14"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ElectionTablesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ElectionTables />
    </Suspense>
  );
}

function ElectionTables() {
  const params = useSearchParams();
  const {
    enabled,
    contests,
    contest: summary,
    select,
    error,
  } = useSelectedContest();
  // `?estado=FLAGGED` llega desde el conteo en vivo («E-14 por revisar»).
  const [status, setStatus] = useState(() => {
    const wanted = params.get("estado");
    return wanted && FILTERS.some((f) => f.value === wanted) ? wanted : "ALL";
  });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<ResultRow | null>(null);

  // Cada dato queda ligado a lo que se pidió: al cambiar de contienda, filtro
  // o página se ve «cargando» y no lo anterior.
  const [loadedContest, setLoadedContest] = useState<Contest | null>(null);
  const contest =
    loadedContest && loadedContest.id === summary?.id ? loadedContest : null;
  const key = `${summary?.id ?? ""}:${status}:${page}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    page: ResultPage;
  } | null>(null);
  const data = loaded?.key === key ? loaded.page : null;

  useEffect(() => {
    if (summary)
      electionDayApi
        .contest(summary.id)
        .then(setLoadedContest)
        .catch(() => setLoadedContest(null));
  }, [summary]);

  const load = useCallback(async () => {
    if (!summary) return;
    const forKey = `${summary.id}:${status}:${page}`;
    await electionDayApi
      .results(summary.id, { ...(status !== "ALL" ? { status } : {}), page })
      .then((value) => setLoaded({ key: forKey, page: value }))
      .catch((e: unknown) =>
        toast.error("No se pudieron cargar las mesas", {
          description: apiErrorMessage(e),
        }),
      );
  }, [summary, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (enabled === false)
    return (
      <div className="p-4 md:p-6">
        <ElectionDayOff />
      </div>
    );

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Mesas y E-14</h1>
        <p className="text-sm text-muted-foreground">
          Revisa los E-14 con alertas contra su foto y digita los que te dicten
          por teléfono.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <ContestPicker
          contests={contests}
          contest={summary}
          onSelect={(id) => {
            select(id);
            setPage(1);
          }}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="result-filter">Mostrar</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="result-filter" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {summary && (
        <Card>
          <CardContent className="space-y-3 overflow-x-auto p-4">
            {data === null ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay mesas con este filtro.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {number(data.total)} mesas
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Puesto</TableHead>
                      <TableHead className="text-right">Mesa</TableHead>
                      <TableHead>Testigo</TableHead>
                      <TableHead>E-14</TableHead>
                      <TableHead className="text-right">Votantes</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.pollingStation.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.number}
                        </TableCell>
                        <TableCell>
                          {row.witness ? (
                            <>
                              <p className="text-sm">{row.witness.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.witness.installedAt
                                  ? `Instalada ${timeOf(row.witness.installedAt)}`
                                  : "Sin instalar"}
                                {row.witness.phone
                                  ? ` · ${row.witness.phone}`
                                  : ""}
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Sin testigo
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusCell row={row} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {number(row.result?.totalVoters)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!contest}
                            onClick={() => setOpen(row)}
                          >
                            {row.result && row.result.status !== "DRAFT"
                              ? "Abrir"
                              : "Digitar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {pages > 1 && (
                  <div className="flex items-center justify-end gap-2 text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span>
                      Página {page} de {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
      {contest && (
        <ResultDialog
          contest={contest}
          row={open}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
