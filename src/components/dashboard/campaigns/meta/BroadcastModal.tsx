"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, FileText, Send, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import Cookies from "js-cookie";

// UI Components
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const urlMeta = process.env.NEXT_PUBLIC_WHATSAPP_URL_META;
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || "";

export default function BroadcastModal({ template, onClose }: { template: any, onClose: () => void }) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [eventName, setEventName] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = Cookies.get("token");
        if(!token) return;
        const res = await axios.get(`${authUrl}/api/v1.0/events/list`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if(res.data?.data?.active) setEvents(res.data.data.active);
      } catch (e) { console.error("Error eventos", e); }
    };
    fetchEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!csvFile || !eventName) return toast.error("Faltan campos obligatorios");

    setLoading(true);
    try {
        const formData = new FormData();
        formData.append("csvFile", csvFile);
        formData.append("messageTemplate", template.name);
        formData.append("mediaUrl", imageUrl);

        const res = await axios.post(`${urlMeta}/upload`, formData);

        if (res.data.success) {
            await saveStats(template.name, res.data.results.length, eventName);
            setSuccess(true);
            toast.success("Campaña lanzada con éxito");
        }
    } catch (err: any) {
        toast.error("Error en envío", { description: err.message });
    } finally {
        setLoading(false);
    }
  };

  const saveStats = async (subject: string, total: number, event: string) => {
      try {
        const token = Cookies.get("token");
        await axios.post(`${authUrl}/api/v1.0/broadcasts/all`, {
            subject, totalMessagesSent: total, imageUrl, status: "Finalizado", 
            date: new Date().toISOString().split("T")[0], eventName: event, 
            type: "Informativo", provedor: "whatsapp✅"
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch(e) { console.error("Error stats", e); }
  };

  if(success) {
      return (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="h-24 w-24 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-2 animate-in zoom-in duration-300">
                  <CheckCircle2 className="h-12 w-12"/>
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#1B2541]">¡Envío en Proceso!</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">
                    Tu campaña se ha enviado a la cola de procesamiento. Los mensajes saldrán en breve.
                </p>
              </div>
              <Button onClick={onClose} className="bg-[#1B2541] text-white px-8 font-bold">Cerrar Ventana</Button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
                <h2 className="text-lg font-bold text-[#1B2541]">Configurar Difusión</h2>
                <p className="text-xs text-slate-500 mt-0.5">Plantilla: <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{template.name}</span></p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><XCircle className="h-5 w-5 text-slate-400 hover:text-red-500"/></Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* Input CSV */}
            <div className="space-y-3">
                <Label className="font-bold text-slate-700">1. Base de Datos (CSV)</Label>
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group ${csvFile ? 'border-green-500 bg-green-50/50' : 'border-slate-200 hover:border-[#FFC400] hover:bg-slate-50'}`}>
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
                                <UploadCloud className="h-10 w-10 text-slate-300 group-hover:text-[#FFC400] transition-colors"/>
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
                    <Label className="font-bold text-slate-700">2. Evento Asociado</Label>
                    <Select value={eventName} onValueChange={setEventName}>
                        <SelectTrigger className="h-11 bg-white border-slate-200"><SelectValue placeholder="Selecciona..."/></SelectTrigger>
                        <SelectContent>
                            {events.map(e => <SelectItem key={e.id} value={e.eventName}>{e.eventName}</SelectItem>)}
                        </SelectContent>
                    </Select>
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

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={onClose} className="h-12 px-6">Cancelar</Button>
                <Button 
                    type="submit" 
                    disabled={loading} 
                    className="bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold px-8 h-12 shadow-lg transition-all active:scale-95"
                >
                    {loading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4"/> Procesando...</span> : <span className="flex items-center gap-2"><Send className="h-4 w-4"/> Enviar Ahora</span>}
                </Button>
            </div>
        </form>
    </div>
  );
}