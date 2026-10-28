// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { Calendar, CheckCircle, FileText, Loader2, Mail, Scale, Send, Sparkles, UploadCloud, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { todayISO } from '@/lib/dates';
import { Field } from './petition-widgets';
import type { PetitionsWorkspace } from './use-petitions-workspace';

/** Ficha de la petición: datos, tipo, plazo, notificación y firma. */
export function PetitionFormCard({ w }: { w: PetitionsWorkspace }) {
  const {
    selectedFile,
    setSelectedFile,
    loadingAi,
    formData,
    setFormData,
    selectedType,
    canGenerate,
    handleSignatureUpload,
    handleAiProcess,
    isLocked,
    hasDeadlineExtension,
  } = w;
  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="rounded-t-lg bg-ink py-3 text-center text-white">
          <CardTitle className="text-xs uppercase tracking-widest">
            Parámetros de ingreso
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          {/* Fase 3 del análisis de punta a punta (2026-10-28, GOB-04): la
          firmada se ve de solo lectura; el servidor ya no deja cambiarla. */}
          {isLocked && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
              <p className="font-bold">Petición firmada</p>
              <p>Su texto, su firma y sus datos ya no se pueden modificar. Puedes verla y exportarla.</p>
            </div>
          )}

          <Field label="Radicado" icon={FileText}>
            <Input
              disabled={isLocked}
              value={formData.radicado}
              onChange={(e) =>
                setFormData({ ...formData, radicado: e.target.value })
              }
              className="h-9 text-xs"
              placeholder="N° Radicado"
            />
          </Field>

          <Field label="Fecha recibo" icon={Calendar}>
            <Input
              type="date"
              max={todayISO()}
              disabled={isLocked || hasDeadlineExtension}
              value={formData.receivedAt}
              onChange={(e) =>
                setFormData({ ...formData, receivedAt: e.target.value })
              }
              className="h-9 text-xs"
            />
            {/* Fase 3 (GOB-05): la prórroga ya se notificó con este plazo. */}
            {hasDeadlineExtension && !isLocked && (
              <p className="mt-1 text-[10px] text-slate-400">
                El plazo ya se prorrogó: la fecha de recibo y el tipo legal no se pueden cambiar.
              </p>
            )}
          </Field>

          <Field label="Nombre peticionario" icon={User}>
            <Input
              disabled={isLocked}
              value={formData.petitioner}
              onChange={(e) =>
                setFormData({ ...formData, petitioner: e.target.value })
              }
              className="h-9 text-xs"
              placeholder="Ej: Juan Pérez"
            />
          </Field>

          {/* Post-plan (2026-09-03) — "notificación real al
          peticionario": si se deja en blanco, simplemente no se le
          avisa al ciudadano cuando se firme — no bloquea nada del
          resto del flujo. */}
          <Field label="Correo del peticionario (opcional)" icon={Mail}>
            <Input
              type="email"
              disabled={isLocked}
              value={formData.petitionerEmail}
              onChange={(e) =>
                setFormData({ ...formData, petitionerEmail: e.target.value })
              }
              className="h-9 text-xs"
              placeholder="ciudadano@correo.com"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Si lo dejas, se le avisará por correo cuando la petición quede firmada.
            </p>
          </Field>

          <Field label="Tipo legal" icon={Scale}>
            <Select
              disabled={isLocked || hasDeadlineExtension}
              value={formData.petitionType}
              onValueChange={(val) =>
                setFormData({ ...formData, petitionType: val })
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INFORMACION">
                  Información / Docs (10 días)
                </SelectItem>
                <SelectItem value="GENERAL">
                  General / Quejas (15 días)
                </SelectItem>
                <SelectItem value="CONSULTA">
                  Consulta de fondo (30 días)
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
            
          <Field label="Tipo de documento" icon={Send}>
          <Select
            disabled={isLocked}
            value={formData.petitionDirection}
            onValueChange={(val) =>
              setFormData({
                ...formData,
                petitionDirection: val as 'CREADA' | 'RESPUESTA',
              })
            }
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RESPUESTA">
                Respuesta a petición recibida
              </SelectItem>
              <SelectItem value="CREADA">
                Derecho de petición creado por la UTL
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
          {selectedType && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
              <b>{selectedType.days}</b>
              <br />
              {selectedType.help}
            </div>
          )}

          {/* Plan "Cadena de Firma", Fase 3 (2026-09-03) — el
          motivo real del rechazo, guardado por el despacho en
          `reject()`. Sin esto, el dato existiría en la base pero
          el abogado nunca lo vería — la ida y vuelta real que
          esta fase construyó quedaría invisible en la práctica. */}
          {formData.status === 'RECHAZADO' && formData.rejectionReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-900">
              <p className="mb-1 font-bold uppercase tracking-wide">
                Rechazado por el despacho
              </p>
              <p>{formData.rejectionReason}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">
              Apuntes o hechos
            </label>
            <Textarea
              rows={5}
              disabled={isLocked}
              value={formData.originalText}
              onChange={(e) =>
                setFormData({ ...formData, originalText: e.target.value })
              }
              placeholder="Describe brevemente qué solicita el ciudadano..."
              className="text-xs"
            />
          </div>

          <div
            className={`rounded-xl border p-4 ${
              formData.signatureImage
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="mb-3 flex items-start gap-2">
              <CheckCircle
                size={18}
                className={
                  formData.signatureImage ? 'text-emerald-600' : 'text-amber-600'
                }
              />

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-700">
                  Firma obligatoria para aprobar
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Adjunta una imagen PNG o JPG de la firma. Sin esta imagen no se podrá usar
                  la acción “Aprobar y firmar”.
                </p>
              </div>
            </div>

            {/* Fase 3 (GOB-04): la firma de una firmada no se cambia. */}
            {!isLocked && (
            <>
            <label
              htmlFor="signature-upload"
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 text-center transition hover:bg-slate-50"
            >
              <UploadCloud size={26} className="mb-2 text-slate-400" />

              <span className="text-xs font-bold uppercase text-slate-600">
                {formData.signatureImage ? 'Cambiar imagen de firma' : 'Adjuntar imagen de firma'}
              </span>

              <span className="mt-1 text-[11px] text-slate-400">
                Formatos permitidos: PNG o JPG
              </span>
            </label>

            <input
              id="signature-upload"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => handleSignatureUpload(e.target.files?.[0])}
              className="hidden"
            />
            </>
            )}

            {formData.signatureImage ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
                <p className="mb-2 text-[11px] font-bold uppercase text-emerald-700">
                  Firma cargada correctamente
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL dinámica (archivo subido, URL firmada o vista previa local): la optimización de next/image no aplica */}
                <img
                  src={formData.signatureImage}
                  alt="Vista previa de firma"
                  className="h-20 object-contain"
                />
              </div>
            ) : (
              <p className="mt-3 text-xs font-semibold text-amber-700">
                Pendiente: adjunta la firma antes de aprobar el documento.
              </p>
            )}
          </div>

          {/* Fase 3 (GOB-04): una firmada no se vuelve a redactar. */}
          {!isLocked && (
          <div className="space-y-3 border-t pt-4">
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center transition-all hover:bg-slate-50">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) =>
                  setSelectedFile(e.target.files?.[0] || null)
                }
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="flex cursor-pointer flex-col items-center"
              >
                <UploadCloud size={28} className="mb-2 text-slate-400" />
                <span className="max-w-full truncate text-[11px] font-bold uppercase text-slate-600">
                  {selectedFile
                    ? selectedFile.name
                    : 'Subir PDF del ciudadano'}
                </span>
              </label>
            </div>

            <Button
              onClick={handleAiProcess}
              disabled={loadingAi || !canGenerate}
              className="h-11 w-full bg-ai text-ai-foreground text-xs font-black uppercase tracking-widest hover:bg-ai/90"
            >
              {loadingAi ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Sparkles size={16} className="mr-2" />
              )}
             {formData.petitionDirection === 'CREADA'
              ? 'Redactar derecho de petición'
              : 'Redactar respuesta'}
            </Button>
          </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
