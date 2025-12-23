'use client';

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { RequestItem } from "@/types/request";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// UI Components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { 
  Loader2, Save, ArrowLeft, User, MapPin, 
  MessageCircle, Building2, UserCog, Clock,
  ExternalLink, ImageIcon, FileText, Copy, Siren, AlertTriangle
} from "lucide-react";

import LocationMap from "./location-map";

const managementSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  assignedUserId: z.string().optional(),
  responseComments: z.string().optional(),
});

type ManagementValues = z.infer<typeof managementSchema>;

interface ManageRequestViewProps {
  request: RequestItem;
}

// Configuración de Roles permitidos por Tipo de Solicitud
const ALLOWED_ROLES_BY_TYPE: Record<string, string[]> = {
  INTERNAL: ['SECRETARY'],
  LEGISLATIVE: ['LEGISLATIVE'],
  SECURITY: ['SECRETARY', 'LEGISLATIVE'], 
  SECURITY_APP: ['SECRETARY', 'LEGISLATIVE'], // Asumiendo que App cae en seguridad
  // Default fallback
  DEFAULT: ['SECRETARY', 'LAWYER', 'LEADER', 'LEGISLATIVE']
};

export function ManageRequestView({ request }: ManageRequestViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Modificado: Ahora guardamos también el 'role'
  const [officials, setOfficials] = useState<{id: string, fullName: string, role: string}[]>([]);

  // --- 1. LÓGICA DE DATOS DEL CLIENTE (NORMALIZACIÓN) ---
  const isAppUser = request.type === 'SECURITY_APP';
  
  const rawClient = isAppUser ? request.createdBy : request.prospect;

  const clientData = {
    exists: !!rawClient,
    name: isAppUser 
        ? rawClient?.fullName 
        : (rawClient ? `${rawClient.firstName} ${rawClient.lastName}` : 'Anónimo'),
    email: rawClient?.email || "Sin correo",
    phone: rawClient?.phone, 
    initials: (isAppUser ? rawClient?.fullName : rawClient?.firstName)?.substring(0, 2).toUpperCase() || "AN",
    municipality: !isAppUser ? rawClient?.municipality?.name : null
  };

  // --- 2. HELPERS DE URL Y UBICACIÓN ---
  const publicUrl = `${window.location.origin}/consulta?key=${request.accessKey}`;
  const lat = (request as any).lat ? Number((request as any).lat) : null;
  const lng = (request as any).lng ? Number((request as any).lng) : null;
  const evidenceUrl = (request as any).imageUrl || (request as any).documentUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Enlace copiado al portapapeles");
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(url);

  // --- 3. FORMULARIO ---
  const form = useForm<ManagementValues>({
    resolver: zodResolver(managementSchema),
    defaultValues: {
      status: request.status,
      priority: request.priority,
      assignedUserId: request.assignedUser?.id || "none",
      responseComments: (request as any).responseComments || "",
    },
  });

  useEffect(() => {
    const loadOfficials = async () => {
      try {
        // IMPORTANTE: Agregué 'LEGISLATIVE' a la query para traerlos todos
        const res = await api.get('/users?roles=SECRETARY,LAWYER,LEADER,LEGISLATIVE&limit=100'); 
        const users = res.data.data || res.data; 
        
        // Guardamos ID, Nombre y ROL
        setOfficials(users.map((u: any) => ({ 
            id: u.id, 
            fullName: u.full_name || u.fullName,
            role: u.role // <--- Guardamos el rol para filtrar después
        })));
      } catch (e) { console.error("Error loading officials"); }
    };
    loadOfficials();
  }, []);

  // --- 4. FILTRADO DE FUNCIONARIOS ---
  const filteredOfficials = useMemo(() => {
    // Busca los roles permitidos para este request.type, si no hay, usa DEFAULT
    const allowedRoles = ALLOWED_ROLES_BY_TYPE[request.type] || ALLOWED_ROLES_BY_TYPE['DEFAULT'];
    
    // Filtra la lista completa
    return officials.filter(official => allowedRoles.includes(official.role));
  }, [officials, request.type]);


  const onSubmit = async (values: ManagementValues) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        assignedUserId: values.assignedUserId === "none" ? null : values.assignedUserId,
      };

      await api.patch(`/requests/${request.id}`, payload);
      toast.success("Gestión actualizada correctamente");
      router.refresh();
    } catch (error) {
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
         <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <div className="h-6 w-px bg-slate-300 mx-2" />
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-[#1B2541]">
                        Solicitud {request.publicCode || `#${request.id}`}
                    </h1>
                    <Badge variant="secondary" className="text-[10px]">{request.type}</Badge>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Creado el {format(new Date(request.createdAt), "PPP 'a las' p", { locale: es })}
                </p>
            </div>
         </div>
         <Badge variant={request.status === 'RESOLVED' ? 'default' : 'outline'} className="px-3 py-1 text-sm">
            {request.status}
         </Badge>
      </div>

      {/* --- ALERTA CRÍTICA --- */}
      {request.priority === 'CRITICAL' && isAppUser && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-4 animate-pulse shadow-sm">
            <div className="bg-red-100 p-2 rounded-full">
                <Siren className="h-6 w-6 text-red-600" />
            </div>
            <div>
                <h3 className="text-red-800 font-bold text-lg">Solicitud de CAI Móvil Activa</h3>
                <p className="text-red-600 text-sm mt-1">
                    El ciudadano ha reportado una situación de emergencia desde la App de Seguridad.
                    <br/>
                    <span className="font-semibold">Acción requerida:</span> Contactar al usuario inmediatamente y coordinar con el cuadrante.
                </p>
                {clientData.phone && (
                    <Button 
                        size="sm" 
                        className="mt-3 bg-red-600 hover:bg-red-700 text-white border-none"
                        onClick={() => window.open(`https://wa.me/57${clientData.phone}`, '_blank')}
                    >
                        <MessageCircle className="mr-2 h-4 w-4" /> Contactar Ahora
                    </Button>
                )}
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA (2/3) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. DETALLES DEL TICKET */}
            <Card className="shadow-sm border-l-4 border-l-blue-600">
                <CardHeader>
                    <CardTitle className="text-lg text-[#1B2541]">Detalles del Requerimiento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asunto</span>
                        <p className="text-base font-medium text-slate-900">{request.subject}</p>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</span>
                        <div className="mt-1 p-3 bg-slate-50 rounded-md text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {request.description}
                        </div>
                    </div>
                    {request.type === 'LEGISLATIVE' && request.externalCode && (
                        <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200 text-sm font-mono w-fit">
                            Radicado: <b>{request.externalCode}</b>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. EVIDENCIA Y MAPA */}
            {(evidenceUrl || (lat && lng)) && (
                <Card className="shadow-sm border border-slate-200 bg-slate-50/50">
                    <CardHeader>
                        <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-blue-600" /> Evidencia y Ubicación
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* EVIDENCIA */}
                        {evidenceUrl ? (
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">
                                    {isImage(evidenceUrl) ? "Foto Adjunta" : "Documento"}
                                </span>
                                {isImage(evidenceUrl) ? (
                                    <div className="rounded-lg overflow-hidden border border-slate-200 aspect-video relative group bg-black">
                                        <img 
                                            src={evidenceUrl} 
                                            alt="Evidencia" 
                                            className="w-full h-full object-contain cursor-pointer"
                                            onClick={() => window.open(evidenceUrl, '_blank')}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center">
                                                <ExternalLink className="w-3 h-3 mr-1" /> Ver original
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center bg-white p-6 rounded-lg border border-slate-200 aspect-video text-center shadow-sm">
                                        <FileText className="h-8 w-8 text-blue-500 mb-2" />
                                        <Button variant="outline" size="sm" onClick={() => window.open(evidenceUrl, '_blank')}>
                                            Descargar Archivo
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center bg-slate-100 rounded-lg aspect-video text-slate-400 text-sm flex-col border border-slate-200 border-dashed">
                                <ImageIcon className="h-8 w-8 mb-2 opacity-50"/> Sin adjuntos
                            </div>
                        )}

                        {/* MAPA */}
                        {lat && lng ? (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Geolocalización</span>
                                    <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" className="text-xs text-blue-600 hover:underline flex items-center font-medium">
                                        Abrir Maps <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                </div>
                                <LocationMap lat={lat} lng={lng} />
                                <div className="text-[10px] text-slate-400 font-mono mt-1 px-1">Lat: {lat}, Lng: {lng}</div>
                            </div>
                        ) : (
                             <div className="flex items-center justify-center bg-slate-50 rounded-lg aspect-video text-slate-400 text-sm flex-col border border-slate-200 border-dashed">
                                <MapPin className="h-8 w-8 mb-2 opacity-50"/> Sin ubicación
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 3. PANEL DE GESTIÓN */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card className={`shadow-md border-t-4 ${request.priority === 'CRITICAL' && isAppUser ? 'border-t-red-600' : 'border-t-emerald-600'}`}>
                        <CardHeader className={request.priority === 'CRITICAL' && isAppUser ? 'bg-red-50/30' : 'bg-emerald-50/30'}>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserCog className="h-5 w-5" /> Panel de Gestión
                            </CardTitle>
                            <CardDescription>Actualiza el estado y asigna responsables.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 pt-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* ESTADO */}
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado del Trámite</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="PENDING">🔴 Pendiente</SelectItem>
                                                    <SelectItem value="IN_PROGRESS">🟡 En Progreso</SelectItem>
                                                    <SelectItem value="RESOLVED">🟢 Resuelto</SelectItem>
                                                    <SelectItem value="CLOSED">⚫ Cerrado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* PRIORIDAD */}
                                <FormField
                                    control={form.control}
                                    name="priority"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                Nivel de Prioridad
                                                {field.value === 'CRITICAL' && isAppUser && (
                                                    <AlertTriangle className="h-4 w-4 text-red-500 animate-bounce" />
                                                )}
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="LOW">Baja</SelectItem>
                                                    <SelectItem value="MEDIUM">Media</SelectItem>
                                                    <SelectItem value="HIGH">Alta</SelectItem>
                                                    <SelectItem value="CRITICAL" className="text-red-600 font-bold">
                                                        {isAppUser ? "🚨 CRÍTICA (CAI)" : "CRÍTICA"}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* ASIGNACIÓN (MODIFICADO PARA USAR FILTERED OFFICIALS) */}
                            <FormField
                                control={form.control}
                                name="assignedUserId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Funcionario Responsable ({filteredOfficials.length} disponibles)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">-- Sin Asignar --</SelectItem>
                                                {/* Iteramos sobre filteredOfficials en lugar de officials */}
                                                {filteredOfficials.map((u) => (
                                                    <SelectItem key={u.id} value={u.id}>
                                                        {u.fullName} <span className="text-xs text-slate-400">({u.role})</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* RESPUESTA */}
                            <FormField
                                control={form.control}
                                name="responseComments"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Respuesta Oficial</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Describe la solución brindada..." 
                                                className="min-h-[100px]" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="bg-slate-50 flex justify-end py-4">
                            <Button type="submit" disabled={loading} className="bg-[#1B2541] hover:bg-[#1B2541]/90">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Cambios
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>

        {/* COLUMNA DERECHA (1/3) */}
        <div className="space-y-6">
            
            {/* TARJETA DEL SOLICITANTE */}
            <Card className={`shadow-sm border-t-4 ${isAppUser ? 'border-t-blue-500' : 'border-t-[#FFC400]'}`}>
                <CardHeader>
                    <CardTitle className="text-base text-[#1B2541]">
                        {isAppUser ? 'Ciudadano (App)' : 'Datos del Prospecto'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {clientData.exists ? (
                        <>
                            <div className="flex flex-col items-center text-center">
                                <Avatar className="h-20 w-20 mb-3 border-4 border-slate-100">
                                    <AvatarFallback className="bg-[#1B2541] text-white text-xl">{clientData.initials}</AvatarFallback>
                                </Avatar>
                                <h3 className="font-bold text-lg text-slate-900">{clientData.name}</h3>
                                <p className="text-sm text-slate-500">{clientData.email}</p>
                                
                                {clientData.phone && (
                                    <Button 
                                        variant="outline" 
                                        className={`mt-4 w-full border-green-200 hover:bg-green-50 ${isAppUser ? 'text-green-700' : 'text-slate-700'}`}
                                        onClick={() => window.open(`https://wa.me/57${clientData.phone}`, '_blank')}
                                    >
                                        <MessageCircle className="mr-2 h-4 w-4 text-green-600" /> 
                                        Chat con {isAppUser ? 'Ciudadano' : 'Prospecto'}
                                    </Button>
                                )}
                            </div>

                            <Separator />

                            <div className="space-y-3 text-sm">
                                {request.locality && (
                                    <div className="flex items-start gap-3">
                                        <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-slate-700">Localidad Reportada</p>
                                            <p className="text-slate-500">{request.locality}</p>
                                        </div>
                                    </div>
                                )}
                                
                                {clientData.municipality && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-slate-700">Municipio</p>
                                            <p className="text-slate-500">{clientData.municipality}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <div className="bg-slate-100 p-3 rounded-full w-fit mx-auto mb-3">
                                <User className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-slate-500 italic">Solicitud anónima o sin usuario asociado.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CARD INFO TÉCNICA */}
            <Card className="bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
                <CardContent className="pt-6 space-y-4 text-xs text-slate-500">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>ID Interno:</span> <span className="font-mono">{request.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tipo:</span> <span className="font-medium">{request.type}</span>
                        </div>
                    </div>

                    {request.accessKey && (
                        <>
                            <Separator className="bg-slate-200" />
                            <div className="space-y-2">
                                <span className="font-bold text-slate-700 uppercase block mb-1">Seguimiento Público</span>
                                <Button 
                                    variant="outline" 
                                    className="w-full bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                                    onClick={() => window.open(publicUrl, '_blank')}
                                >
                                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver como Ciudadano
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="w-full h-8"
                                    onClick={handleCopyLink}
                                >
                                    <Copy className="mr-2 h-3.5 w-3.5" /> Copiar Enlace
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}