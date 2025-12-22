"use client";

import React, { useState } from "react";
import { X, MessageSquare, Image as ImageIcon, Link as LinkIcon, Phone, Plus, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["MARKETING", "AUTHENTICATION", "UTILITY"];
const LANGUAGES = [
  { label: "Español (CO)", value: "es_CO" },
  { label: "Inglés (US)", value: "en_US" },
];

const token = process.env.NEXT_PUBLIC_YOUR_ACCESS_TOKEN!;
const whatsappId = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_ID!;
const version = process.env.NEXT_PUBLIC_GRAPH_API_VERSION || "v19.0";

export default function TemplateCreator({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("es_CO");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<any[]>([]);
  
  // Estados botones
  const [btnType, setBtnType] = useState("QUICK_REPLY");
  const [btnText, setBtnText] = useState("");
  const [btnVal, setBtnVal] = useState("");

  const formatName = (txt: string) => txt.trim().toLowerCase().replace(/\s+/g, "_");

  const handleAddButton = () => {
    if(!btnText) return;
    if(buttons.length >= 3) return toast.error("Máximo 3 botones permitidos");
    
    const newBtn: any = { type: btnType, text: btnText };
    if(btnType === "URL") newBtn.url = btnVal;
    if(btnType === "PHONE_NUMBER") newBtn.phone_number = btnVal;

    setButtons([...buttons, newBtn]);
    setBtnText(""); setBtnVal("");
  };

  const handleSubmit = async () => {
    if(!name || !bodyText) return toast.error("Nombre y mensaje son obligatorios");

    const payload = {
        name: formatName(name),
        category,
        language,
        components: [
            { type: "BODY", text: bodyText },
            ...(footerText ? [{ type: "FOOTER", text: footerText }] : []),
            ...(buttons.length > 0 ? [{ type: "BUTTONS", buttons }] : [])
        ]
    };

    try {
        const res = await fetch(`https://graph.facebook.com/${version}/${whatsappId}/message_templates`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(data.error) throw new Error(data.error.message);
        
        toast.success("Plantilla enviada a revisión");
        onSuccess();
        onClose();
    } catch (e: any) {
        toast.error("Error al crear", { description: e.message });
    }
  };

  return (
    <div className="flex h-full w-full bg-white">
        
        {/* IZQUIERDA: FORMULARIO */}
        <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-black text-[#1B2541]">Nueva Plantilla</h2>
                    <p className="text-xs text-slate-500">Configura tu mensaje para aprobación de Meta.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-red-500"/></Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">Nombre (Interno)</Label>
                        <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="ej: promo_navidad" 
                            className="font-mono text-sm bg-slate-50 border-slate-200 focus:ring-[#1B2541]"
                        />
                        <p className="text-[10px] text-slate-400">Solo minúsculas y guiones bajos.</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">Categoría</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Mensaje (Cuerpo)</Label>
                    <div className="relative">
                        <Textarea 
                            value={bodyText}
                            onChange={(e) => setBodyText(e.target.value)}
                            rows={6}
                            placeholder="Hola {{1}}, tu pedido {{2}} está listo..."
                            className="bg-slate-50 border-slate-200 resize-none pr-10 focus:ring-[#1B2541]"
                        />
                        <MessageSquare className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 bg-blue-50 text-blue-600 px-2 py-1 rounded inline-block">
                        Tip: Usa <code>{`{{1}}`}</code> para variables dinámicas (Nombre, Fecha, etc).
                    </p>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Pie de página (Opcional)</Label>
                    <Input 
                        value={footerText} 
                        onChange={(e) => setFooterText(e.target.value)} 
                        placeholder="Enviado por Equipo Uscategui"
                        className="bg-slate-50 border-slate-200"
                    />
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <Label className="text-[#1B2541] font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600"/> Botones de Acción
                        </Label>
                        <span className="text-xs text-slate-400">{buttons.length}/3</span>
                    </div>
                    
                    <div className="flex gap-2">
                        <Select value={btnType} onValueChange={setBtnType}>
                            <SelectTrigger className="w-[140px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="QUICK_REPLY">Respuesta</SelectItem>
                                <SelectItem value="URL">Link Web</SelectItem>
                                <SelectItem value="PHONE_NUMBER">Llamar</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input 
                            value={btnText} 
                            onChange={(e) => setBtnText(e.target.value)} 
                            placeholder="Texto del botón"
                            className="bg-white border-slate-200"
                        />
                        <Button onClick={handleAddButton} disabled={buttons.length >= 3} className="bg-[#1B2541] text-white hover:bg-[#1B2541]/90"><Plus className="w-4 h-4"/></Button>
                    </div>
                    
                    {btnType !== "QUICK_REPLY" && (
                        <Input 
                            value={btnVal} 
                            onChange={(e) => setBtnVal(e.target.value)} 
                            placeholder={btnType === "URL" ? "https://..." : "+57..."}
                            className="bg-white border-slate-200"
                        />
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                        {buttons.map((b, i) => (
                            <div key={i} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 shadow-sm animate-in zoom-in-50">
                                {b.type === "URL" && <LinkIcon className="w-3 h-3 text-blue-500"/>}
                                {b.type === "PHONE_NUMBER" && <Phone className="w-3 h-3 text-green-500"/>}
                                <span className="font-medium text-slate-700">{b.text}</span>
                                <button onClick={() => setButtons(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5"/></button>
                            </div>
                        ))}
                        {buttons.length === 0 && <p className="text-xs text-slate-400 italic">Sin botones agregados.</p>}
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white">
                <Button onClick={handleSubmit} className="w-full bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold h-12 text-base shadow-lg transition-transform active:scale-[0.99]">
                    Crear y Enviar a Revisión
                </Button>
            </div>
        </div>

        {/* DERECHA: PREVIEW CELULAR */}
        <div className="hidden lg:flex w-1/2 bg-slate-100 items-center justify-center relative overflow-hidden p-8">
            {/* Patrón de fondo */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png')] bg-repeat space"></div>
            
            {/* CAMBIOS AQUÍ: 
                1. Quitamos h-[720px] fijo.
                2. Usamos h-full y max-h-[720px] para que se adapte.
                3. Añadimos w-full max-w-[360px] para mantener la proporción.
            */}
            <div className="w-full max-w-[360px] h-full max-h-[720px] bg-white rounded-[3rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden flex flex-col relative z-10 mx-auto">
                
                {/* Header WA */}
                <div className="bg-[#008069] h-20 pt-8 pb-2 px-4 flex items-center gap-3 text-white shadow-md shrink-0">
                    <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm shrink-0">B</div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-sm leading-tight truncate">Tu Negocio</p>
                        <p className="text-[10px] opacity-90 truncate">Cuenta de empresa oficial</p>
                    </div>
                </div>

                {/* Chat Area - Usamos flex-1 para que ocupe el resto del espacio */}
                <div className="flex-1 bg-[#E5DDD5] p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] overflow-y-auto custom-scrollbar">
                    <div className="bg-white rounded-lg rounded-tl-none p-1 shadow-sm mt-4 max-w-[95%] animate-in slide-in-from-left-4 fade-in duration-500">
                        <div className="p-3 space-y-2">
                            <p className="text-[14px] text-gray-800 whitespace-pre-wrap leading-relaxed break-words">
                                {bodyText || <span className="text-gray-300 italic">Aquí aparecerá tu mensaje...</span>}
                            </p>
                            {footerText && (
                                <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-50">{footerText}</p>
                            )}
                        </div>
                        
                        <div className="flex justify-end px-2 pb-1.5">
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">10:30 AM <CheckCircle2 className="w-2.5 h-2.5 text-blue-400"/></span>
                        </div>

                        {/* Botones Preview */}
                        {buttons.length > 0 && (
                            <div className="border-t border-gray-100 mt-1 bg-gray-50/50">
                                {buttons.map((btn, i) => (
                                    <div key={i} className="py-3 text-center text-[#00A5F4] text-[15px] font-medium border-b border-gray-100 last:border-0 hover:bg-gray-100 cursor-pointer flex items-center justify-center gap-2 transition-colors">
                                        {btn.type === "URL" && <LinkIcon className="w-4 h-4"/>}
                                        {btn.type === "PHONE_NUMBER" && <Phone className="w-4 h-4"/>}
                                        <span className="truncate max-w-[200px]">{btn.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer Falso - shrink-0 para que no se aplaste */}
                <div className="h-16 bg-[#F0F2F5] flex items-center px-4 gap-2 border-t border-gray-200 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-gray-300 shrink-0"></div>
                    <div className="flex-1 h-9 bg-white rounded-full border border-gray-300"></div>
                    <div className="w-8 h-8 rounded-full bg-[#008069] flex items-center justify-center text-white shrink-0"><Send className="w-4 h-4"/></div>
                </div>
            </div>
        </div>
    </div>
  );
}