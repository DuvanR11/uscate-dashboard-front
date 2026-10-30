"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegalRichEditor } from "@/components/dashboard/petitions/LegalRichEditor";
import {
  LegalEmpty,
  LegalError,
  LegalField,
  legalError,
  selectClass,
  useLegalResource,
} from "./legal-ui";

type Template = {
  id: string;
  name: string;
  body: string;
  petitionType: string;
  version: number;
};
export function LegalTemplates({ canWrite }: { canWrite: boolean }) {
  const resource = useLegalResource<Template[]>(
    "/petitions/workspace/templates",
  );
  const [selected, setSelected] = useState<Template>();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("GENERAL");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function open(id: string) {
    setError("");
    setSaved(false);
    try {
      const result = await api.get<Template>(
        `/petitions/workspace/templates/${id}`,
      );
      setSelected(result.data);
      setName(result.data.name);
      setBody(result.data.body);
      setType(result.data.petitionType);
    } catch (e) {
      setError(legalError(e));
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const payload = {
        name,
        body,
        petitionType: type,
        ...(selected ? { version: selected.version } : {}),
      };
      if (selected)
        await api.patch(
          `/petitions/workspace/templates/${selected.id}`,
          payload,
        );
      else {
        const result = await api.post<Template>(
          "/petitions/workspace/templates",
          payload,
        );
        setSelected(result.data);
      }
      setSaved(true);
      resource.reload();
      if (selected) await open(selected.id);
    } catch (e) {
      setError(legalError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-xl border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Plantillas del equipo</h2>
          {canWrite && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelected(undefined);
                setName("");
                setBody("");
                setType("GENERAL");
                setSaved(false);
              }}
            >
              Nueva
            </Button>
          )}
        </div>
        {resource.error && (
          <LegalError message={resource.error} retry={resource.reload} />
        )}
        {!resource.data?.length ? (
          <LegalEmpty>Aún no hay plantillas guardadas.</LegalEmpty>
        ) : (
          <ul className="space-y-2">
            {resource.data.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => void open(item.id)}
                  className={`w-full rounded-lg p-3 text-left text-sm ${selected?.id === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  {item.name}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Versión {item.version}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className="min-w-0 space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">
          {selected ? "Editar plantilla" : "Preparar plantilla reutilizable"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Las plantillas aportan estructura. Revisa los hechos, las solicitudes
          y el fundamento aplicable a cada expediente.
        </p>
        {error && <LegalError message={error} />}
        {saved && (
          <p role="status" className="text-sm text-emerald-700">
            Plantilla guardada.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <LegalField label="Nombre">
            <Input
              value={name}
              disabled={!canWrite}
              onChange={(e) => setName(e.target.value)}
              maxLength={160}
            />
          </LegalField>
          <LegalField label="Modalidad">
            <select
              value={type}
              disabled={!canWrite}
              onChange={(e) => setType(e.target.value)}
              className={selectClass}
            >
              <option value="GENERAL">General</option>
              <option value="INFORMACION">Información o documentos</option>
              <option value="CONSULTA">Consulta</option>
            </select>
          </LegalField>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <LegalRichEditor
            value={body}
            onChange={(value) => {
              setBody(value);
              setSaved(false);
            }}
            disabled={!canWrite}
          />
        </div>
        {canWrite && (
          <Button
            disabled={
              busy ||
              name.trim().length < 3 ||
              body.replace(/<[^>]+>/g, "").trim().length < 10
            }
            onClick={() => void save()}
          >
            {busy ? "Guardando…" : "Guardar plantilla"}
          </Button>
        )}
      </section>
    </div>
  );
}
