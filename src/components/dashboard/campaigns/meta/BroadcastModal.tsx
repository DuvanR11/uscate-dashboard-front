"use client";

import React, { useState } from "react";
import { UploadCloud, FileText, Send, CheckCircle2, XCircle, Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// UI Components
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } })
      .response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}

// Auditoría de WhatsApp en Difusiones, Fase 1 (2026-09-05): este modal
// estaba roto de punta a punta — apuntaba a `NEXT_PUBLIC_WHATSAPP_URL_META`
// (variable inexistente en cualquier `.env` del repo, así que el POST real
// se disparaba contra la URL literal "undefined/upload"), sin adjuntar
// ningún JWT contra un endpoint que lo exige, y además llamaba a un backend
// legado (`NEXT_PUBLIC_AUTH_URL`) que no existe en este monorepo para
// "guardar estadísticas" y listar eventos. Reescrito para usar la instancia
// `api` compartida (JWT real vía interceptor) contra el endpoint real
// `POST /campaigns/meta/upload`. El campo "Evento asociado" se simplifica a
// metadata local en texto libre (opcional) — no bloquea el envío.
export default function BroadcastModal({ template, onClose }: { template: any, onClose: () => void }) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [scheduledMessage, setScheduledMessage] = useState<string | null>(null);

  // Auditoría de WhatsApp en Difusiones, Fase 5 (2026-09-05): "programar
  // envío" real, mismo patrón que SMS/Email/Bot.
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return toast.error("Falta el archivo CSV con los destinatarios");
    if (isScheduled && !scheduledAtLocal) return toast.error("Elige cuándo programar el envío");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("csvFile", csvFile);
      formData.append("messageTemplate", template.name);
      if (imageUrl) formData.append("mediaUrl", imageUrl);
      if (eventLabel) formData.append("eventLabel", eventLabel);
      if (isScheduled && scheduledAtLocal) {
        formData.append("sendAt", new Date(scheduledAtLocal).toISOString());
      }

      const { data } = await api.post('/campaigns/meta/upload', formData);

      if (data.success) {
        setQueuedCount(data.results?.length ?? 0);
        setScheduledMessage(data.scheduledFor ? data.message : null);
        setSuccess(true);
        toast.success(data.scheduledFor ? "Campaña programada" : "Campaña lanzada con éxito");
      }
    } catch (error) {
      toast.error("Error en envío", { description: extractErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  if(success) {
      return (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="h-24 w-24 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-2 animate-in zoom-in duration-300">
                  <CheckCircle2 className="h-12 w-12"/>
              </div>
              <div>
                <h3 className="text-2xl font-black text-primary">{scheduledMessage ? '¡Campaña Programada!' : '¡Envío en Proceso!'}</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">
                    {scheduledMessage
                      ? scheduledMessage
                      : queuedCount > 0
                        ? `Se encolaron ${queuedCount} mensajes reales. Saldrán en breve.`
                        : 'Tu campaña se encoló para procesamiento. Los mensajes saldrán en breve.'}
                </p>
              </div>
              <Button onClick={onClose} className="bg-primary text-white px-8 font-bold">Cerrar Ventana</Button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
                <h2 className="text-lg font-bold text-primary">Configurar Difusión</h2>
                <p className="text-xs text-slate-500 mt-0.5">Plantilla: <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{template.name}</span></p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><XCircle className="h-5 w-5 text-slate-400 hover:text-red-500"/></Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">

            {/* Input CSV */}
            <div className="space-y-3">
                <Label className="font-bold text-slate-700">1. Base de Datos (CSV)</Label>
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group ${csvFile ? 'border-green-500 bg-green-50/50' : 'border-slate-200 hover:border-secondary hover:bg-slate-50'}`}>
                    <input
                        type="file" accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="hidden" id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-3 w-full h-full">
                        {csvFile ? (
                            <>
                                <FileText className="h-10 w-10 text-green-600 animate-in bounce-in duration-300"/>
                                <div>
                                    <span className="font-bold text-green-800 block">{csvFile.name}</span>
                                    <span className="text-xs text-green-600">Click para cambiar archivo</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="h-10 w-10 text-slate-300 group-hover:text-secondary transition-colors"/>
                                <div>
                                    <span className="text-sm font-bold text-slate-600 block">Haz click para cargar</span>
                                    <span className="text-xs text-slate-400">Formato: telefono, nombre...</span>
                                </div>
                            </>
                        )}
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="font-bold text-slate-700">2. Evento asociado (opcional)</Label>
                    <Input
                        type="text"
                        placeholder="Ej: Lanzamiento campaña navideña"
                        value={eventLabel}
                        onChange={(e) => setEventLabel(e.target.value)}
                        className="h-11 bg-white border-slate-200"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="font-bold text-slate-700">3. Imagen (Opcional)</Label>
                    <Input
                        type="text"
                        placeholder="Pegar URL de imagen..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="h-11 bg-white border-slate-200"
                    />
                </div>
            </div>

            {/* Auditoría de WhatsApp en Difusiones, Fase 5 (2026-09-05):
                "programar envío" real, mismo patrón que SMS/Email/Bot. */}
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

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={onClose} className="h-12 px-6">Cancelar</Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-white font-bold px-8 h-12 shadow-lg transition-all active:scale-95"
                >
                    {loading ? (
                        <span className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4"/> Procesando...</span>
                    ) : isScheduled ? (
                        <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4"/> Programar</span>
                    ) : (
                        <span className="flex items-center gap-2"><Send className="h-4 w-4"/> Enviar Ahora</span>
                    )}
                </Button>
            </div>
        </form>
    </div>
  );
}
