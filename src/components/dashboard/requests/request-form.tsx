'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
// Agregamos 'Eye' y 'ExternalLink' a los iconos
import { 
  Loader2, ArrowLeft, Save, FileText, UploadCloud, X, FileCheck, Eye, ExternalLink 
} from "lucide-react";

// --- ESQUEMA DE VALIDACIÓN ---
const formSchema = z.object({
  type: z.enum(["INTERNAL", "LEGISLATIVE", "SECURITY_APP"]),
  subject: z.string().min(5, "El asunto es muy corto"),
  description: z.string().min(10, "Detalla mejor la solicitud"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  prospectId: z.string().optional(),
  externalCode: z.string().optional(),
  documentUrl: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.type === "LEGISLATIVE" && !data.externalCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El radicado es obligatorio para trámites legislativos",
      path: ["externalCode"],
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

export function RequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prospects, setProspects] = useState<{id: string, fullName: string}[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "INTERNAL",
      subject: "",
      description: "",
      priority: "MEDIUM",
      prospectId: undefined,
      externalCode: "",
      documentUrl: "",
    },
  });

  const selectedType = form.watch("type");
  const currentDocumentUrl = form.watch("documentUrl");

  // Helper para saber si es imagen
  const isImage = (url: string) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(url);
  };

  const getFolderByType = (type: string) => {
    switch(type) {
        case "LEGISLATIVE": return "legislativo";
        case "INTERNAL": return "internos";
        case "SECURITY_APP": return "seguridad-de-aplicaciones"; 
        default: return "general";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentType = form.getValues("type");
    const folderName = getFolderByType(currentType); 

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post('/media/upload', formData, {
        params: { folder: folderName },
        headers: { "Content-Type": "multipart/form-data" },
      });

      form.setValue("documentUrl", res.data.url);
      toast.success("Archivo cargado", {
        description: "La evidencia se ha adjuntado correctamente."
      });
    } catch (error) {
      console.error(error);
      toast.error("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const loadProspects = async () => {
      try {
        const res = await api.get('/prospects'); 
        const formatted = res.data.data.map((p: any) => ({
          id: p.id,
          fullName: `${p.firstName} ${p.lastName}`
        }));
        setProspects(formatted);
      } catch (e) { console.error("Error loading prospects"); }
    };
    loadProspects();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        prospectId: values.prospectId === "none" ? null : (values.prospectId || undefined),
        externalCode: values.type === 'LEGISLATIVE' ? values.externalCode : undefined,
      };

      await api.post("/requests", payload);
      toast.success("Solicitud creada exitosamente");
      router.push("/requests");
      router.refresh();
    } catch (error) {
      toast.error("Ocurrió un error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
         <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1B2541] rounded-xl shadow-lg shadow-blue-900/20">
                <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-black tracking-tight text-[#1B2541]">Nueva Solicitud</h2>
                <p className="text-sm text-slate-500 font-medium">Registra un nuevo requerimiento o trámite.</p>
            </div>
         </div>
         <Button variant="outline" onClick={() => router.back()} className="border-[#1B2541] text-[#1B2541] hover:bg-slate-50">
             <ArrowLeft className="mr-2 h-4 w-4" /> Volver
         </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="lg:col-span-2 space-y-6">
                
                <Card className="border-t-4 border-t-[#1B2541] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg text-[#1B2541]">Detalles del Requerimiento</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-semibold text-slate-700">Tipo de Trámite</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="focus:ring-[#FFC400]"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="INTERNAL">Interna / Administrativa</SelectItem>
                                        <SelectItem value="LEGISLATIVE">Legislativa</SelectItem>
                                        <SelectItem value="SECURITY_APP">Reporte Seguridad</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">
                                    Carpeta destino: <span className="font-mono text-blue-600">/{getFolderByType(field.value)}</span>
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-semibold text-slate-700">Asunto *</FormLabel>
                                <FormControl><Input placeholder="Ej: Proyecto de Ley 045" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-semibold text-slate-700">Descripción Detallada *</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Describe la situación..." 
                                        className="min-h-[120px] resize-y" 
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* --- SECCIÓN DE ADJUNTOS CON PREVISUALIZACIÓN --- */}
                <Card className="shadow-sm border border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                             <UploadCloud className="h-5 w-5 text-[#FFC400]" />
                             Adjuntos / Evidencias
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {currentDocumentUrl ? (
                            <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                
                                {/* 1. SI ES IMAGEN: PREVIEW */}
                                {isImage(currentDocumentUrl) ? (
                                    <div className="relative h-64 w-full bg-slate-100/50 flex items-center justify-center p-4">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={currentDocumentUrl} 
                                            alt="Preview" 
                                            className="h-full w-full object-contain rounded-md shadow-sm"
                                        />
                                        <div className="absolute top-2 right-2">
                                            <Button 
                                                type="button" 
                                                variant="destructive" 
                                                size="icon"
                                                className="h-8 w-8 rounded-full shadow-md"
                                                onClick={() => form.setValue("documentUrl", "")}
                                            >
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // 2. SI NO ES IMAGEN: VISTA DE ARCHIVO
                                    <div className="flex items-center justify-between p-4 bg-blue-50/50">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-lg border border-blue-100 text-blue-600 shadow-sm">
                                                <FileText size={24} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-700">Documento Adjunto</span>
                                                <span className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                                                    {currentDocumentUrl.split('/').pop()}
                                                </span>
                                            </div>
                                        </div>
                                        <Button 
                                            type="button" variant="ghost" size="icon"
                                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                            onClick={() => form.setValue("documentUrl", "")}
                                        >
                                            <X size={20} />
                                        </Button>
                                    </div>
                                )}

                                {/* BARRA INFERIOR DE ACCIONES */}
                                <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                                        <FileCheck size={14} />
                                        Cargado en la nube
                                    </div>
                                    <a 
                                        href={currentDocumentUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        <ExternalLink size={12} />
                                        Ver original
                                    </a>
                                </div>
                            </div>
                        ) : (
                            /* ZONA DE CARGA (DROPZONE) */
                            <div className="flex items-center gap-4 animate-in fade-in">
                                <div className="relative group w-full">
                                    <div className={`
                                        flex flex-col items-center justify-center w-full h-32 
                                        border-2 border-dashed rounded-lg cursor-pointer 
                                        transition-colors duration-200
                                        ${uploading ? 'bg-slate-50 border-slate-300' : 'bg-slate-50 border-slate-300 hover:bg-blue-50 hover:border-blue-400'}
                                    `}>
                                        {uploading ? (
                                            <div className="flex flex-col items-center">
                                                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                                                <p className="text-sm text-slate-500 font-medium">Subiendo a DigitalOcean...</p>
                                                <p className="text-xs text-slate-400">Carpeta: /{getFolderByType(selectedType)}</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center pt-5 pb-6">
                                                <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                                    <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                                                </div>
                                                <p className="mb-1 text-sm text-slate-500"><span className="font-bold text-[#1B2541]">Haz clic para subir</span> o arrastra</p>
                                                <p className="text-xs text-slate-400">Soporta: JPG, PNG, PDF (Máx 5MB)</p>
                                            </div>
                                        )}
                                        <Input 
                                            id="dropzone-file" 
                                            type="file" 
                                            className="hidden" 
                                            disabled={uploading}
                                            onChange={handleFileUpload}
                                            accept="image/*,.pdf"
                                        />
                                        <label htmlFor="dropzone-file" className="absolute inset-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <input type="hidden" {...form.register("documentUrl")} />
                    </CardContent>
                </Card>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="space-y-6">
                
                {selectedType === "LEGISLATIVE" && (
                     <Card className="border-l-4 border-l-blue-600 shadow-sm animate-in fade-in bg-blue-50/30">
                        <CardHeader className="pb-2">
                             <CardTitle className="text-sm text-blue-900 uppercase tracking-wide">Datos Legislativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="externalCode"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-blue-900 font-semibold">Número de Radicado *</FormLabel>
                                    <FormControl><Input placeholder="Ej: EXT-2025-001" {...field} className="bg-white border-blue-200" /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                     </Card>
                )}

                <Card className="border-t-4 border-t-[#FFC400] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base text-[#1B2541]">Configuración</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-semibold text-slate-700">Prioridad</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="LOW">Baja</SelectItem>
                                        <SelectItem value="MEDIUM">Media</SelectItem>
                                        <SelectItem value="HIGH">Alta</SelectItem>
                                        <SelectItem value="CRITICAL">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="prospectId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-semibold text-slate-700">Solicitante</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Buscar..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">-- Anónimo --</SelectItem>
                                        {prospects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>

          </div>

          <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
              <Button type="submit" disabled={loading || uploading} className="bg-[#1B2541] hover:bg-[#1B2541]/90 min-w-[150px] font-bold text-white shadow-lg shadow-blue-900/10">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Crear Solicitud
              </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}