'use client';

import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import api from "@/lib/api"; // Asegúrate de que apunte a tu instancia de Axios
import { 
  MessageSquare, Upload, Send, Trash2, 
  FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Info,
  Zap, Siren, ShieldAlert
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SmsFormValues {
  message: string;
  flash: boolean;
  priority: boolean;
}

export default function SmsBroadcastPage() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SmsFormValues>({
    defaultValues: {
      message: "",
      flash: false,
      priority: false
    }
  });

  // Observamos valores para la vista previa y lógica condicional
  const messageValue = watch("message");
  const isFlash = watch("flash");
  const isPriority = watch("priority");

  // --- LÓGICA DE LIMPIEZA GSM (Espejo del Backend) ---
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const originalText = e.target.value;
    
    // 1. Normalización (Quitar tildes y Ñ)
    let cleaned = originalText
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, 'n').replace(/Ñ/g, 'N');

    // 2. Filtro GSM (Solo ASCII imprimible)
    cleaned = cleaned.replace(/[^\x20-\x7E\n\r]/g, "");

    // 3. Límite duro (160 caracteres)
    if (cleaned.length > 160) {
        cleaned = cleaned.substring(0, 160);
        toast.warning("Límite de 160 caracteres alcanzado.");
    }

    setValue("message", cleaned);
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject("Error leyendo archivo");
      };
      reader.onerror = (error) => reject(error);
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Solo se permiten archivos CSV");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFileName(null);
        return;
      }
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };

  const onSubmit = async (data: SmsFormValues) => {
    const csvFile = fileInputRef.current?.files?.[0];

    if (!csvFile) {
      toast.error("Falta el archivo CSV", { description: "Debes cargar la base de datos." });
      return;
    }

    // Validación de seguridad para Priority (Frontend check)
    if (data.priority && data.message.length > 50) {
       // Opcional: advertir si el mensaje prioritario parece muy largo (suele ser corto para OTP)
    }

    setLoading(true);

    try {
      const csvBase64 = await toBase64(csvFile);

      // Enviamos el DTO exacto que espera NestJS
      await api.post('/campaigns/sms/broadcast', {
        message: data.message,
        csvFile: csvBase64, 
        fileName: csvFile.name,
        flash: data.flash,      // <--- Nuevo
        priority: data.priority // <--- Nuevo
      });

      toast.success("Campaña Encolada", {
        description: `Procesando ${csvFile.name}. Revisa el reporte en breves momentos.`
      });

      reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileName(null);

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Error de conexión con el servidor.";
      toast.error("Error en el envío", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileName(null);
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B2541] tracking-tight">Difusión SMS</h1>
          <p className="text-slate-500 mt-1">Gestión de campañas masivas y alertas transaccionales.</p>
        </div>
        <div className="hidden md:block">
           <span className="bg-blue-50 text-[#1B2541] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-100 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Gateway Conectado
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Formulario */}
        <Card className="lg:col-span-2 shadow-xl border-0 ring-1 ring-slate-100">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
            <CardTitle className="text-xl font-bold text-[#1B2541] flex items-center gap-2">
              <Send className="h-5 w-5 text-[#FFC400]" /> Configuración de Envío
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 md:p-8 space-y-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
              {/* 1. Mensaje */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label htmlFor="message" className="text-sm font-bold text-slate-700">
                    Contenido del Mensaje <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">GSM-7 Cleaned</span>
                </div>
                
                <div className="relative">
                    <Textarea
                      id="message"
                      {...register("message", { required: "El mensaje es obligatorio" })}
                      onChange={(e) => {
                          handleMessageChange(e); // Lógica de limpieza
                          register("message").onChange(e); // Mantener hook form sincronizado
                      }}
                      placeholder="Hola, te invitamos a..."
                      className="min-h-[120px] resize-none bg-slate-50 border-slate-200 focus:border-[#FFC400] focus:ring-[#FFC400]/20 text-base pr-16 font-mono"
                    />
                    <div className={`absolute bottom-3 right-3 text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                        (messageValue?.length || 0) === 160 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-slate-600'
                    }`}>
                        {messageValue?.length || 0} / 160
                    </div>
                </div>
              </div>

              {/* 2. Opciones Avanzadas (NUEVO) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Switch Flash */}
                <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${isFlash ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                    <div className="mt-1 bg-white p-2 rounded-full border border-slate-100 shadow-sm">
                        <Zap className={`h-5 w-5 ${isFlash ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}`} />
                    </div>
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="flash" className="font-bold text-slate-700 cursor-pointer">Mensaje Flash</Label>
                            {/* Checkbox manual estilizado si no tienes el componente Switch */}
                            <input 
                                type="checkbox" 
                                id="flash" 
                                {...register("flash")}
                                className="w-5 h-5 accent-[#FFC400] cursor-pointer"
                            />
                        </div>
                        <p className="text-xs text-slate-500 leading-snug">
                            Aparece como ventana emergente (Pop-up) en la pantalla del usuario.
                        </p>
                    </div>
                </div>

                {/* Switch Prioridad */}
                <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${isPriority ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                    <div className="mt-1 bg-white p-2 rounded-full border border-slate-100 shadow-sm">
                        <Siren className={`h-5 w-5 ${isPriority ? 'text-red-500' : 'text-slate-400'}`} />
                    </div>
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="priority" className="font-bold text-slate-700 cursor-pointer">Alta Prioridad</Label>
                            <input 
                                type="checkbox" 
                                id="priority" 
                                {...register("priority")}
                                className="w-5 h-5 accent-red-600 cursor-pointer"
                            />
                        </div>
                        <p className="text-xs text-slate-500 leading-snug">
                            Ruta transaccional rápida. <strong>No usar para publicidad.</strong>
                        </p>
                    </div>
                </div>
              </div>

              {/* Advertencia Legal si activa Prioridad */}
              {isPriority && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 animate-in fade-in slide-in-from-top-2">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>¡Precaución Regulatoria!</AlertTitle>
                    <AlertDescription className="text-xs mt-1 leading-relaxed">
                      Según la normativa de Háblame y la CRC, los mensajes prioritarios son <strong>exclusivos para OTP, alertas de seguridad o notificaciones críticas</strong>. 
                      <br/><br/>
                      Si envías publicidad (invitaciones, votos, noticias) usando esta ruta, <strong>tu cuenta podría ser bloqueada por fraude</strong>.
                    </AlertDescription>
                  </Alert>
              )}

              {/* 3. Archivo CSV */}
              <div className="space-y-2 pt-2">
                <Label className="text-sm font-bold text-slate-700">Base de Datos (CSV)</Label>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer group flex flex-col items-center justify-center text-center
                        ${fileName ? 'border-green-400 bg-green-50/50' : 'border-slate-200 hover:border-[#1B2541] hover:bg-slate-50'}
                    `}
                >
                    <input 
                        type="file" 
                        accept=".csv" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                    
                    {fileName ? (
                        <div className="flex items-center gap-3 animate-in zoom-in">
                            <div className="bg-green-100 p-2 rounded-lg text-green-700">
                                <FileSpreadsheet className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-green-800 break-all">{fileName}</p>
                                <p className="text-xs text-green-600">Archivo listo</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-2">
                            <Upload className="h-8 w-8 text-slate-300 group-hover:text-[#1B2541] mb-2 transition-colors" />
                            <p className="text-sm font-medium text-slate-600">Clic para cargar CSV</p>
                        </div>
                    )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 h-12 bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold text-base shadow-lg shadow-blue-900/10"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                    {loading ? "Encolando..." : `Enviar ${isPriority ? 'Prioritario' : 'Campaña'}`}
                </Button>
                
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={clearForm}
                    disabled={loading}
                    className="h-12 w-12 px-0 border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50"
                >
                    <Trash2 className="h-5 w-5" />
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

        {/* Columna Derecha: Vista Previa y Tips */}
        <div className="space-y-6">
            
            {/* Vista Previa Móvil */}
            <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden bg-slate-100 relative max-w-[300px] mx-auto lg:mx-0">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20"></div>
                <div className="h-[500px] flex flex-col pt-12 px-4 pb-4">
                    <div className="text-center mb-4">
                        <p className="text-[10px] text-slate-400 font-bold">MENSATEL</p>
                    </div>
                    
                    {isFlash ? (
                        // Vista Flash (Pop-up)
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-6 z-10 backdrop-blur-sm">
                            <div className="bg-white p-4 rounded-lg shadow-2xl w-full animate-in zoom-in duration-300">
                                <h4 className="font-bold text-sm mb-2 text-slate-800">Mensaje de Red</h4>
                                <p className="text-sm text-slate-600 leading-relaxed font-mono">
                                    {messageValue || "Tu mensaje flash aquí..."}
                                </p>
                                <div className="mt-4 flex justify-end gap-4 text-sm font-bold text-blue-600">
                                    <span>Cancelar</span>
                                    <span>Guardar</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Vista Normal (Burbuja)
                        <div className="flex flex-col gap-3">
                            <div className="self-start bg-slate-200 p-3 rounded-2xl rounded-bl-none max-w-[90%] shadow-sm">
                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                                    {messageValue || "Hola, escribe tu mensaje para ver cómo se verá en el dispositivo del usuario."}
                                </p>
                            </div>
                            <span className="text-[10px] text-slate-400 ml-1">Ahora</span>
                        </div>
                    )}
                </div>
            </Card>

            <Card className="bg-[#1B2541] text-white border-0 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFC400] rounded-full blur-[50px] opacity-20 -mr-5 -mt-5"></div>
                <CardContent className="p-5 space-y-3 text-sm text-slate-300 relative z-10">
                    <h3 className="font-bold text-white flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-[#FFC400]" /> Checklist
                    </h3>
                    <ul className="space-y-2 text-xs">
                        <li>• <strong>CSV:</strong> Debe tener columna "telefono".</li>
                        <li>• <strong>Tildes:</strong> Se borran automáticamente.</li>
                        <li>• <strong>Links:</strong> Usar acortador bit.ly ahorra caracteres.</li>
                        <li>• <strong>Legal:</strong> Respeta horario 7am - 7pm.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}