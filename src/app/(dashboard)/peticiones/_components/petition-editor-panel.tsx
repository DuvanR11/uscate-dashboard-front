// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { CheckCircle, Download, Loader2, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LegalRichEditor } from '@/components/dashboard/petitions/LegalRichEditor';
import { PaginatedPetitionPreview, StatusBadge, AutosaveIndicator } from './petition-widgets';
import type { PetitionsWorkspace } from './use-petitions-workspace';

/** Panel de redacción: editor, vista previa, IA, guardado, firma y exportación. */
export function PetitionEditorPanel({ w }: { w: PetitionsWorkspace }) {
  const {
    editorMode,
    setEditorMode,
    loadingAi,
    isSaving,
    autosaveStatus,
    isExporting,
    formData,
    setFormData,
    setRejectDialogOpen,
    office,
    canApprove,
    isLocked,
    PetitionLetterhead,
    handleSaveToDb,
    handleSubmitForReview,
    handleSignDocument,
    handleExportPDF,
  } = w;
  return (
    <>
      <Card className="flex h-full min-h-[720px] flex-col border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between rounded-t-lg border-b bg-white py-3">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Editor jurídico profesional
              </CardTitle>
              <p className="text-xs text-slate-500">
                {formData.petitionDirection === 'CREADA'
                  ? 'Redacción de derecho de petición'
                  : 'Respuesta institucional a derecho de petición'}
              </p>
            </div>
            <StatusBadge status={formData.status} />
            <AutosaveIndicator status={autosaveStatus} />
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.generatedDraft && (
              <>
                {/* Fase 3 del análisis de punta a punta (2026-10-28, GOB-04):
                una firmada ya no se guarda (el servidor responde 409). */}
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveToDb}
                    disabled={isSaving}
                    className="text-xs"
                  >
                    <Save size={14} className="mr-2" />
                    Guardar
                  </Button>
                )}

                {(formData.status === 'BORRADOR' ||
                  formData.status === 'RECHAZADO') && (
                  <Button
                    size="sm"
                    onClick={handleSubmitForReview}
                    disabled={isSaving || !formData.id}
                    className="bg-yellow-600 text-xs text-white hover:bg-yellow-700"
                  >
                    <Send size={14} className="mr-2" />
                    {formData.status === 'RECHAZADO'
                      ? 'Reenviar a revisión'
                      : 'Enviar a revisión'}
                  </Button>
                )}

                {/* Plan "Cadena de Firma", Fase 3 — solo el
                despacho real (rol ADMIN/SUPER_ADMIN) ve estos dos
                botones; el backend los rechaza igual con un 403
                real si alguien más los alcanza a golpear
                directo, esto es solo para no mostrar una acción
                que va a fallar. */}
                {formData.status === 'EN_REVISION' && canApprove && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={isSaving}
                      className="border-red-200 text-xs text-red-700 hover:bg-red-50"
                    >
                      Rechazar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSignDocument}
                      disabled={isSaving || !formData.signatureImage}
                      className="bg-green-600 text-xs text-white hover:bg-green-700"
                    >
                      <CheckCircle size={14} className="mr-2" />
                      Aprobar y firmar
                    </Button>
                  </>
                )}

                {formData.status === 'EN_REVISION' && !canApprove && (
                  <span className="inline-flex items-center rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-800">
                    Pendiente de aprobación del despacho
                  </span>
                )}

                {formData.status === 'FIRMADO' && (
                  <Button
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="bg-primary text-xs text-white hover:bg-primary/90"
                  >
                    {isExporting ? (
                      <Loader2 size={14} className="mr-2 animate-spin" />
                    ) : (
                      <Download size={14} className="mr-2" />
                    )}
                    Exportar PDF
                  </Button>
                )}
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 bg-slate-100 p-0">
          <div className="flex items-center justify-between border-b bg-white px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={editorMode === 'EDITAR' ? 'default' : 'outline'}
                onClick={() => setEditorMode('EDITAR')}
                className="text-xs"
              >
                Editar
              </Button>

              <Button
                type="button"
                size="sm"
                variant={editorMode === 'VISTA' ? 'default' : 'outline'}
                onClick={() => setEditorMode('VISTA')}
                className="text-xs"
              >
                Vista previa
              </Button>
            </div>

            <div className="text-xs font-medium text-slate-500">
              {formData.generatedDraft.length} caracteres ·{' '}
              {formData.generatedDraft.trim().split(/\s+/).filter(Boolean).length} palabras
            </div>
          </div>

          <div className="relative flex h-full overflow-y-auto bg-slate-100">
            <div className="w-full">
            {editorMode === 'EDITAR' ? (
            <LegalRichEditor
              value={formData.generatedDraft}
              onChange={(html) =>
                setFormData({
                  ...formData,
                  generatedDraft: html,
                })
              }
              disabled={isLocked || loadingAi}
              letterhead={<PetitionLetterhead />}
            />
            ) : (
              <PaginatedPetitionPreview formData={formData} office={office} />
            )}
            </div>

            {/* Mejora de UX del editor (2026-09-03) — antes, generar
            con IA solo mostraba un spinner en el botón; el abogado
            veía el documento (viejo o en blanco) sin ninguna señal
            de que algo estaba pasando sobre ÉL. */}
            {loadingAi && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-[1px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-semibold text-primary">
                  La IA está redactando el documento...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
