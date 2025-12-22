'use client';

import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import api from "@/lib/api";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { 
  Mail, Send, Trash2, FileSpreadsheet, Loader2, Eye, Plus, Link as LinkIcon, X,
  Building2, Ticket, CheckCircle, Zap, Cake, ShieldAlert
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmailButton, generateEmailHtml, TemplateType } from "@/components/dashboard/campaigns/emails/EmailTemplate";

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
  
  const [buttons, setButtons] = useState<EmailButton[]>([]);
  const [btnText, setBtnText] = useState("");
  const [btnUrl, setBtnUrl] = useState("");
  const [btnColor, setBtnColor] = useState(BUTTON_COLORS[0]);

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

  const onSubmit = async (data: any) => {
    const csvFile = csvInputRef.current?.files?.[0];
    if (!csvFile) { toast.error("Falta el archivo CSV"); return; }
    
    // Validación Anti-Spam Básica
    if (!data.message || data.message === '<p></p>') {
        toast.error("El mensaje no puede estar vacío");
        return;
    }
    if (data.subject.length < 10) {
        toast.warning("Recomendación: El asunto es muy corto y podría caer en Spam.");
        // No retornamos, dejamos que el usuario decida si enviar
    }

    setLoading(true);
    try {
      // 1. Generar HTML Final (Diseño)
      const htmlBody = generateEmailHtml({
        content: data.message,
        imageUrl: data.imageUrl,
        subject: data.subject,
        buttons: buttons,
        type: data.templateType
      });

      // 2. Generar Texto Plano (Anti-Spam)
      // Extraemos texto del mensaje + los links de los botones manualmente
      let plainTextBody = extractTextFromHtml(data.message);
      if (buttons.length > 0) {
          plainTextBody += "\n\nEnlaces de interés:\n" + buttons.map(b => `${b.text}: ${b.url}`).join('\n');
      }

      const reader = new FileReader();
      reader.readAsDataURL(csvFile);
      reader.onload = async () => {
          await api.post('/campaigns/email/broadcast', {
            subject: data.subject,
            htmlContent: htmlBody,
            textContent: plainTextBody, // <--- CAMPO NUEVO IMPORTANTE
            csvFile: reader.result, 
            fileName: csvFile.name
          });
          toast.success("Campaña enviada correctamente");
          reset(); setButtons([]); setImagePreview(null);
          if (csvInputRef.current) csvInputRef.current.value = "";
      };
    } catch (error: any) {
      toast.error("Error al enviar la campaña");
    } finally {
      setLoading(false);
    }
  };

  // ... (Resto de handlers de imagen/csv se mantienen igual) ...
  const handleCsvChange = (e: any) => { const f = e.target.files[0]; if(f) setCsvName(f.name); };
  const handleImageChange = (e: any) => { 
      const f = e.target.files[0];
      if(f){
          const r = new FileReader();
          r.onload = (ev) => { setImagePreview(ev.target?.result as string); setValue('imageUrl', ev.target?.result as string); };
          r.readAsDataURL(f);
      }
  };

  const TEMPLATES = [
    { id: 'official', name: 'Oficial', icon: Building2, color: 'bg-[#1B2541] text-white' },
    { id: 'invite', name: 'Invitación', icon: Ticket, color: 'bg-white border border-[#FFC400] text-[#1B2541]' },
    { id: 'confirm', name: 'Confirmación', icon: CheckCircle, color: 'bg-green-500 text-white' },
    { id: 'flash', name: 'Flash', icon: Zap, color: 'bg-[#FFC400] text-black' },
    { id: 'birthday', name: 'Cumpleaños', icon: Cake, color: 'bg-purple-500 text-white' },
  ];

  return (
    <div className="p-6 md:p-12 max-w-[1600px] mx-auto space-y-8 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B2541] tracking-tight">Editor de Email</h1>
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
                    <CardTitle className="text-lg font-bold text-[#1B2541] flex items-center gap-2">
                        <Send className="h-5 w-5 text-[#FFC400]" /> Configuración
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    
                    {/* Plantillas */}
                    <div className="grid grid-cols-5 gap-2">
                        {TEMPLATES.map((t) => (
                            <div key={t.id} onClick={() => setValue('templateType', t.id as TemplateType)}
                                className={`cursor-pointer rounded-lg p-2 flex flex-col items-center gap-1 transition-all border ${formValues.templateType === t.id ? 'border-[#1B2541] bg-slate-100 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}>
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
                                    <Button type="button" size="sm" onClick={handleAddButton} className="h-7 text-xs bg-[#1B2541]"><Plus className="h-3 w-3 mr-1"/> Agregar</Button>
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
                        <div onClick={() => imageInputRef.current?.click()} className="h-10 border rounded flex items-center justify-center cursor-pointer hover:bg-slate-50 text-xs text-slate-500">
                            {imagePreview ? 'Cambiar Imagen' : 'Subir Imagen'}
                            <input type="file" ref={imageInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                        </div>
                        <div onClick={() => csvInputRef.current?.click()} className="h-10 border rounded flex items-center justify-center cursor-pointer hover:bg-slate-50 text-xs text-slate-500">
                            {csvName || 'Subir CSV'}
                            <input type="file" ref={csvInputRef} onChange={handleCsvChange} className="hidden" accept=".csv" />
                        </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-[#1B2541] hover:bg-[#1B2541]/90 text-white shadow-lg">
                        {loading ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Enviar Campaña
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
                            type: formValues.templateType as TemplateType
                        })}
                        className="w-full h-full border-0"
                    />
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}