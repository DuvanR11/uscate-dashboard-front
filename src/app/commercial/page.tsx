"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { extractErrorMessage } from "@/lib/api/platform";
import {
  commercialContext,
  commercialLeads,
  commercialCommissions,
  createCommercialLead,
  updateCommercialLead,
  leadLabels,
  type CommercialContext,
  type CommercialLead,
  type CommercialCommission,
  type CommercialPage,
  type CommercialLeadInput,
  type LeadStatus,
} from "@/lib/api/commercial-portal";

const selectClass = "w-full rounded-md border bg-background p-2";
const date = (value: string) => new Date(value).toLocaleDateString("es-CO");
function Pager({
  page,
  total,
  size,
  onChange,
}: {
  page: number;
  total: number;
  size: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </Button>
      <span>
        Página {page} · {total} registros
      </span>
      <Button
        variant="outline"
        disabled={page * size >= total}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </Button>
    </div>
  );
}
function LeadCard({
  lead,
  onSaved,
}: {
  lead: CommercialLead;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState(lead.status),
    [notes, setNotes] = useState(lead.notes ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateCommercialLead(lead.id, { status, notes });
      await onSaved();
      setNotice("Seguimiento guardado.");
    } catch (e) {
      setError(extractErrorMessage(e) || "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="min-w-0 space-y-3 rounded-xl border bg-white p-4 break-words">
      <h3 className="font-semibold">{lead.fullName}</h3>
      <p>
        {lead.territory} · {lead.territoryCode}
      </p>
      <p>
        {lead.email}
        {lead.phone ? " · " + lead.phone : ""}
      </p>
      <p className="text-sm text-slate-600">
        Registrada el {date(lead.createdAt)}
      </p>
      <form onSubmit={(e) => void save(e)} className="space-y-3">
        <fieldset disabled={busy} className="space-y-3">
          <label className="block">
            Estado
            <select
              aria-label={"Estado de " + lead.fullName}
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
            >
              {Object.entries(leadLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Notas de seguimiento
            <textarea
              aria-label={"Notas de " + lead.fullName}
              className={selectClass}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <Button type="submit">
            {busy ? "Guardando…" : "Guardar seguimiento"}
          </Button>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </article>
  );
}
export default function CommercialPage() {
  const router = useRouter(),
    user = useAuthStore((s) => s.user),
    hydrated = useAuthStore((s) => s.isHydrated),
    logout = useAuthStore((s) => s.logout);
  const [context, setContext] = useState<CommercialContext | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [leads, setLeads] = useState<CommercialPage<CommercialLead> | null>(
      null,
    ),
    [commissions, setCommissions] =
      useState<CommercialPage<CommercialCommission> | null>(null),
    [leadPage, setLeadPage] = useState(1),
    [commissionPage, setCommissionPage] = useState(1),
    [status, setStatus] = useState("");
  const [pending, setPending] = useState<CommercialLeadInput | null>(null),
    [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role?.code !== "COMMERCIAL_REP") {
      setError("Esta pantalla requiere una cuenta comercial territorial.");
      return;
    }
    let alive = true;
    commercialContext()
      .then((v) => {
        if (alive) setContext(v);
      })
      .catch((e) => {
        if (alive)
          setError(extractErrorMessage(e) || "No se pudo comprobar el acceso.");
      });
    return () => {
      alive = false;
    };
  }, [hydrated, user, router]);
  useEffect(() => {
    if (!context) return;
    let alive = true;
    commercialLeads(leadPage, status)
      .then((v) => {
        if (alive) setLeads(v);
      })
      .catch((e) => {
        if (alive) {
          setLeads(null);
          setError(
            extractErrorMessage(e) ||
              "No se pudieron consultar las oportunidades.",
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [context, leadPage, status]);
  useEffect(() => {
    if (!context) return;
    let alive = true;
    commercialCommissions(commissionPage)
      .then((v) => {
        if (alive) setCommissions(v);
      })
      .catch((e) => {
        if (alive) {
          setCommissions(null);
          setError(
            extractErrorMessage(e) ||
              "No se pudieron consultar las comisiones.",
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [context, commissionPage]);
  const refresh = async () => setLeads(await commercialLeads(leadPage, status));
  async function create(input: CommercialLeadInput) {
    setPending(input);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await createCommercialLead(input);
      setPending(null);
      setGeneration((n) => n + 1);
      setNotice("Oportunidad registrada a tu nombre.");
      setLeads(await commercialLeads(leadPage, status));
    } catch (e) {
      setError(
        extractErrorMessage(e) ||
          "No se confirmó el registro. Reintenta la misma solicitud.",
      );
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (d.get("consent") !== "on") {
      setError("Confirma la autorización de tratamiento.");
      return;
    }
    void create({
      requestKey: crypto.randomUUID(),
      fullName: String(d.get("fullName")).trim(),
      email: String(d.get("email")).trim(),
      phone: String(d.get("phone")).trim(),
      territoryCode: String(d.get("territoryCode")),
      notes: String(d.get("notes")).trim(),
      dataTreatmentConfirmed: true,
    });
  }
  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    if (d.get("next") !== d.get("repeat")) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/change-password", {
        currentPassword: String(d.get("current")),
        newPassword: String(d.get("next")),
      });
      logout();
    } catch (e) {
      setError(extractErrorMessage(e) || "No se pudo cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-2xl font-bold tracking-wide">Zyron</p>
            <p>Portal comercial</p>
          </div>
          <div className="min-w-0 break-words">
            <p>{user?.fullName}</p>
            <Button
              variant="outline"
              className="mt-2 bg-white text-slate-900"
              onClick={logout}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
        <h1 className="text-3xl font-bold">Mi gestión comercial</h1>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 break-words text-red-800"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg border bg-green-50 p-4">
            {notice}
          </p>
        )}
        {!context && !error && <p role="status">Comprobando tu acceso…</p>}
        {context && (
          <>
            <section
              className="rounded-xl bg-blue-950 p-6 text-white"
              aria-label="Cobertura comercial"
            >
              <h2 className="text-xl font-semibold">
                Tu zona: {context.department.name}
              </h2>
              <p className="mt-2">
                Gestiona tus oportunidades y consulta las comisiones de tus
                ventas en este departamento y sus municipios.
              </p>
              <p className="mt-2 text-sm">
                {context.territories.length - 1} municipios en el catálogo ·{" "}
                {context.email}
              </p>
            </section>
            <section
              className="rounded-xl border bg-white p-5"
              aria-label="Nueva oportunidad"
            >
              <h2 className="text-xl font-semibold">Registrar oportunidad</h2>
              <p className="mb-4 text-sm text-slate-600">
                Registra al interesado en contratar Zyron y la autorización que
                te dio para contactarlo.
              </p>
              <form key={generation} onSubmit={submit}>
                <fieldset
                  disabled={busy || Boolean(pending)}
                  className="grid min-w-0 gap-4 sm:grid-cols-2"
                >
                  <label>
                    Nombre del interesado
                    <Input
                      name="fullName"
                      autoComplete="name"
                      required
                      minLength={3}
                      maxLength={120}
                    />
                  </label>
                  <label>
                    Correo electrónico
                    <Input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={160}
                    />
                  </label>
                  <label>
                    Teléfono (opcional)
                    <Input name="phone" autoComplete="tel" maxLength={30} />
                  </label>
                  <label>
                    Territorio
                    <select
                      name="territoryCode"
                      className={selectClass}
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecciona el territorio
                      </option>
                      {context.territories.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name} · {t.code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sm:col-span-2">
                    Notas (opcional)
                    <textarea
                      name="notes"
                      className={selectClass}
                      maxLength={2000}
                    />
                  </label>
                  <label className="flex items-start gap-2 sm:col-span-2">
                    <input type="checkbox" name="consent" required />
                    <span>
                      Confirmo que el interesado autorizó el contacto comercial
                      y el tratamiento de sus datos para este fin.
                    </span>
                  </label>
                  <Button type="submit" className="sm:col-span-2">
                    {busy ? "Registrando…" : "Registrar oportunidad"}
                  </Button>
                </fieldset>
              </form>
              {pending && (
                <Button
                  className="mt-4"
                  disabled={busy}
                  onClick={() => void create(pending)}
                >
                  Reintentar el mismo registro
                </Button>
              )}
            </section>
            <section className="space-y-4" aria-label="Mis oportunidades">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Mis oportunidades</h2>
                <label>
                  Filtrar por estado
                  <select
                    className={selectClass}
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setLeadPage(1);
                      setLeads(null);
                    }}
                  >
                    <option value="">Todos</option>
                    {Object.entries(leadLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-sm text-slate-600">
                Marcar una oportunidad como ganada registra su seguimiento. La
                activación del plan y los pagos los confirma la plataforma.
              </p>
              {leads ? (
                leads.items.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {leads.items.map((lead) => (
                      <LeadCard
                        key={lead.id + lead.updatedAt}
                        lead={lead}
                        onSaved={refresh}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border bg-white p-5">
                    Aún no tienes oportunidades en este filtro. Registra la
                    primera o pide al operador que te asigne una con territorio
                    confirmado.
                  </p>
                )
              ) : (
                <p>Cargando oportunidades…</p>
              )}
              {leads && (
                <Pager
                  page={leads.page}
                  total={leads.total}
                  size={leads.pageSize}
                  onChange={(p) => {
                    setLeads(null);
                    setLeadPage(p);
                  }}
                />
              )}
            </section>
            <section className="space-y-4" aria-label="Mis comisiones">
              <h2 className="text-xl font-semibold">Mis comisiones</h2>
              <p className="text-sm text-slate-600">
                Consulta los importes y vencimientos de tus ventas registradas
                en la zona. Finanzas registra la liquidación y los pagos.
              </p>
              {commissions ? (
                commissions.items.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {commissions.items.map((c) => (
                      <article
                        key={c.id}
                        className="min-w-0 space-y-2 rounded-xl border bg-white p-4"
                      >
                        <h3 className="font-semibold">
                          Venta del {date(c.payment.paidAt)} ·{" "}
                          {c.payment.territoryCode}
                        </h3>
                        <p>
                          Comisión:{" "}
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: c.payment.currency,
                          }).format(Number(c.totalAmount))}{" "}
                          · {Number(c.ratePercent)} %
                        </p>
                        <p>
                          {c.status === "ACTIVE"
                            ? "Activa"
                            : c.status === "CANCELLED"
                              ? "Cancelada"
                              : c.status}
                        </p>
                        <ul className="space-y-2">
                          {c.installments.map((i) => (
                            <li key={i.sequence}>
                              Cuota {i.sequence}:{" "}
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: c.payment.currency,
                              }).format(Number(i.amount))}{" "}
                              ·{" "}
                              {(
                                {
                                  PENDING: "Pendiente",
                                  PAYABLE: "Por pagar",
                                  PAID: "Pagada",
                                  CANCELLED: "Cancelada",
                                } as Record<string, string>
                              )[i.status] ?? i.status}{" "}
                              · Vence {date(i.dueDate)}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border bg-white p-5">
                    Aún no hay comisiones de tus ventas en esta zona.
                  </p>
                )
              ) : (
                <p>Cargando comisiones…</p>
              )}
              {commissions && (
                <Pager
                  page={commissions.page}
                  total={commissions.total}
                  size={commissions.pageSize}
                  onChange={(p) => {
                    setCommissions(null);
                    setCommissionPage(p);
                  }}
                />
              )}
            </section>
            <details className="rounded-xl border bg-white p-5">
              <summary className="cursor-pointer font-semibold">
                Cambiar mi contraseña
              </summary>
              <form
                onSubmit={(e) => void changePassword(e)}
                className="mt-4 grid max-w-lg gap-3"
              >
                <label>
                  Contraseña actual
                  <Input
                    name="current"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label>
                  Nueva contraseña
                  <Input
                    name="next"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                  />
                </label>
                <label>
                  Repetir nueva contraseña
                  <Input
                    name="repeat"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                  />
                </label>
                <p className="text-sm">
                  Incluye letras y números. Al guardar tendrás que iniciar
                  sesión de nuevo.
                </p>
                <Button type="submit" disabled={busy}>
                  Cambiar contraseña
                </Button>
              </form>
            </details>
            <Link
              className="inline-block text-blue-800 underline"
              href="/planes"
            >
              Consultar planes públicos
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
