'use client';

import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Mail, Send, Trash2, FileSpreadsheet, Loader2, Eye, Plus, Link as LinkIcon, X,
  Building2, Ticket, CheckCircle, Zap, Cake, ShieldAlert, Users, Clock, AlertTriangle, CalendarClock
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { EmailButton, generateEmailHtml, TemplateType } from "@/components/dashboard/campaigns/emails/EmailTemplate";
import {
  previewEmailBroadcast, sendEmailBroadcast, extractErrorMessage,
  type EmailBroadcastPreview,
} from "@/lib/api/campaigns-email";
import api from "@/lib/api";
import { useBrandingStore } from "@/store/branding-store";

const BUTTON_COLORS = [
  { name: 'Azul Navy', bg: '#1B2541', text: '#FFFFFF' },
  { name: 'Amarillo', bg: '#FFC400', text: '#1B2541' }, 
  { name: 'Verde', bg: '#10B981', text: '#FFFFFF' }, 
  { name: 'Rojo', bg: '#EF4444', text: '#FFFFFF' },
];

export default function EmailBroadcastPage() {
  const [loading, setLoading] = useState(false);
  const [csvName, setCsvName] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const applicationName = useBrandingStore((s) => s.branding?.applicationName);

  const [buttons, setButtons] = useState<EmailButton[]>([]);
  const [btnText, setBtnText] = useState("");
  const [btnUrl, setBtnUrl] = useState("");
  const [btnColor, setBtnColor] = useState(BUTTON_COLORS[0]);

  // Auditoría de Email en Difusiones, Fase 5 (2026-09-03), hallazgo P2-10:
  // "programar envíos" real — el toggle solo agrega el campo `sendAt`, el
  // resto del flujo (preview, confirmación, envío) es idéntico.
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState(""); // valor crudo de <input type="datetime-local">

  // Auditoría de Email en Difusiones, Fase 5, hallazgo P2-14: confirmación
  // real antes de enviar — nada se envía hasta que el usuario confirma en
  // este diálogo, viendo destinatarios reales y cupo real.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [preview, setPreview] = useState<EmailBroadcastPreview | null>(null);
  const [pendingPayload, setPendingPayload] = useState<{
    csvFile: File;
    subject: string;
    htmlContent: string;
    textContent: string;
    sendAt?: string;
  } | null>(null);

  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      subject: "",
      message: "",
      imageUrl: "",
      templateType: "official" as TemplateType,
    }
  });

  const formValues = watch();

  // --- UTILIDAD: HTML A TEXTO PLANO (CRÍTICO PARA ANTI-SPAM) ---
  const extractTextFromHtml = (htmlString: string) => {
    // Usamos el navegador para parsear el HTML y extraer solo texto
    if (typeof window === 'undefined') return htmlString;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlString;
    return tempDiv.textContent || tempDiv.innerText || "";
  };

  const handleAddButton = () => {
    if (buttons.length >= 3) return toast.error("Máximo 3 botones");
    if (!btnText || !btnUrl) return toast.error("Faltan datos del botón");
    
    setButtons([...buttons, { 
        text: btnText, 
        url: btnUrl,
        color: btnColor.bg,
        textColor: btnColor.text
    }]);
    setBtnText("");
    setBtnUrl("");
  };

  // Auditoría de Email en Difusiones, Fase 5 (2026-09-03), hallazgo P2-14:
  // antes un clic acá disparaba el envío real de inmediato — ahora arma el
  // contenido, pide un conteo REAL de destinatarios (tras dedupe real) y
  // cupo real al backend, y abre el diálogo de confirmación. El envío real
  // solo ocurre si el usuario confirma en `handleConfirmSend`.
  const onSubmit = async (data: any) => {
    const csvFile = csvInputRef.current?.files?.[0];
    if (!csvFile) { toast.error("Falta el archivo CSV"); return; }

    if (imageUploading) {
      toast.error("Espera a que termine de subirse la imagen antes de continuar.");
      return;
    }

    // Validación Anti-Spam Básica
    if (!data.message || data.message === '<p></p>') {
        toast.error("El mensaje no puede estar vacío");
        return;
    }
    if (data.subject.length < 10) {
        toast.warning("Recomendación: El asunto es muy corto y podría caer en Spam.");
        // No retornamos, dejamos que el usuario decida si enviar
    }

    if (isScheduled && !scheduledAtLocal) {
      toast.error("Elige una fecha y hora para programar el envío.");
      return;
    }

    setLoading(true);
    try {
      // 1. Generar HTML Final (Diseño)
      const htmlBody = generateEmailHtml({
        content: data.message,
        imageUrl: data.imageUrl,
        subject: data.subject,
        buttons: buttons,
        type: data.templateType,
        senderName: applicationName,
      });

      // 2. Generar Texto Plano (Anti-Spam)
      // Extraemos texto del mensaje + los links de los botones manualmente
      let plainTextBody = extractTextFromHtml(data.message);
      if (buttons.length > 0) {
          plainTextBody += "\n\nEnlaces de interés:\n" + buttons.map(b => `${b.text}: ${b.url}`).join('\n');
      }

      const sendAt = isScheduled && scheduledAtLocal
        ? new Date(scheduledAtLocal).toISOString()
        : undefined;

      // Auditoría de Email en Difusiones, Fase 5 — cuenta destinatarios
      // reales (tras el MISMO dedupe que usará el envío real) + cupo real,
      // SIN encolar ni descontar nada todavía.
      const previewResult = await previewEmailBroadcast(csvFile);

      setPreview(previewResult);
      setPendingPayload({
        csvFile,
        subject: data.subject,
        htmlContent: htmlBody,
        textContent: plainTextBody,
        sendAt,
      });
      setConfirmOpen(true);
    } catch (error) {
      toast.error(extractErrorMessage(error) || "No se pudo preparar la campaña.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSend = async () => {
    if (!pendingPayload) return;
    setConfirmLoading(true);
    try {
      const result = await sendEmailBroadcast(pendingPayload);
      toast.success(result.message || "Campaña enviada correctamente");
      setConfirmOpen(false);
      setPreview(null);
      setPendingPayload(null);
      setIsScheduled(false);
      setScheduledAtLocal("");
      reset(); setButtons([]); setImagePreview(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
      setCsvName(null);
    } catch (error) {
      // Auditoría de Email en Difusiones, Fase 5, hallazgo P2-11: antes
      // siempre mostraba el mismo toast genérico sin importar la causa real
      // (cupo insuficiente, CSV inválido, archivo muy pesado...) — ahora
      // muestra el mensaje REAL que devuelve el backend.
      toast.error(extractErrorMessage(error) || "Error al enviar la campaña.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCsvChange = (e: any) => { const f = e.target.files[0]; if(f) setCsvName(f.name); };

  // Auditoría de Difusiones Email (2026-09-04), hallazgo real: antes esta
  // función solo leía el archivo como base64 (FileReader) y guardaba ESE
  // string en `imageUrl` — el campo que de verdad viaja al backend y queda
  // embebido como `<img src="data:...">` en el HTML del correo real. Muchos
  // clientes de correo (Outlook clásico entre otros) bloquean imágenes
  // base64 embebidas, y de paso infla el peso de cada correo real que se
  // manda a cada destinatario. Ahora sube el archivo real a `/media/upload`
  // (mismo endpoint que ya usan eventos/solicitudes/denuncias) y usa la URL
  // real devuelta — el base64 local se sigue usando SOLO para la vista
  // previa instantánea en el navegador, nunca para el envío real.
  const handleImageChange = async (e: any) => {
      const f = e.target.files[0];
      if (!f) return;

      const r = new FileReader();
      r.onload = (ev) => setImagePreview(ev.target?.result as string);
      r.readAsDataURL(f);

      setImageUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', f);
        const res = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setValue('imageUrl', res.data.url);
      } catch (error) {
        toast.error('No se pudo subir la imagen — el correo se enviará sin ella.');
        setImagePreview(null);
        setValue('imageUrl', '');
      } finally {
        setImageUploading(false);
      }
  };

  const TEMPLATES = [
    { id: 'official', name: 'Oficial', icon: Building2, color: 'bg-primary text-white' },
    { id: 'invite', name: 'Invitación', icon: Ticket, color: 'bg-white border border-secondary text-primary' },
    { id: 'confirm', name: 'Confirmación', icon: CheckCircle, color: 'bg-green-500 text-white' },
    { id: 'flash', name: 'Flash', icon: Zap, color: 'bg-secondary text-black' },
    { id: 'birthday', name: 'Cumpleaños', icon: Cake, color: 'bg-purple-500 text-white' },
  ];

  return (
    <div className="p-6 md:p-12 max-w-[1600px] mx-auto space-y-8 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Editor de Email</h1>
          <p className="text-slate-500 mt-1">Crea campañas dinámicas con formato enriquecido.</p>
        </div>
        
        {/* Badge de Calidad Anti-Spam */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold">
            <CheckCircle className="h-3 w-3" /> Modo Anti-Spam Activo
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* IZQUIERDA: EDITOR (5/12) */}
        <div className="xl:col-span-5 space-y-6">
            <Card className="shadow-xl border-0 ring-1 ring-slate-100">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                        <Send className="h-5 w-5 text-secondary" /> Configuración
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    
                    {/* Plantillas */}
                    <div className="grid grid-cols-5 gap-2">
                        {TEMPLATES.map((t) => (
                            <div key={t.id} onClick={() => setValue('templateType', t.id as TemplateType)}
                                className={`cursor-pointer rounded-lg p-2 flex flex-col items-center gap-1 transition-all border ${formValues.templateType === t.id ? 'border-primary bg-slate-100 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}>
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center ${t.color}`}><t.icon className="h-3.5 w-3.5" /></div>
                                <span className="text-[9px] font-bold text-slate-600">{t.name}</span>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* Editor */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Contenido</Label>
                        <Input {...register("subject")} placeholder="Asunto del correo" className="font-bold mb-2" />
                        
                        {/* Alerta visual si el asunto es malo */}
                        {formValues.subject && formValues.subject.length < 10 && (
                            <p className="text-[10px] text-orange-500 flex items-center gap-1">
                                <ShieldAlert className="h-3 w-3"/> Asunto muy corto, riesgo de Spam.
                            </p>
                        )}

                        <RichTextEditor 
                            value={formValues.message} 
                            onChange={(html) => setValue("message", html)} 
                        />
                        <p className="text-[10px] text-slate-400">
                            Usa <span className="font-mono bg-slate-100 px-1 rounded">{"{{nombre}}"}</span> para variar el contenido y mejorar la entrega.
                        </p>
                    </div>

                    {/* Botones */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase text-slate-500">Botones ({buttons.length}/3)</span>
                        </div>
                        {buttons.length < 3 && (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input placeholder="Texto" value={btnText} onChange={e => setBtnText(e.target.value)} className="h-8 text-xs bg-white" />
                                    <Input placeholder="URL" value={btnUrl} onChange={e => setBtnUrl(e.target.value)} className="h-8 text-xs bg-white" />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="flex gap-1 flex-1">
                                        {BUTTON_COLORS.map(c => (
                                            <div key={c.bg} onClick={() => setBtnColor(c)}
                                                className={`w-6 h-6 rounded-full cursor-pointer border-2 ${btnColor.bg === c.bg ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: c.bg }} title={c.name}
                                            />
                                        ))}
                                    </div>
                                    <Button type="button" size="sm" onClick={handleAddButton} className="h-7 text-xs bg-primary"><Plus className="h-3 w-3 mr-1"/> Agregar</Button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-1">
                            {buttons.map((btn, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: btn.color }}></div>
                                        <span className="font-bold">{btn.text}</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => {setButtons(buttons.filter((_, i) => i !== idx))}} className="h-5 w-5 text-slate-400 hover:text-red-500"><X className="h-3 w-3"/></Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => !imageUploading && imageInputRef.current?.click()} className="h-10 border rounded flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 text-xs text-slate-500">
                            {imageUploading && <Loader2 className="h-3 w-3 animate-spin" />}
                            {imageUploading ? 'Subiendo...' : imagePreview ? 'Cambiar Imagen' : 'Subir Imagen'}
                            <input type="file" ref={imageInputRef} onChange={handleImageChange} className="hidden" accept="image/*" disabled={imageUploading} />
                        </div>
                        <div onClick={() => csvInputRef.current?.click()} className="h-10 border rounded flex items-center justify-center cursor-pointer hover:bg-slate-50 text-xs text-slate-500">
                            {csvName || 'Subir CSV'}
                            <input type="file" ref={csvInputRef} onChange={handleCsvChange} className="hidden" accept=".csv" />
                        </div>
                    </div>

                    {/* Auditoría de Email en Difusiones, Fase 5 (2026-09-03),
                        hallazgo P2-10: "programar envíos" real. */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <CalendarClock className="h-4 w-4 text-slate-400" /> Programar envío
                            </Label>
                            <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
                        </div>
                        {isScheduled && (
                            <Input
                                type="datetime-local"
                                value={scheduledAtLocal}
                                onChange={(e) => setScheduledAtLocal(e.target.value)}
                                min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                                className="bg-white"
                            />
                        )}
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg">
                        {loading ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {isScheduled ? 'Revisar y Programar' : 'Revisar y Enviar'}
                    </Button>

                    </form>
                </CardContent>
            </Card>
        </div>

        {/* DERECHA: PREVIEW (7/12) */}
        <div className="xl:col-span-7 h-full">
            <Card className="bg-slate-100 border-0 h-full flex flex-col min-h-[700px]">
                <CardHeader className="py-3 px-6 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5"><div className="h-3 w-3 rounded-full bg-red-400"></div><div className="h-3 w-3 rounded-full bg-yellow-400"></div><div className="h-3 w-3 rounded-full bg-green-400"></div></div>
                        <div className="ml-4 text-xs text-slate-400 flex-1 text-center font-mono">Vista Previa - {formValues.subject || "Sin Asunto"}</div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden bg-white">
                    <iframe 
                        title="Email Preview"
                        srcDoc={generateEmailHtml({
                            content: formValues.message || "<p style='text-align:center;color:#ccc;margin-top:20px'>Comienza a escribir...</p>",
                            imageUrl: imagePreview || undefined,
                            subject: formValues.subject || "ASUNTO DEL CORREO",
                            buttons: buttons,
                            type: formValues.templateType as TemplateType,
                            senderName: applicationName,
                        })}
                        className="w-full h-full border-0"
                    />
                </CardContent>
            </Card>
        </div>

      </div>

      {/* Auditoría de Email en Difusiones, Fase 5 (2026-09-03), hallazgo
          P2-14: confirmación real antes de un envío irreversible —
          destinatarios reales (tras dedupe) + cupo real, nunca una
          suposición. */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!confirmLoading) setConfirmOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingPayload?.sendAt ? 'Confirmar envío programado' : 'Confirmar envío'}
            </DialogTitle>
            <DialogDescription>
              Revisa los destinatarios reales antes de continuar — esta acción no se puede deshacer una vez enviada.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {preview.totalUnique} destinatario{preview.totalUnique === 1 ? '' : 's'} real{preview.totalUnique === 1 ? '' : 'es'}
                  </p>
                  {preview.duplicatesOrEmpty > 0 && (
                    <p className="text-xs text-slate-500">
                      {preview.duplicatesOrEmpty} fila{preview.duplicatesOrEmpty === 1 ? '' : 's'} del CSV descartada{preview.duplicatesOrEmpty === 1 ? '' : 's'} (duplicada{preview.duplicatesOrEmpty === 1 ? '' : 's'} o sin correo)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <div className="text-sm text-slate-700">
                  Cupo actual: <span className="font-bold">{preview.quota.used}/{preview.quota.limit}</span>
                  {' · '}Quedarán <span className="font-bold">{preview.quota.remainingAfterSend}</span> tras este envío
                </div>
              </div>

              {pendingPayload?.sendAt && (
                <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
                  <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800">
                    Se enviará el <span className="font-bold">{new Date(pendingPayload.sendAt).toLocaleString('es-CO')}</span>
                  </p>
                </div>
              )}

              {!preview.quota.enough && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700 font-medium">
                    Cupo insuficiente para estos {preview.totalUnique} destinatarios — el envío será rechazado.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={confirmLoading} onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={confirmLoading || !preview?.quota.enough}
              onClick={handleConfirmSend}
              className="bg-primary hover:bg-primary/90 text-white gap-2"
            >
              {confirmLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {pendingPayload?.sendAt ? 'Confirmar y Programar' : 'Confirmar y Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}