"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlatformAccess, usePlatformCapability } from "./access-context";
import { QuerySection } from "./query-section";
import { SessionForm, colombiaInstant } from "./support-sessions";
import { searchPlatformOrganizations } from "@/lib/api/platform";
import {
  balanceBoard,
  balanceHistory,
  balanceSources,
  openBalance,
  reconcileBalance,
  BALANCE_SOURCE,
  BALANCE_STATUS,
  type BalanceSource,
} from "@/lib/api/support-balances";
const selectClass = "block w-full min-w-0 max-w-full rounded-md border bg-background p-2";
const date = (s: string) =>
  new Date(s).toLocaleString("es-CO", { timeZone: "America/Bogota" });
const time = (s: number) =>
  `${Math.floor(Math.abs(s) / 60)} min ${Math.abs(s) % 60} s`;
const value = (d: FormData) =>
  Number(d.get("remainingMinutes")) * 60 +
  Number(d.get("remainingSecondsPart"));
function Remaining({
  seconds,
  capacity,
}: {
  seconds?: number;
  capacity?: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label>
        Minutos restantes
        <Input
          name="remainingMinutes"
          type="number"
          min={0}
          max={capacity !== undefined ? Math.floor(capacity / 60) : 33333333}
          step={1}
          required
          defaultValue={
            seconds !== undefined ? Math.floor(seconds / 60) : undefined
          }
        />
      </label>
      <label>
        Segundos adicionales
        <Input
          name="remainingSecondsPart"
          type="number"
          min={0}
          max={59}
          step={1}
          required
          defaultValue={seconds !== undefined ? seconds % 60 : 0}
        />
      </label>
    </div>
  );
}
function Evidence() {
  return (
    <>
      <label className="block">
        Motivo visible para el cliente
        <Input name="reason" minLength={10} maxLength={2000} required />
      </label>
      <label className="block">
        Evidencia visible para el cliente
        <Input name="evidence" minLength={10} maxLength={4000} required />
      </label>
    </>
  );
}
function OpenBalance({
  org,
  principal,
  onSaved,
}: {
  org: string;
  principal: boolean;
  onSaved: () => void;
}) {
  const [trial, setTrial] = useState(false);
  const load = useCallback(() => balanceSources(org), [org]);
  return (
    <div className="space-y-3">
      {principal && (
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={trial}
            onChange={(e) => setTrial(e.target.checked)}
          />
          Conciliar sesión inicial de prueba con ticket de evidencia
        </label>
      )}
      {trial ? (
        <SessionForm
          label="Conciliar saldo inicial de prueba"
          onSaved={onSaved}
          send={(dto) => openBalance(org, dto)}
          build={(d) => ({
            sourceType: "TRIAL",
            sourceId: d.get("sourceId"),
            validFrom: colombiaInstant(String(d.get("validFrom"))),
            remainingSeconds: value(d),
            reason: String(d.get("reason")).trim(),
            evidence: String(d.get("evidence")).trim(),
          })}
        >
          <p>
            Una sola sesión inicial de hasta 30 minutos por organización.
            Conserva los siete días de la prueba inicial; este registro no
            activa ni extiende el acceso.
          </p>
          <label className="block">
            Identificador del ticket de evidencia
            <Input name="sourceId" required />
          </label>
          <label className="block">
            Activación de la prueba (Colombia)
            <Input name="validFrom" type="datetime-local" step={1} required />
          </label>
          <Remaining capacity={1800} />
          <Evidence />
        </SessionForm>
      ) : (
        <QuerySection title="Fuentes comerciales verificadas" load={load}>
          {({ items, issues }) => (
            <div className="space-y-3">
              <p>
                Se muestran hasta 100 contratos y 100 compras vigentes. El saldo
                restante debe conciliarse con evidencia; no se propone el cupo
                completo como disponible.
              </p>
              {issues?.map((i) => (
                <p key={`${i.sourceType}-${i.sourceId}`} role="status">
                  Fuente pendiente de revisión: {i.reason}
                </p>
              ))}
              <PaidOpening
                key={org}
                org={org}
                sources={items.filter((s) => !s.alreadyReconciled)}
                onSaved={onSaved}
              />
            </div>
          )}
        </QuerySection>
      )}
    </div>
  );
}
function PaidOpening({
  org,
  sources,
  onSaved,
}: {
  org: string;
  sources: BalanceSource[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState("");
  const source = sources.find(
    (s) => `${s.sourceType}:${s.sourceId}` === selected,
  );
  if (!sources.length)
    return (
      <p>
        No hay fuentes verificadas pendientes de apertura para el periodo
        actual. Esto no acredita saldo cero de contratos históricos sin
        conciliar.
      </p>
    );
  return (
    <div className="space-y-3">
      <label>
        Contrato aplicado o compra
        <select
          className={selectClass}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Selecciona fuente</option>
          {sources.map((s) => (
            <option
              key={`${s.sourceType}:${s.sourceId}`}
              value={`${s.sourceType}:${s.sourceId}`}
            >
              {BALANCE_SOURCE[s.sourceType]} · capacidad{" "}
              {time(s.capacitySeconds)} · {date(s.validFrom)} —{" "}
              {date(s.expiresAt)}
            </option>
          ))}
        </select>
      </label>
      {source && (
        <SessionForm
          key={selected}
          label="Conciliar saldo de la fuente"
          send={(d) => openBalance(org, d)}
          onSaved={onSaved}
          build={(d) => ({
            sourceType: source.sourceType,
            sourceId: source.sourceId,
            validFrom: source.validFrom,
            remainingSeconds: value(d),
            reason: String(d.get("reason")).trim(),
            evidence: String(d.get("evidence")).trim(),
          })}
        >
          <p>
            Capacidad contratada: {time(source.capacitySeconds)}. Registra el
            saldo restante comprobado; el tiempo ya utilizado no se repone.
          </p>
          <Remaining capacity={source.capacitySeconds} />
          <Evidence />
        </SessionForm>
      )}
    </div>
  );
}
function History({
  platform,
  id,
  canManage,
  principal,
  onSaved,
}: {
  platform: boolean;
  id: string;
  canManage: boolean;
  principal: boolean;
  onSaved: () => void;
}) {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [editing, setEditing] = useState(false);
  const load = useCallback(
    () => balanceHistory(platform, id, page),
    [platform, id, page],
  );
  return (
    <QuerySection
      key={revision}
      title="Movimientos de acompañamiento"
      load={load}
    >
      {({ balance: b, items, total }) => (
        <div className="space-y-3 break-words">
          <p>
            {BALANCE_SOURCE[b.sourceType]} · restante registrado:{" "}
            {time(b.remainingSeconds)} · capacidad: {time(b.capacitySeconds)}
          </p>
          <p>
            Vigencia: {date(b.validFrom)} — {date(b.expiresAt)}
          </p>
          {platform && canManage && (b.sourceType !== "TRIAL" || principal) && (
            <Button variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "Ocultar corrección" : "Corregir saldo con evidencia"}
            </Button>
          )}
          {editing && (
            <SessionForm
              key={`${b.id}-${b.version}`}
              label="Guardar conciliación"
              onSaved={() => {
                setEditing(false);
                setRevision((v) => v + 1);
                onSaved();
              }}
              send={(d) => reconcileBalance(b.id, d)}
              build={(d) => ({
                expectedVersion: b.version,
                remainingSeconds: value(d),
                reason: String(d.get("reason")).trim(),
                evidence: String(d.get("evidence")).trim(),
              })}
            >
              <p>
                Esta corrección no es un consumo de sesión ni autoriza un cargo.
                No modifica la capacidad o el vencimiento de la fuente.
              </p>
              <Remaining
                seconds={b.remainingSeconds}
                capacity={b.capacitySeconds}
              />
              <Evidence />
            </SessionForm>
          )}
          {items.map((m) => (
            <article key={m.id} className="rounded border p-3 space-y-1">
              <p>
                {m.kind === "OPENING"
                  ? "Saldo inicial conciliado"
                  : "Corrección de conciliación"}{" "}
                · {date(m.createdAt)} · {m.actorName}
              </p>
              <p>
                {m.deltaSeconds < 0 ? "−" : "+"}
                {time(m.deltaSeconds)} · {time(m.beforeSeconds)} →{" "}
                {time(m.afterSeconds)}
              </p>
              <p>Motivo: {m.reason}</p>
              <p>Evidencia: {m.evidence}</p>
            </article>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((v) => v - 1)}
            >
              Movimientos anteriores
            </Button>
            <span>Página {page}</span>
            <Button
              variant="outline"
              disabled={page * 25 >= total}
              onClick={() => setPage((v) => v + 1)}
            >
              Movimientos siguientes
            </Button>
          </div>
        </div>
      )}
    </QuerySection>
  );
}
export function SupportBalancesPanel({
  platform,
  organizationId,
}: {
  platform: boolean;
  organizationId?: string;
}) {
  const principal = usePlatformAccess()?.principal ?? false,
    canSupport = usePlatformCapability("SUPPORT_MANAGE"),
    canPay = usePlatformCapability("PAYMENT_CONFIRM"),
    canBilling = usePlatformCapability("BILLING_READ"),
    canOrganizations = usePlatformCapability("ORGANIZATIONS_READ");
  const canManage = platform && canSupport && canPay && canBilling;
  const [chosenOrg, setChosenOrg] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [creating, setCreating] = useState(false),
    [selected, setSelected] = useState("");
  const org = organizationId ?? (platform ? chosenOrg || undefined : undefined);
  const load = useCallback(
      () => balanceBoard(platform, org, page),
      [platform, org, page],
    ),
    organizations = useCallback(
      () =>
        searchPlatformOrganizations(
          new URLSearchParams({ page: "1", pageSize: "100" }),
        ),
      [],
    );
  return (
    <section className="space-y-3" aria-label="Saldos de acompañamiento">
      <h2 className="text-xl font-semibold">
        Saldos y movimientos de acompañamiento
      </h2>
      <p>
        Saldo registrado por fuente y vigencia, con minutos y segundos exactos.
        La reserva y el descuento de sesiones todavía no están habilitados.
      </p>
      {platform && !organizationId && canOrganizations && (
        <QuerySection title="Organización de los saldos" load={organizations}>
          {(r) => (
            <label>
              Organización
              <select
                className={selectClass}
                value={chosenOrg}
                onChange={(e) => {
                  setChosenOrg(e.target.value);
                  setPage(1);
                  setCreating(false);
                  setSelected("");
                }}
              >
                <option value="">Todas las asignadas</option>
                {r.items.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </QuerySection>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setRevision((v) => v + 1)}>
          Actualizar saldos
        </Button>
        {canManage && org && (
          <Button onClick={() => setCreating((v) => !v)}>
            {creating
              ? "Ocultar conciliación"
              : "Conciliar saldo con evidencia"}
          </Button>
        )}
      </div>
      {creating && org && (
        <OpenBalance
          key={`${org}-${revision}`}
          org={org}
          principal={principal}
          onSaved={() => {
            setCreating(false);
            setRevision((v) => v + 1);
          }}
        />
      )}
      <QuerySection key={revision} title="Saldos por fuente" load={load}>
        {(r) => (
          <div className="space-y-3">
            <p>
              Corte: {date(r.cutoff)} · {r.total} fuentes registradas. Orden de
              vencimiento, seguido de fecha de registro e identificador;
              conserva las ventanas por separado.
            </p>
            {!r.items.length && (
              <p>
                No hay saldos conciliados para este ámbito. Los datos ausentes
                no equivalen a saldo disponible cero.
              </p>
            )}
            {r.items.map((b) => (
              <article
                key={b.id}
                className="rounded border p-3 space-y-1 break-words"
              >
                <h3 className="font-semibold">
                  {b.organizationName} · {BALANCE_SOURCE[b.sourceType]}
                </h3>
                <p>{b.status && BALANCE_STATUS[b.status]}</p>
                <p>
                  Restante registrado: {time(b.remainingSeconds)} · capacidad de
                  fuente: {time(b.capacitySeconds)}
                </p>
                <p>
                  {date(b.validFrom)} — {date(b.expiresAt)}
                </p>
                {b.status === "EXPIRED" && (
                  <p>
                    El tiempo vencido conserva su historial y no está
                    disponible.
                  </p>
                )}
                <Button variant="outline" onClick={() => setSelected(b.id)}>
                  Ver movimientos
                </Button>
              </article>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((v) => v - 1)}
              >
                Saldos anteriores
              </Button>
              <span>Página {page}</span>
              <Button
                variant="outline"
                disabled={page * 25 >= r.total}
                onClick={() => setPage((v) => v + 1)}
              >
                Saldos siguientes
              </Button>
            </div>
          </div>
        )}
      </QuerySection>
      {selected && (
        <History
          key={selected}
          platform={platform}
          id={selected}
          canManage={canManage}
          principal={principal}
          onSaved={() => setRevision((v) => v + 1)}
        />
      )}
    </section>
  );
}
