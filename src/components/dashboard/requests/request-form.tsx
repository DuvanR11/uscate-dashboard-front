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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { 
  Loader2, ArrowLeft, Save, FileText, UploadCloud, X, FileCheck, ExternalLink, AlertCircle 
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

  // ✅ CORREGIDO: Nombres exactos que espera el Backend (MediaController)
  const getFolderByType = (type: string) => {
    switch(type) {
        case "LEGISLATIVE": return "legislativo";
        case "INTERNAL": return "internas";
        case "SECURITY_APP": return "seguridad"; 
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
        params: { folder: folderName }, // Se envía al backend para ordenar en S3
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
    <div className="max-w-6xl mx-auto pb-24 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1B2541]">Nueva Solicitud</h1>
            <p className="text-slate-500">Diligencia la información para radicar un nuevo caso en el sistema.</p>
         </div>
         <Button variant="outline" onClick={() => router.back()} className="border-slate-300 text-slate-700 hover:bg-slate-50">
             <ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
         </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* --- COLUMNA IZQUIERDA (CONTENIDO PRINCIPAL) --- */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* 1. INFORMACIÓN BÁSICA */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Información del Caso
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-slate-700">Asunto del Requerimiento <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Revisión de documento jurídico..." {...field} className="h-11" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-slate-700">Descripción Detallada <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Escribe aquí todos los detalles necesarios para gestionar esta solicitud..." 
                                        className="min-h-[150px] resize-y p-4 leading-relaxed" 
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* 2. EVIDENCIAS / ARCHIVOS */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                             <UploadCloud className="w-5 h-5 text-[#FFC400]" />
                             Evidencias y Adjuntos
                        </CardTitle>
                        <CardDescription>Soporta imágenes y documentos PDF hasta 20MB.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {currentDocumentUrl ? (
                            <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50/50">
                                {/* VISTA PREVIA SI ES IMAGEN */}
                                {isImage(currentDocumentUrl) ? (
                                    <div className="relative h-64 w-full bg-slate-100 flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={currentDocumentUrl} 
                                            alt="Preview" 
                                            className="h-full w-full object-contain p-2"
                                        />
                                    </div>
                                ) : (
                                    // VISTA PREVIA SI ES DOCUMENTO
                                    <div className="flex items-center p-6 gap-4">
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                                            <FileText className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">Documento Adjunto</p>
                                            <p className="text-xs text-slate-500 font-mono truncate">{currentDocumentUrl.split('/').pop()}</p>
                                        </div>
                                    </div>
                                )}

                                {/* BOTÓN ELIMINAR FLOTANTE */}
                                <div className="absolute top-2 right-2">
                                    <Button type="button" variant="destructive" size="icon" className="h-8 w-8 rounded-full shadow-sm" onClick={() => form.setValue("documentUrl", "")}>
                                        <X size={16} />
                                    </Button>
                                </div>

                                {/* FOOTER CON LINK */}
                                <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                                        <FileCheck size={14} /> Subida completada
                                    </div>
                                    <a href={currentDocumentUrl} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                                        <ExternalLink size={12} /> Abrir original
                                    </a>
                                </div>
                            </div>
                        ) : (
                            // ZONA DE DROP (VACÍA)
                            <div className="group relative">
                                <div className={`
                                    flex flex-col items-center justify-center w-full h-40 
                                    border-2 border-dashed rounded-xl cursor-pointer 
                                    transition-all duration-200
                                    ${uploading ? 'bg-slate-50 border-slate-300' : 'bg-slate-50 border-slate-300 hover:bg-blue-50/50 hover:border-blue-400'}
                                `}>
                                    {uploading ? (
                                        <div className="flex flex-col items-center animate-pulse">
                                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                                            <p className="text-sm text-slate-600 font-medium">Subiendo archivo...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                                <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                                            </div>
                                            <p className="mb-1 text-sm text-slate-600 font-medium">Haz clic para subir o arrastra aquí</p>
                                            <p className="text-xs text-slate-400">PDF, JPG, PNG</p>
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
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* --- COLUMNA DERECHA (CONFIGURACIÓN) --- */}
            <div className="lg:col-span-4 space-y-6">
                
                <Card className="shadow-sm border-slate-200 bg-slate-50/50">
                    <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                            Configuración
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        
                        {/* 1. TIPO DE TRÁMITE */}
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-slate-700 font-semibold">Tipo de Trámite</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-white border-slate-200 h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="INTERNAL">🏢 Interna / Admin</SelectItem>
                                        <SelectItem value="LEGISLATIVE">⚖️ Legislativa</SelectItem>
                                        <SelectItem value="SECURITY_APP">🚨 Reporte Seguridad</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">
                                    Define la carpeta de almacenamiento: <span className="font-mono text-blue-600 font-medium">/{getFolderByType(field.value)}</span>
                                </FormDescription>
                                </FormItem>
                            )}
                        />

                        {/* 2. PRIORIDAD (Con colores) */}
                        <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-slate-700 font-semibold">Prioridad</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="bg-white border-slate-200 h-10"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="LOW">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400"></div> Baja</div>
                                        </SelectItem>
                                        <SelectItem value="MEDIUM">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Media</div>
                                        </SelectItem>
                                        <SelectItem value="HIGH">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Alta</div>
                                        </SelectItem>
                                        <SelectItem value="CRITICAL">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600"></div> Crítica</div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />

                        {/* 3. SOLICITANTE */}
                        <FormField
                            control={form.control}
                            name="prospectId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-slate-700 font-semibold">Solicitante (Opcional)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                                    <FormControl><SelectTrigger className="bg-white border-slate-200 h-10"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">-- Anónimo / Interno --</SelectItem>
                                        {prospects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />

                        {/* 4. CAMPO CONDICIONAL (SOLO LEGISLATIVO) */}
                        {selectedType === "LEGISLATIVE" && (
                            <div className="pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                                <FormField
                                    control={form.control}
                                    name="externalCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-blue-800 font-bold flex items-center gap-2">
                                                Número de Radicado
                                                <AlertCircle size={14} className="text-blue-500" />
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="Ej: EXT-2025-001" 
                                                    {...field} 
                                                    className="bg-blue-50 border-blue-200 focus-visible:ring-blue-500" 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                    </CardContent>
                </Card>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex flex-col gap-3 pt-4">
                    <Button type="submit" disabled={loading || uploading} className="w-full bg-[#1B2541] hover:bg-[#1B2541]/90 h-12 text-base font-semibold shadow-lg shadow-blue-900/10">
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        Crear Solicitud
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => router.back()} className="w-full text-slate-500 hover:bg-slate-100">
                        Cancelar operación
                    </Button>
                </div>

            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}