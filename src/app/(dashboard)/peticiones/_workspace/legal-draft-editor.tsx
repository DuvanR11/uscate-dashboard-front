"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegalRichEditor } from "@/components/dashboard/petitions/LegalRichEditor";
import { PetitionOfficeProfile } from "@/components/dashboard/petitions/office-profile";
import { PetitionEditorPanel } from "../_components/petition-editor-panel";
import { PetitionRejectDialog } from "../_components/petition-reject-dialog";
import { PetitionLawyerCard } from "../_components/petition-lawyer-card";
import { usePetitionsWorkspace } from "../_components/use-petitions-workspace";
import type { PetitionListItem } from "../_components/petition-model";
import type { LegalDetail } from "./legal-model";
import {
  LegalError,
  LegalField,
  legalError,
  selectClass,
  useLegalResource,
} from "./legal-ui";

type Template = { id: string; name: string; body: string };
export function LegalDraftEditor({
  detail,
  canWrite,
  onChange,
  registerSave,
}: {
  detail: LegalDetail;
  canWrite: boolean;
  onChange: () => void;
  registerSave: (save: (() => Promise<void>) | null) => void;
}) {
  const w = usePetitionsWorkspace({ loadList: false, documentOnly: true });
  const id = detail.petition.id;
  const templates = useLegalResource<Template[]>(
    "/petitions/workspace/templates",
  );
  const [template, setTemplate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState("");
  const [snapshotTitle, setSnapshotTitle] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    registerSave(async () => {
      if (
        canWrite &&
        w.formData.id === id &&
        !w.formData.signedAt &&
        w.formData.generatedDraft !== detail.petition.generatedDraft
      )
        await api.patch(`/petitions/${id}`, {
          generatedDraft: w.formData.generatedDraft,
        });
    });
    return () => registerSave(null);
  }, [
    registerSave,
    canWrite,
    id,
    w.formData.id,
    w.formData.signedAt,
    w.formData.generatedDraft,
    detail.petition.generatedDraft,
  ]);
  useEffect(() => {
    let mounted = true;
    api
      .get<PetitionListItem>(`/petitions/${id}`)
      .then((response) => {
        if (mounted) w.handleLoadPetition(response.data);
      })
      .catch((e) => {
        if (mounted) setError(legalError(e));
      });
    return () => {
      mounted = false;
    };
    // The editor owns its unsaved state; loading is tied to the selected record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (
      w.formData.id === id &&
      (w.formData.status !== detail.petition.status ||
        (w.formData.signedAt || null) !== (detail.petition.signedAt || null))
    )
      onChange();
  }, [
    id,
    w.formData.id,
    w.formData.status,
    w.formData.signedAt,
    detail.petition.status,
    detail.petition.signedAt,
    onChange,
  ]);
  async function applyTemplate() {
    if (!template) return;
    setError("");
    setLoading(true);
    try {
      if (w.formData.generatedDraft.trim()) {
        await api.patch(`/petitions/${id}`, {
          generatedDraft: w.formData.generatedDraft,
        });
        await api.post(`/petitions/${id}/case/versions`, {
          note: "Contenido anterior al cambio de plantilla",
        });
      }
      const response = await api.get<Template>(
        `/petitions/workspace/templates/${template}`,
      );
      w.setFormData((previous) => ({
        ...previous,
        generatedDraft: response.data.body,
      }));
    } catch (e) {
      setError(legalError(e));
    } finally {
      setLoading(false);
    }
  }
  async function saveVersion() {
    setError("");
    setLoading(true);
    try {
      await api.patch(`/petitions/${id}`, {
        generatedDraft: w.formData.generatedDraft,
      });
      await api.post(`/petitions/${id}/case/versions`, { note });
      setNote("");
      onChange();
    } catch (e) {
      setError(legalError(e));
    } finally {
      setLoading(false);
    }
  }
  async function version(versionId: string) {
    setError("");
    try {
      const response = await api.get<{ content: string; note: string }>(
        `/petitions/${id}/case/versions/${versionId}`,
      );
      setSnapshot(response.data.content);
      setSnapshotTitle(response.data.note);
    } catch (e) {
      setError(legalError(e));
    }
  }
  async function exportPdf() {
    setLoading(true);
    setError("");
    try {
      if (canWrite && !w.formData.signedAt)
        await api.patch(`/petitions/${id}`, {
          generatedDraft: w.formData.generatedDraft,
        });
      await w.handleExportPDF();
    } catch (e) {
      setError(legalError(e));
    } finally {
      setLoading(false);
    }
  }
  const editor = {
    ...w,
    canWrite: canWrite && w.canWrite,
    canApprove: canWrite && w.canApprove,
    handleExportPDF: exportPdf,
  };
  return (
    <div className="space-y-5">
      {error && <LegalError message={error} />}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <PetitionOfficeProfile canEdit={canWrite} onChange={w.setOffice} />
        <Button
          variant="outline"
          disabled={
            loading || w.isExporting || !w.formData.generatedDraft.trim()
          }
          onClick={() => void exportPdf()}
        >
          {w.isExporting
            ? "Preparando PDF…"
            : w.formData.signedAt
              ? "Descargar documento PDF"
              : "Descargar borrador PDF"}
        </Button>
      </div>
      {canWrite && !detail.petition.signedAt && (
        <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-52 flex-1">
            <LegalField label="Plantilla reutilizable">
              <select
                className={selectClass}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                <option value="">Seleccionar plantilla</option>
                {templates.data?.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </LegalField>
          </div>
          <Button
            variant="outline"
            disabled={!template || loading}
            onClick={() => void applyTemplate()}
          >
            Usar como borrador
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Al cambiar la plantilla se conserva una versión del contenido
            anterior.
          </p>
        </section>
      )}
      {editor.canApprove && w.formData.status === "EN_REVISION" && (
        <LegalField label="Imagen de firma para la aprobación">
          <Input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => w.handleSignatureUpload(e.target.files?.[0])}
          />
        </LegalField>
      )}
      <PetitionEditorPanel w={editor} />
      {editor.canApprove && <PetitionLawyerCard w={editor} />}
      <PetitionRejectDialog w={editor} />
      {!!detail.petition.workspace && (
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Versiones conservadas del documento</h2>
          {canWrite && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-52 flex-1">
                <LegalField label="Qué versión quieres conservar">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1000}
                    placeholder="Descripción del cambio revisado"
                  />
                </LegalField>
              </div>
              <Button
                variant="outline"
                disabled={
                  loading ||
                  note.trim().length < 3 ||
                  !w.formData.generatedDraft.trim()
                }
                onClick={() => void saveVersion()}
              >
                Conservar versión
              </Button>
            </div>
          )}
          <ul className="divide-y">
            {detail.versions.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <span>
                  {item.note} · {item.actorName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void version(item.id)}
                >
                  Consultar versión
                </Button>
              </li>
            ))}
          </ul>
          {snapshot && (
            <div className="rounded-lg border">
              <h3 className="p-4 text-sm font-semibold">{snapshotTitle}</h3>
              <LegalRichEditor
                value={snapshot}
                onChange={() => undefined}
                disabled
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
