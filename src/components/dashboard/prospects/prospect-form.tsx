'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store"; // <--- 1. IMPORTAR STORE

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { 
  Loader2, ArrowLeft, Save, User, MapPin, Phone, Mail, Calendar, 
  Briefcase, Hash, Flag, Tag, 
  ShieldCheck
} from "lucide-react";

// Esquema de Validación
const formSchema = z.object({
  firstName: z.string().min(2, "Requerido"),
  lastName: z.string().min(2, "Requerido"),
  documentNumber: z.string().optional(),
  email: z.string().email("Inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  birthDate: z.string().optional(), 
  voteConfirmed: z.boolean().default(false),
  dataTreatment: z.boolean().default(false).refine(val => val === true, "Debe aceptar el tratamiento de datos"),
  
  departmentId: z.string().min(1, "Selecciona un departamento"),
  municipalityId: z.string().min(1, "Selecciona un municipio"), 
  
  occupationId: z.string().min(1, "Selecciona una ocupación"),
  channelId: z.string().min(1, "Selecciona un canal"),
  segmentId: z.string().optional(),
  
  // leaderId ahora es opcional en validación porque si es leader lo inyectamos
  leaderId: z.string().optional(),
  
  tags: z.array(z.number()).default([]),
  votingStation: z.string().optional(),
  votingTable: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProspectFormProps {
  initialData?: any; 
}

export function ProspectForm({ initialData }: ProspectFormProps) {
  const router = useRouter();
  const { user } = useAuthStore(); // <--- 2. OBTENER USUARIO ACTUAL
  const [loading, setLoading] = useState(false);
  
  // Estados para catálogos
  const [departments, setDepartments] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [occupations, setOccupations] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  // Lógica de Roles
  const roleCode = user?.role?.code || '';
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(roleCode);

  const title = initialData ? "Editar Prospecto" : "Nuevo Prospecto";
  const action = initialData ? "Guardar Cambios" : "Crear Prospecto";

  const defaultDepartmentId = initialData?.municipality?.departmentId 
    ? initialData.municipality.departmentId.toString() 
    : "";

  // Determinar valor inicial del Padrino
  // Si edito -> El que viene. Si creo y soy admin -> Vacio. Si creo y soy Lider -> Mi ID.
  const defaultLeaderId = initialData?.leaderId || (!isAdmin ? user?.id : "");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      documentNumber: initialData?.documentNumber || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      address: initialData?.address || "",
      birthDate: initialData?.birthDate ? format(new Date(initialData.birthDate), 'yyyy-MM-dd') : "",
      dataTreatment: initialData?.dataTreatment || false,
      
      departmentId: defaultDepartmentId,
      municipalityId: initialData?.municipalityId?.toString() || "",
      occupationId: initialData?.occupationId?.toString() || "",
      channelId: initialData?.channelId?.toString() || "",
      segmentId: initialData?.segmentId?.toString() || "",
      
      // Aplicamos la lógica del Padrino
      leaderId: defaultLeaderId, 
      voteConfirmed: initialData?.voteConfirmed || false,
      
      tags: initialData?.tags ? initialData.tags.map((t: any) => t.id) : [],
      votingStation: initialData?.votingStation || "",
      votingTable: initialData?.votingTable || "",
    },
  });

  const selectedDepartmentId = form.watch("departmentId");

  // Efecto para asegurar que si el usuario carga tarde, se asigne el ID
  useEffect(() => {
    if (!isAdmin && user?.id && !initialData) {
        form.setValue('leaderId', user.id);
    }
  }, [user, isAdmin, initialData, form]);

  // 1. Cargar Catálogos Iniciales
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const promises = [
          api.get('/locations/departments'),
          api.get('/catalogs/occupations'),
          api.get('/catalogs/channels'),
          api.get('/catalogs/segments'),
          api.get('/catalogs/tags')
        ];

        // Solo cargamos la lista completa de usuarios si es Admin
        if (isAdmin) {
            promises.push(api.get('/users?roles=LEADER')); 
        }

        const results = await Promise.all(promises);

        setDepartments(results[0].data || []);
        setOccupations(results[1].data || []);
        setChannels(results[2].data || []);
        setSegments(results[3].data || []);
        setAvailableTags(results[4].data || []);
        
        if (isAdmin && results[5]) {
            setLeaders(results[5].data.data || []);
        }
      } catch (error) {
        console.error("Error cargando catálogos", error);
        toast.error("Error cargando listas desplegables");
      }
    };
    loadCatalogs();
  }, [isAdmin]); // Dependencia isAdmin

  // 2. Cargar Municipios en cascada
  useEffect(() => {
    const loadMunicipalities = async () => {
        if (!selectedDepartmentId) {
            setMunicipalities([]);
            return;
        }
        try {
            const response = await api.get(`/locations/municipalities/${selectedDepartmentId}`);
            setMunicipalities(response.data || []);
        } catch (error) {
            console.error("Error cargando municipios");
            setMunicipalities([]);
        }
    };
    loadMunicipalities();
  }, [selectedDepartmentId]);

  const toggleTag = (tagId: number) => {
      const currentTags = form.getValues("tags") || [];
      if (currentTags.includes(tagId)) {
          form.setValue("tags", currentTags.filter(id => id !== tagId));
      } else {
          form.setValue("tags", [...currentTags, tagId]);
      }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { departmentId, tags, ...formValues } = values;

      const payload = {
        ...formValues,
        municipalityId: parseInt(values.municipalityId),
        occupationId: parseInt(values.occupationId),
        channelId: parseInt(values.channelId),
        segmentId: values.segmentId ? parseInt(values.segmentId) : undefined,
        birthDate: values.birthDate ? new Date(values.birthDate).toISOString() : undefined,
        
        // Si no es admin, forzamos el ID del usuario actual por seguridad (aunque ya vaya en formValues)
        leaderId: isAdmin ? values.leaderId : user?.id,
        
        votingStation: values.votingStation || undefined,
        votingTable: values.votingTable || undefined,
        email: values.email === "" ? undefined : values.email,
        phone: values.phone === "" ? undefined : values.phone,
        documentNumber: values.documentNumber === "" ? undefined : values.documentNumber,
        tagIds: tags, 
      };

      if (initialData) {
        await api.patch(`/prospects/${initialData.id}`, payload);
        toast.success("Prospecto actualizado");
      } else {
        await api.post("/prospects", payload);
        toast.success("Prospecto creado exitosamente");
      }
      
      router.push("/prospects"); 
      router.refresh();
      
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message;
      if (typeof msg === 'string' && msg.includes('Unique constraint')) {
          toast.error("Ya existe un registro con ese documento o correo.");
      } else {
          toast.error("Ocurrió un error al guardar");
      }
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
                <User className="h-6 w-6 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-black tracking-tight text-[#1B2541]">{title}</h2>
                <p className="text-sm text-slate-500 font-medium">
                    Gestión de base de datos ciudadana.
                </p>
            </div>
         </div>
         <Button variant="outline" onClick={() => router.back()} className="border-[#1B2541] text-[#1B2541] hover:bg-slate-50">
             <ArrowLeft className="mr-2 h-4 w-4" /> Volver
         </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* 1. INFO PERSONAL */}
          <Card className="border-t-4 border-t-[#1B2541] shadow-sm hover:shadow-md transition-all">
             <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-[#1B2541] flex items-center gap-2">
                    <User className="h-5 w-5 text-[#1B2541]" />
                    Información Personal
                </CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-semibold">Nombres *</FormLabel>
                      <FormControl><Input placeholder="Juan Carlos" {...field} className="focus-visible:ring-[#1B2541]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-semibold">Apellidos *</FormLabel>
                      <FormControl><Input placeholder="Pérez López" {...field} className="focus-visible:ring-[#1B2541]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-semibold flex items-center gap-1">
                          <Hash className="h-3 w-3" /> Cédula
                      </FormLabel>
                      <FormControl><Input placeholder="123456789" {...field} className="focus-visible:ring-[#1B2541]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-semibold flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Celular / WhatsApp
                      </FormLabel>
                      <FormControl><Input placeholder="3001234567" type="number" {...field} className="focus-visible:ring-[#1B2541]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-semibold flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Correo Electrónico
                      </FormLabel>
                      <FormControl><Input placeholder="juan@ejemplo.com" {...field} className="focus-visible:ring-[#1B2541]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-semibold flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Fecha Nacimiento
                      </FormLabel>
                      <FormControl><Input type="date" {...field} className="focus-visible:ring-[#1B2541]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel className="text-slate-600 font-semibold flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Dirección
                      </FormLabel>
                      <FormControl><Input placeholder="Cra 5 # 10-20, Barrio Centro" {...field} className="focus-visible:ring-[#1B2541]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </CardContent>
          </Card>

          {/* 2. PERFILAMIENTO */}
          <Card className="border-t-4 border-t-[#FFC400] shadow-sm hover:shadow-md transition-all">
             <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-[#1B2541] flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-[#FFC400]" />
                    Perfilamiento y Origen
                </CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                
                {/* DEPARTAMENTO */}
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Departamento *</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("municipalityId", ""); 
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl><SelectTrigger className="focus:ring-[#FFC400]"><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                           {departments.map((d: any) => (
                             <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* MUNICIPIO */}
                <FormField
                  control={form.control}
                  name="municipalityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Municipio *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value} 
                        disabled={!selectedDepartmentId || municipalities.length === 0}
                      >
                        <FormControl><SelectTrigger className="focus:ring-[#FFC400]"><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                           {municipalities.map((m: any) => (
                             <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Ocupación *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="focus:ring-[#FFC400]"><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                           {occupations.map((o: any) => (
                             <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="channelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Canal de Contacto *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="focus:ring-[#FFC400]"><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                           {channels.map((c: any) => (
                             <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="segmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Segmento Poblacional</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="focus:ring-[#FFC400]"><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                           {segments.map((s: any) => (
                             <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* --- CAMPO PADRINO / LÍDER (CONDICIONAL) --- */}
                <FormField
                  control={form.control}
                  name="leaderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Líder / Padrino</FormLabel>
                      
                      {isAdmin ? (
                        /* Si es Admin, mostramos el Select */
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="focus:ring-[#FFC400]">
                                    <SelectValue placeholder="Asignar líder..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {leaders.map((l: any) => (
                                    <SelectItem key={l.id} value={l.id}>{l.fullName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      ) : (
                        /* Si es Leader, mostramos un Input deshabilitado con su nombre */
                        <FormControl>
                            <div className="relative">
                                <Input 
                                    disabled 
                                    value={user?.fullName || "Yo (Autosignado)"} 
                                    className="bg-slate-100 font-bold text-slate-600 cursor-not-allowed"
                                />
                                <input type="hidden" {...field} value={user?.id || ""} />
                            </div>
                        </FormControl>
                      )}
                      
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </CardContent>
          </Card>

          {/* 3. TAGS */}
          <Card className="border-t-4 border-t-emerald-600 shadow-sm hover:shadow-md transition-all">
             <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-[#1B2541] flex items-center gap-2">
                    <Tag className="h-5 w-5 text-emerald-600" />
                    Intereses y Etiquetas
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="font-semibold text-slate-700">Selecciona los temas de interés:</FormLabel>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => {
                           const isSelected = field.value?.includes(tag.id);
                           return (
                             <div 
                               key={tag.id}
                               onClick={() => toggleTag(tag.id)}
                               className={cn(
                                 "cursor-pointer px-4 py-2 rounded-full border text-sm font-medium transition-all select-none",
                                 isSelected 
                                   ? "bg-emerald-600 text-white border-emerald-600 shadow-md hover:bg-emerald-700" 
                                   : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50"
                               )}
                             >
                               {tag.name}
                             </div>
                           );
                        })}
                        {availableTags.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No hay etiquetas creadas en el sistema.</p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </CardContent>
          </Card>

          {/* 4. LOGÍSTICA */}
          <Card className="border-t-4 border-t-[#E11D48] shadow-sm hover:shadow-md transition-all">
             <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-[#1B2541] flex items-center gap-2">
                    <Flag className="h-5 w-5 text-[#E11D48]" />
                    Logística Día D
                </CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <FormField
                  control={form.control}
                  name="votingStation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Puesto de Votación</FormLabel>
                      <FormControl><Input placeholder="Ej: Institución Educativa Normal Superior" {...field} className="focus-visible:ring-[#E11D48]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="votingTable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Mesa de Votación</FormLabel>
                      <FormControl><Input placeholder="Ej: Mesa 14" {...field} className="focus-visible:ring-[#E11D48]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </CardContent>
          </Card>

          {/* --- 5. NUEVA SECCIÓN: VERIFICACIÓN (SOLO ADMINS) --- */}
            {isAdmin && (
                <Card className="border-t-4 border-t-emerald-600 shadow-lg bg-emerald-50/30 border-emerald-100">
                    <CardHeader className="pb-2 border-b border-emerald-100/50">
                        <CardTitle className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            Verificación de Voto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <FormField
                            control={form.control}
                            name="voteConfirmed"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-emerald-200 p-4 bg-white shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base font-bold text-emerald-900">
                                            Confirmar Voto Asegurado
                                        </FormLabel>
                                        <FormDescription className="text-emerald-700/80">
                                            Marcar esta opción solo si se ha contactado y confirmado la intención de voto.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <div className="flex items-center space-x-2">
                                            <input 
                                                type="checkbox"
                                                checked={field.value}
                                                onChange={field.onChange}
                                                className="h-6 w-6 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer accent-emerald-600"
                                            />
                                            <span className="text-sm font-medium text-emerald-900">
                                                {field.value ? "VERIFICADO" : "PENDIENTE"}
                                            </span>
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            )}

          {/* CHECKBOX LEGAL */}
          <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
            <CardContent className="pt-6">
                <FormField
                control={form.control}
                name="dataTreatment"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-[#1B2541] border-slate-400"
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel className="font-bold text-[#1B2541] text-base">
                        Autorización de Tratamiento de Datos Personales
                        </FormLabel>
                        <FormDescription className="text-slate-600">
                        Confirmo que el ciudadano ha autorizado el uso de sus datos para fines de campaña política conforme a la Ley 1581 de 2012.
                        </FormDescription>
                        <FormMessage />
                    </div>
                    </FormItem>
                )}
                />
            </CardContent>
          </Card>

          {/* FOOTER */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-end gap-4 z-50 shadow-2xl md:static md:bg-transparent md:border-0 md:p-0 md:shadow-none">
             <Button type="button" variant="outline" onClick={() => router.back()} className="border-slate-300 hover:bg-slate-100">
               Cancelar
             </Button>
             <Button type="submit" disabled={loading} className="bg-[#1B2541] hover:bg-[#1B2541]/90 min-w-[180px] font-bold text-white shadow-lg shadow-blue-900/20">
               {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
               {action}
             </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}