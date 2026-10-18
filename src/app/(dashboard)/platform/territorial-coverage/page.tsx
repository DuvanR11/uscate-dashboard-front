"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Building2, Download, RefreshCw, Search } from "lucide-react";
import {
  usePlatformAccess,
  usePlatformCapability,
} from "@/components/platform/access-context";
import { QuerySection } from "@/components/platform/query-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  coverageReportCsv,
  getCommercialCoverage,
  getCommercialOrganizations,
  readinessLabels,
  type CommercialCoverageItem,
  type CommercialCoveragePage,
} from "@/lib/api/territorial-commercial";

const at = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" })
    : "Sin registro";
const statusLabels: Record<string, string> = {
  ACTIVE: "Vigente",
  READ_ONLY: "Solo lectura",
  EXPIRED: "Vencido",
  REVOKED: "Revocado",
  PENDING: "Pendiente",
  UNVERIFIED: "Sin acreditar",
  NONE: "Sin acceso",
  PAID: "Pagado",
  DEMO: "Demo",
  COMPLETED: "Completada",
  RUNNING: "En curso",
  QUEUED: "En cola",
  FAILED: "Fallida",
  CANCELLED: "Cancelada",
};
const availabilityLabels: Record<string, string> = {
  AVAILABLE: "Disponible en el explorador",
  CATALOG_UNAVAILABLE: "Catálogo no disponible",
  SOURCES_PENDING: "Fuentes o lector pendientes",
  GEOGRAPHY_PENDING: "Correspondencia geográfica pendiente",
  PUBLICATION_PENDING: "Publicación pendiente",
  ACCESS_REQUIRED: "Requiere acceso",
};

function Organizations({ code }: { code: string }) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors.at(-1),
    load = useCallback(
      () => getCommercialOrganizations(code, cursor),
      [code, cursor],
    );
  return (
    <QuerySection
      title="Organizaciones vinculadas y acceso verificado"
      load={load}
    >
      {(data) => (
        <>
          <p className="text-sm text-muted-foreground">{data.note}</p>
          {!data.items.length && (
            <p>No hay organizaciones vinculadas a este conjunto.</p>
          )}
          <div className="space-y-3">
            {data.items.map((org) => (
              <article key={org.id} className="rounded-lg border p-3 space-y-2">
                <Link
                  className="font-medium text-primary underline"
                  href={"/platform/organizations/" + encodeURIComponent(org.id)}
                >
                  {org.name}
                </Link>
                <p>
                  <Badge variant="outline">
                    {org.access.mode
                      ? statusLabels[org.access.mode]
                      : "Modalidad sin acreditar"}
                  </Badge>{" "}
                  <Badge
                    variant={
                      org.access.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {statusLabels[org.access.status]}
                  </Badge>
                </p>
                <p className="text-sm">
                  {availabilityLabels[org.availability]}. La consulta de
                  resultados vuelve a comprobar su integridad.
                </p>
                <p className="text-sm">
                  Vigencia acreditada: {at(org.access.startsAt)} →{" "}
                  {at(org.access.endsAt)}
                </p>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={cursors.length === 1}
              onClick={() => setCursors((c) => c.slice(0, -1))}
            >
              Organizaciones anteriores
            </Button>
            <Button
              variant="outline"
              disabled={!data.next}
              onClick={() => {
                if (data.next) setCursors((c) => [...c, data.next!]);
              }}
            >
              Más organizaciones
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Hasta diez organizaciones por página. Verificación:{" "}
            {at(data.checkedAt)}.
          </p>
        </>
      )}
    </QuerySection>
  );
}

function TerritoryCard({ item }: { item: CommercialCoverageItem }) {
  const [expanded, setExpanded] = useState(false),
    m = item.monitoring;
  return (
    <article
      className="min-w-0 rounded-xl border bg-card p-5 space-y-4"
      aria-label={"Cobertura " + item.code}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{item.territory.name}</h3>
          <p className="text-sm text-muted-foreground">
            {item.corporation.name} · {item.election.name}
          </p>
        </div>
        <Badge
          variant={
            item.status === "AVAILABLE_MUNICIPAL" ? "default" : "secondary"
          }
        >
          {readinessLabels[item.status]}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground break-all">
        {item.code} · Territorio {item.territory.code} · Circunscripción{" "}
        {item.constituencyCode}
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">
            Fuentes revisadas / registradas
          </dt>
          <dd className="font-semibold">
            {item.sources.reviewed} / {item.sources.registered}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {item.sources.origin === "LEGACY_BATCH"
              ? "Originales del lote municipal"
              : "Expedientes regionales no retirados"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">
            Publicación para ofrecer
          </dt>
          <dd>
            {item.publication
              ? `Versión ${item.publication.number} · Municipal`
              : "Pendiente"}
          </dd>
          {item.publication && (
            <dd className="text-xs">{at(item.publication.publishedAt)}</dd>
          )}
        </div>
      </dl>
      <section
        className="rounded-lg bg-muted/50 p-3 space-y-2"
        aria-label="Pendientes para habilitar datos"
      >
        <h4 className="font-medium">Qué falta para habilitar los datos</h4>
        {item.blockers.length ? (
          <ul className="list-disc pl-5 text-sm space-y-1">
            {item.blockers.map((b) => (
              <li key={b.code}>{b.message}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">
            Publicación municipal verificada. Cada organización requiere además
            su acceso vigente.
          </p>
        )}
        <Link
          className="text-sm text-primary underline"
          href="/platform/territorial-data"
        >
          Revisar fuentes y publicaciones
        </Link>
      </section>
      <section
        className="space-y-1 text-sm"
        aria-label="Seguimiento de fuentes"
      >
        <h4 className="font-medium">Seguimiento de fuentes</h4>
        <p>
          {m.blockedReason
            ? "Detenido para revisión"
            : !m.workerEnabled
              ? "Ejecutor desactivado"
              : m.enabled
                ? "Programación activa"
                : "Sin programación activa"}{" "}
          · {m.openAlerts} alertas abiertas
        </p>
        <p>
          Responsable: {m.responsible?.name ?? "Sin asignar"}
          {m.responsible?.email && m.responsible.email !== m.responsible.name
            ? ` · ${m.responsible.email}`
            : ""}
        </p>
        <p>
          Última ejecución:{" "}
          {m.lastStatus
            ? (statusLabels[m.lastStatus] ?? m.lastStatus)
            : "Sin registro"}{" "}
          · Terminó: {at(m.lastFinishedAt)}
        </p>
        {m.blockedReason && (
          <p>Revisa el impedimento en el detalle de monitoreo.</p>
        )}
        {m.enabled && m.workerEnabled && <p>Próxima: {at(m.nextRunAt)}</p>}
        <Link
          className="text-primary underline"
          href={
            "/platform/territorial-monitoring?dataset=" +
            encodeURIComponent(item.code)
          }
        >
          Ver configuración y alertas
        </Link>
      </section>
      <Button
        variant="outline"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <Building2 className="mr-2 size-4" />
        {expanded ? "Ocultar organizaciones" : "Ver organizaciones y accesos"}
      </Button>
      {expanded && <Organizations key={item.code} code={item.code} />}
    </article>
  );
}

function Results({ data }: { data: CommercialCoveragePage }) {
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([coverageReportCsv(data)], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download =
      "cobertura-territorial-" +
      new Date().toLocaleDateString("sv-SE", { timeZone: "America/Bogota" }) +
      ".csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Resumen de esta página"
      >
        {Object.entries(readinessLabels).map(([code, label]) => (
          <div className="rounded-lg border p-4" key={code}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">
              {data.items.filter((i) => i.status === code).length}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Resumen de esta página, hasta 20 conjuntos. Calculado:{" "}
          {at(data.checkedAt)}.
        </p>
        <Button
          variant="outline"
          onClick={download}
          disabled={!data.items.length}
        >
          <Download className="mr-2 size-4" />
          Informe de esta página (CSV)
        </Button>
      </div>
      {!data.items.length && (
        <p>
          No hay conjuntos que coincidan con la búsqueda. Puedes prepararlos en
          Fuentes territoriales.
        </p>
      )}
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {data.items.map((item) => (
          <TerritoryCard key={item.code} item={item} />
        ))}
      </div>
      <aside className="rounded-lg bg-muted p-4 text-sm">
        <h3 className="font-semibold mb-2">Cómo interpretar la cobertura</h3>
        <ul className="list-disc pl-5 space-y-1">
          {data.limitations.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </aside>
    </>
  );
}

export default function CommercialCoveragePage() {
  const access = usePlatformAccess(),
    catalog = usePlatformCapability("CATALOG_MANAGE"),
    orgs = usePlatformCapability("ORGANIZATIONS_READ"),
    billing = usePlatformCapability("BILLING_READ");
  const [draft, setDraft] = useState(""),
    [search, setSearch] = useState(""),
    [cursors, setCursors] = useState<(string | undefined)[]>([undefined]),
    [revision, setRevision] = useState(0);
  const cursor = cursors.at(-1),
    load = useCallback(() => {
      void revision;
      return getCommercialCoverage(search, cursor);
    }, [search, cursor, revision]);
  if (
    !access?.enabled ||
    !access.allOrganizations ||
    !catalog ||
    !orgs ||
    !billing
  )
    return (
      <p className="p-6">
        Esta consulta requiere alcance global y permisos de catálogo,
        organizaciones y lectura financiera.
      </p>
    );
  return (
    <main className="min-w-0 space-y-5 p-4 md:p-6 break-words">
      <h1 className="text-2xl font-bold">Cobertura y preparación comercial</h1>
      <p>
        Conoce qué datos puedes ofrecer por territorio, qué falta para
        habilitarlos y qué organizaciones tienen acceso acreditado.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(draft.trim());
          setCursors([undefined]);
          setRevision((n) => n + 1);
        }}
      >
        <label className="flex-1 min-w-48 space-y-1">
          <span className="text-sm">Buscar territorio o conjunto</span>
          <Input
            value={draft}
            maxLength={80}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Neiva, Medellín o código territorial"
          />
        </label>
        <Button type="submit">
          <Search className="mr-2 size-4" />
          Buscar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setRevision((n) => n + 1)}
        >
          <RefreshCw className="mr-2 size-4" />
          Actualizar
        </Button>
      </form>
      <QuerySection
        key={search + ":" + cursor + ":" + revision}
        title="Preparación de los territorios"
        load={load}
      >
        {(data) => (
          <>
            <Results data={data} />
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={cursors.length === 1}
                onClick={() => setCursors((c) => c.slice(0, -1))}
              >
                Página anterior
              </Button>
              <Button
                variant="outline"
                disabled={!data.next}
                onClick={() => {
                  if (data.next) setCursors((c) => [...c, data.next!]);
                }}
              >
                Página siguiente
              </Button>
            </div>
          </>
        )}
      </QuerySection>
    </main>
  );
}
