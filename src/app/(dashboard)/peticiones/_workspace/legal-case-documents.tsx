"use client";

import { useState } from "react";
import { Download, Eye, History, Upload } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LegalDetail } from "./legal-model";
import { documentCategories } from "./legal-model";
import {
  LegalEmpty,
  LegalError,
  LegalField,
  legalDate,
  legalError,
  selectClass,
} from "./legal-ui";

type FileVersion = {
  id: string;
  versionNumber: number;
  originalFileName: string;
  changeNote?: string;
  createdAt: string;
};
export function LegalCaseDocuments({
  detail,
  canWrite,
  onChange,
  onExtract,
}: {
  detail: LegalDetail;
  canWrite: boolean;
  onChange: () => void;
  onExtract: (id: string) => void;
}) {
  const id = detail.petition.id;
  const [name, setName] = useState("");
  const [file, setFile] = useState<File>();
  const [category, setCategory] = useState("ANNEX");
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [versions, setVersions] = useState<{
    attachmentId: string;
    rows: FileVersion[];
  }>();
  const [readyLink, setReadyLink] = useState("");
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name || file.name);
      form.append("category", category);
      if (note) form.append("changeNote", note);
      await api.post(
        target
          ? `/petitions/${id}/case/documents/${target}/versions`
          : `/petitions/${id}/case/documents`,
        form,
      );
      setName("");
      setFile(undefined);
      setNote("");
      onChange();
    } catch (e) {
      setError(legalError(e));
    } finally {
      setBusy(false);
    }
  }
  async function link(
    attachmentId: string,
    preview = false,
    versionId?: string,
  ) {
    setError("");
    try {
      const result = await api.get<{ url: string }>(
        `/petitions/${id}/case/documents/${attachmentId}/${preview ? "preview" : "download"}`,
        { params: versionId ? { versionId } : undefined },
      );
      setReadyLink(result.data.url);
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(legalError(e));
    }
  }
  async function history(attachmentId: string) {
    setError("");
    try {
      const result = await api.get<FileVersion[]>(
        `/petitions/${id}/case/documents/${attachmentId}/versions`,
      );
      setVersions({ attachmentId, rows: result.data });
    } catch (e) {
      setError(legalError(e));
    }
  }
  return (
    <div className="space-y-5">
      {error && <LegalError message={error} />}
      {readyLink && (
        <p className="text-sm">
          <a
            className="text-primary underline"
            href={readyLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir el archivo solicitado
          </a>
          <span className="text-muted-foreground"> · enlace temporal</span>
        </p>
      )}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Documentos y evidencias</h2>
        {!detail.attachments.length ? (
          <LegalEmpty>
            Incorpora anexos, comprobantes y respuestas para respaldar las
            actuaciones.
          </LegalEmpty>
        ) : (
          <ul className="divide-y">
            {detail.attachments.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">
                    {item.document.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {documentCategories[item.category]} · versión{" "}
                    {item.document.currentVersionNumber} ·{" "}
                    {item.document.currentVersion
                      ? `${Math.ceil(item.document.currentVersion.sizeBytes / 1024)} KB`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void link(item.id)}
                  >
                    <Download className="size-4" />
                    Descargar
                  </Button>
                  {[
                    "application/pdf",
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                  ].includes(item.document.currentVersion?.mimeType || "") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void link(item.id, true)}
                    >
                      <Eye className="size-4" />
                      Ver
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void history(item.id)}
                  >
                    <History className="size-4" />
                    Versiones
                  </Button>
                  {canWrite &&
                    item.document.currentVersion?.mimeType ===
                      "application/pdf" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExtract(item.id)}
                      >
                        Extraer texto
                      </Button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {versions && (
        <section className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 font-semibold">
            Historial de versiones del archivo
          </h3>
          <ul className="divide-y">
            {versions.rows.map((version) => (
              <li
                key={version.id}
                className="flex flex-wrap justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p>
                    Versión {version.versionNumber} · {version.originalFileName}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {legalDate(version.createdAt)} ·{" "}
                    {version.changeNote || "Sin observaciones"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void link(versions.attachmentId, false, version.id)
                  }
                >
                  Descargar versión
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {canWrite && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Upload className="size-4" />
            Incorporar archivo
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <LegalField label="Destino">
              <select
                className={selectClass}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Nuevo documento</option>
                {detail.attachments.map((item) => (
                  <option value={item.id} key={item.id}>
                    Nueva versión de {item.document.name}
                  </option>
                ))}
              </select>
            </LegalField>
            <LegalField label="Clasificación">
              <select
                className={selectClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!!target}
              >
                {Object.entries(documentCategories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </LegalField>
            <LegalField label="Nombre del documento">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={240}
                placeholder="Se usará el nombre del archivo si se deja vacío"
              />
            </LegalField>
            <LegalField label="Archivo · máximo 10 MB">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
            </LegalField>
            {target && (
              <div className="md:col-span-2">
                <LegalField label="Qué cambió en esta versión">
                  <Input
                    value={note}
                    maxLength={1000}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </LegalField>
              </div>
            )}
          </div>
          <Button
            className="mt-4"
            disabled={!file || busy || file.size > 10 * 1024 * 1024}
            onClick={() => void upload()}
          >
            {busy ? "Validando e incorporando…" : "Incorporar al expediente"}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Los archivos se conservan de forma privada y mantienen su historial
            de versiones.
          </p>
        </section>
      )}
    </div>
  );
}
