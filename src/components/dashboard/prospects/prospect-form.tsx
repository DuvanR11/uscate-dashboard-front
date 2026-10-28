'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { calendarDayISO, todayISO } from "@/lib/dates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { usePermission } from "@/hooks/use-permission";
import type { Department, Municipality, SimpleCatalogItem } from "@/lib/api/catalogs";
import type { Leader } from "@/types/prospect";
import { useOrgTerritory } from "@/hooks/use-org-territory";
import { useZones } from "@/hooks/use-zones";
import { pollingStationsApi, type PollingStation } from "@/lib/api/polling-stations";

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
  dataTreatment: z.boolean().default(false),
  
  departmentId: z.string().min(1, "Selecciona un departamento"),
  municipalityId: z.string().min(1, "Selecciona un municipio"), 
  
  occupationId: z.string().min(1, "Selecciona una ocupación"),
  channelId: z.string().min(1, "Selecciona un canal"),
  segmentId: z.string().optional(),
  
  leaderId: z.string().optional(),
  
  // Fase 3: zona dentro del municipio (comuna, barrio, vereda...). Opcional.
  localityId: z.string().optional(),

  tags: z.array(z.number()).default([]),
  votingStation: z.string().optional(),
  votingTable: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Análisis de punta a punta (2026-10-27, CRM-03): la autorización de datos es
// obligatoria al CREAR un contacto. Al editar no: antes había que marcarla para
// guardar cualquier cambio y quedaba registrada una autorización con fecha que
// la persona nunca dio.
const createSchema = formSchema.refine((values) => values.dataTreatment === true, {
  message: "Debes confirmar la autorización de tratamiento de datos",
  path: ["dataTreatment"],
});

// Valor del selector para "sin zona" (Radix no admite un valor vacío).
const NO_ZONE = "none";

/** Compara nombres de puesto sin tildes, mayúsculas, signos ni espacios. */
const stationKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]/g, "");

// Forma real de un prospecto para EDITAR (distinta de `Prospect` en
// `types/prospect.ts`, pensado para la tabla/lista — este formulario
// necesita los ids crudos de cada catálogo, no solo el objeto anidado).
interface ProspectEditData {
  id: string;
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  dataTreatment?: boolean;
  municipalityId?: number | string;
  municipality?: { departmentId?: number };
  localityId?: number | null;
  locality?: { id: number; name: string } | null;
  occupationId?: number | string;
  channelId?: number | string;
  segmentId?: number | string;
  leaderId?: string | null;
  leader?: Leader | null;
  voteConfirmed?: boolean;
  tags?: { id: number }[];
  votingStation?: string;
  votingTable?: string;
}

interface ProspectFormProps {
  initialData?: ProspectEditData;
}

export function ProspectForm({ initialData }: ProspectFormProps) {
  const router = useRouter();
  const { user } = useAuthStore(); 
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  
  // Estados para catálogos
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [occupations, setOccupations] = useState<SimpleCatalogItem[]>([]);
  const [channels, setChannels] = useState<SimpleCatalogItem[]>([]);
  const [segments, setSegments] = useState<SimpleCatalogItem[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [availableTags, setAvailableTags] = useState<SimpleCatalogItem[]>([]);

  // Fase 3 "Territorio para cualquier municipio": zonas y puestos de votación
  // de la organización, y su territorio para proponer departamento y municipio.
  const { territory, loaded: territoryLoaded } = useOrgTerritory();
  const { zones } = useZones();
  const [stations, setStations] = useState<PollingStation[]>([]);

  const isGlobalAdmin = usePermission('PROSPECTOS_GLOBAL', 'canWrite');
  const canWrite = usePermission('PROSPECTOS', 'canWrite') || isGlobalAdmin;
  // Análisis de punta a punta (2026-10-27, CRM-01): elige el líder quien ve
  // todos los contactos (el mismo criterio del servidor: `PROSPECTOS_GLOBAL`
  // lectura). Antes se decidía con la escritura global y, al editar, a
  // Secretaría el formulario le mandaba su propio id como líder del contacto.
  const canChooseLeader = usePermission('PROSPECTOS_GLOBAL', 'canRead');

  // --- EFECTO DE SEGURIDAD PBAC ---
  useEffect(() => {
    if (!canWrite) {
        toast.error('Acceso denegado', { description: 'No tienes permiso para crear o editar contactos.' });
        setHasPermission(false);
        router.push('/prospects'); 
    }
  }, [canWrite, router]);

  const title = initialData ? "Editar contacto" : "Nuevo contacto";
  const action = initialData ? "Guardar Cambios" : "Crear contacto";

  const defaultDepartmentId = initialData?.municipality?.departmentId 
    ? initialData.municipality.departmentId.toString() 
    : "";

  // Determinar valor inicial del Padrino
  // Si edito -> El que tiene. Si creo y puedo elegir -> Vacío. Si creo y NO puedo elegir -> Mi ID.
  const defaultLeaderId = initialData
    ? initialData.leaderId || undefined
    : !canChooseLeader ? user?.id : undefined;

  const form = useForm({
    resolver: zodResolver(initialData ? formSchema : createSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      documentNumber: initialData?.documentNumber || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      address: initialData?.address || "",
      // CRM-08: el día tal cual lo guardó el servidor. Antes se leía en la hora
      // de Colombia y la medianoche UTC se volvía el día anterior en cada guardado.
      birthDate: calendarDayISO(initialData?.birthDate),
      dataTreatment: initialData?.dataTreatment || false,
      
      departmentId: defaultDepartmentId,
      municipalityId: initialData?.municipalityId?.toString() || "",
      localityId: initialData?.localityId ? String(initialData.localityId) : NO_ZONE,
      occupationId: initialData?.occupationId?.toString() || "",
      channelId: initialData?.channelId?.toString() || "",
      segmentId: initialData?.segmentId?.toString() || "",
      
      leaderId: defaultLeaderId, 
      voteConfirmed: initialData?.voteConfirmed || false,
      
      tags: initialData?.tags ? initialData.tags.map((t) => t.id) : [],
      votingStation: initialData?.votingStation || "",
      votingTable: initialData?.votingTable || "",
    },
  });

  const selectedDepartmentId = form.watch("departmentId");
  const typedStation = form.watch("votingStation") ?? "";

  // Un contacto NUEVO arranca con el departamento y el municipio de la
  // organización (antes había que elegirlos en cada alta). Solo si la persona
  // aún no eligió nada, y solo cuando la lista de departamentos ya cargó: si
  // el valor se pone antes, la lista desplegable todavía no tiene esa opción,
  // avisa un cambio a "vacío" y la propuesta se perdía (así llegó a
  // producción: el formulario abría con "Seleccione…").
  useEffect(() => {
    if (initialData || !territoryLoaded || !territory.departmentId) return;
    if (departments.length === 0) return;
    if (form.getValues("departmentId")) return;
    form.setValue("departmentId", String(territory.departmentId));
    if (territory.municipalityId) {
      form.setValue("municipalityId", String(territory.municipalityId));
    }
  }, [initialData, territoryLoaded, territory, departments.length, form]);

  // Catálogo de puestos de votación (para sugerir mientras se escribe).
  useEffect(() => {
    if (!hasPermission) return;
    let cancelled = false;
    pollingStationsApi
      .list()
      .then((data) => {
        if (!cancelled) setStations(Array.isArray(data) ? data : []);
      })
      // Sin catálogo el puesto sigue siendo texto libre, como siempre.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hasPermission]);

  // Si el contacto que se edita tiene una zona que ya no está en la lista,
  // se conserva como opción para no perderla al guardar.
  const currentZone = initialData?.locality ?? null;
  const zoneOptions =
    currentZone && !zones.some((zone) => zone.id === currentZone.id)
      ? [currentZone, ...zones]
      : zones;
  const stationInCatalog =
    typedStation.trim() !== "" &&
    stations.some((station) => stationKey(station.name) === stationKey(typedStation));

  // Efecto para asegurar que si el usuario carga tarde, se asigne el ID
  useEffect(() => {
    if (!canChooseLeader && user?.id && !initialData) {
        form.setValue('leaderId', user.id);
    }
  }, [user, canChooseLeader, initialData, form]);

  // Si el líder actual del contacto no viene en la lista (otro rol), se
  // conserva como opción para que el selector lo muestre.
  const currentLeader = initialData?.leader ?? null;
  const leaderOptions =
    currentLeader && !leaders.some((leader) => leader.id === currentLeader.id)
      ? [currentLeader, ...leaders]
      : leaders;

  // 1. Cargar Catálogos Iniciales
  useEffect(() => {
    if (!hasPermission) return; // No cargar datos si no tiene permiso

    const loadCatalogs = async () => {
      try {
        const promises = [
          api.get('/locations/departments'),
          api.get('/catalogs/occupations'),
          api.get('/catalogs/channels'),
          api.get('/catalogs/segments'),
          api.get('/catalogs/tags')
        ];

        // Solo cargamos los líderes si puede elegir. CRM-06: antes salían de
        // `GET /users` (exige USUARIOS: a Secretaría le daba 403) y sin
        // `limit` llegaban solo 10.
        if (canChooseLeader) {
            promises.push(api.get('/prospects/leader-options'));
        }

        const results = await Promise.all(promises);

        setDepartments(results[0].data || []);
        setOccupations(results[1].data || []);
        setChannels(results[2].data || []);
        setSegments(results[3].data || []);
        setAvailableTags(results[4].data || []);

        if (canChooseLeader && results[5]) {
            setLeaders(results[5].data || []);
        }
      } catch (error) {
        console.error("Error cargando catálogos", error);
        toast.error("Error cargando listas desplegables");
      }
    };
    loadCatalogs();
  }, [canChooseLeader, hasPermission]);

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
        } catch {
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
      const { departmentId, tags, leaderId, dataTreatment, ...formValues } = values;
      // Al editar, un campo que se dejó vacío se borra (`null`); al crear no se envía.
      const emptyValue = initialData ? null : undefined;

      const payload = {
        ...formValues,
        municipalityId: parseInt(values.municipalityId),
        occupationId: parseInt(values.occupationId),
        channelId: parseInt(values.channelId),
        segmentId: values.segmentId ? parseInt(values.segmentId) : undefined,
        // Zona: al editar, "sin zona" la quita; al crear simplemente no se envía.
        localityId:
          values.localityId && values.localityId !== NO_ZONE
            ? parseInt(values.localityId)
            : initialData
              ? null
              : undefined,
        // CRM-08: el día tal cual (AAAA-MM-DD); el servidor lo guarda a mediodía de Colombia.
        birthDate: values.birthDate || emptyValue,

        // CRM-01: al editar, el líder solo viaja si quien edita puede elegirlo
        // y lo cambió. Al crear, quien no elige queda como líder (el servidor
        // también lo exige).
        leaderId: initialData
          ? canChooseLeader && leaderId && leaderId !== initialData.leaderId
            ? leaderId
            : undefined
          : canChooseLeader
            ? leaderId || undefined
            : user?.id,

        // CRM-03: al crear la autorización es obligatoria (la valida el
        // formulario); al editar solo viaja si la persona AHORA autorizó.
        dataTreatment: initialData
          ? !initialData.dataTreatment && dataTreatment
            ? true
            : undefined
          : dataTreatment,

        // Al editar, dejarlo vacío borra el puesto (antes no se podía quitar).
        // El backend lo enlaza con el catálogo si el nombre coincide.
        votingStation: initialData
          ? (values.votingStation ?? "").trim()
          : values.votingStation?.trim() || undefined,
        votingTable: values.votingTable || undefined,
        // CRM-08: al editar, dejarlos vacíos los borra (antes no se podía).
        email: values.email === "" ? emptyValue : values.email,
        phone: values.phone === "" ? emptyValue : values.phone,
        documentNumber: values.documentNumber === "" ? emptyValue : values.documentNumber,
        tagIds: tags, 
      };

      if (initialData) {
        await api.patch(`/prospects/${initialData.id}`, payload);
        toast.success("Contacto actualizado");
      } else {
        await api.post("/prospects", payload);
        toast.success("Contacto creado");
      }
      
      router.push("/prospects"); 
      router.refresh();
      
    } catch (error: unknown) {
      console.error(error);

      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;

      toast.error("Ocurrió un error al guardar", {
        description: Array.isArray(msg) ? msg.join(', ') : msg || "No se pudo guardar el contacto.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission) return null;

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
         <div className="flex items-center gap-3">
            <div className="p-3 bg-primary rounded-xl shadow-lg shadow-blue-900/20">
                <User className="h-6 w-6 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">{title}</h2>
                <p className="text-sm text-slate-500 font-medium">
                    Gestión de base de datos ciudadana.
                </p>
            </div>
         </div>
         <Button variant="outline" onClick={() => router.back()} className="border-primary text-primary hover:bg-slate-50">
             <ArrowLeft className="mr-2 h-4 w-4" /> Volver
         </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* 1. INFO PERSONAL */}
          <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-all">
             <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
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
                      <FormControl><Input placeholder="Juan Carlos" {...field} className="focus-visible:ring-primary" /></FormControl>
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
                      <FormControl><Input placeholder="Pérez López" {...field} className="focus-visible:ring-primary" /></FormControl>
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
                      <FormControl><Input placeholder="123456789" {...field} className="focus-visible:ring-primary" /></FormControl>
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
                      <FormControl><Input placeholder="3001234567" type="number" {...field} className="focus-visible:ring-primary" /></FormControl>
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
                      <FormControl><Input placeholder="juan@ejemplo.com" {...field} className="focus-visible:ring-primary" /></FormControl>
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
                      <FormControl><Input type="date" max={todayISO()} {...field} className="focus-visible:ring-primary" /></FormControl>
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
                      <FormControl><Input placeholder="Cra 5 # 10-20, Barrio Centro" {...field} className="focus-visible:ring-primary" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </CardContent>
          </Card>

          {/* 2. PERFILAMIENTO */}
          <Card className="border-t-4 border-t-secondary shadow-sm hover:shadow-md transition-all">
             <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-secondary" />
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
                            // La lista avisa "" cuando su valor todavía no
                            // tiene opción cargada: no es una elección.
                            if (!val || val === field.value) return;
                            field.onChange(val);
                            form.setValue("municipalityId", "");
                        }}
                        value={field.value}
                      >
                        <FormControl><SelectTrigger className="focus:ring-secondary"><SelectValue placeholder="Selecciona…" /></SelectTrigger></FormControl>
                        <SelectContent>
                           {departments.map((d) => (
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
                        onValueChange={(val) => {
                          if (val) field.onChange(val);
                        }}
                        value={field.value}
                        disabled={!selectedDepartmentId || municipalities.length === 0}
                      >
                        <FormControl><SelectTrigger className="focus:ring-secondary"><SelectValue placeholder="Selecciona…" /></SelectTrigger></FormControl>
                        <SelectContent>
                           {municipalities.map((m) => (
                             <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ZONA (comuna, barrio, vereda...) — solo si la organización tiene zonas */}
                {zoneOptions.length > 0 && (
                <FormField
                  control={form.control}
                  name="localityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Zona</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || NO_ZONE}>
                        <FormControl><SelectTrigger className="focus:ring-secondary"><SelectValue placeholder="Sin zona" /></SelectTrigger></FormControl>
                        <SelectContent>
                           <SelectItem value={NO_ZONE}>Sin zona</SelectItem>
                           {zoneOptions.map((zone) => (
                             <SelectItem key={zone.id} value={zone.id.toString()}>{zone.name}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                )}

                <FormField
                  control={form.control}
                  name="occupationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700">Ocupación *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="focus:ring-secondary"><SelectValue placeholder="Selecciona…" /></SelectTrigger></FormControl>
                        <SelectContent>
                           {occupations.map((o) => (
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
                        <FormControl><SelectTrigger className="focus:ring-secondary"><SelectValue placeholder="Selecciona…" /></SelectTrigger></FormControl>
                        <SelectContent>
                           {channels.map((c) => (
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
                        <FormControl><SelectTrigger className="focus:ring-secondary"><SelectValue placeholder="Selecciona…" /></SelectTrigger></FormControl>
                        <SelectContent>
                           {segments.map((s) => (
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
                      
                      {canChooseLeader ? (
                        /* Si puede elegir el líder, mostramos el Select */
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            {/* Fase 4 del análisis de punta a punta (2026-10-28, TRV-21): si el
                                líder guardado no está en la lista, la casilla queda sin texto. */}
                            <FormControl>
                                <SelectTrigger className="focus:ring-secondary" aria-label="Líder o padrino">
                                    <SelectValue placeholder="Asignar líder…" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {leaderOptions.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>{l.fullName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      ) : (
                        /* Si no, un Input deshabilitado: al editar, el líder que ya
                           tiene (no cambia); al crear, quien lo registra. */
                        <div className="relative">
                            <FormControl>
                                <Input
                                    disabled
                                    value={
                                      initialData
                                        ? currentLeader?.fullName || "Sin asignar"
                                        : user?.fullName || "Yo (Autoasignado)"
                                    }
                                    className="bg-slate-100 font-bold text-slate-600 cursor-not-allowed"
                                />
                            </FormControl>
                            <input type="hidden" {...field} value={field.value || ""} />
                        </div>
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
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
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
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
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
                      <FormControl>
                        <Input
                          placeholder={stations.length > 0 ? "Escribe para buscar en tu catálogo" : "Ej: Institución Educativa Normal Superior"}
                          list={stations.length > 0 ? "polling-stations-list" : undefined}
                          autoComplete="off"
                          {...field}
                          className="focus-visible:ring-[#E11D48]"
                        />
                      </FormControl>
                      {stations.length > 0 && (
                        <>
                          <datalist id="polling-stations-list">
                            {stations.map((station) => (
                              <option key={station.id} value={station.name}>
                                {station.zoneName ?? station.address ?? ""}
                              </option>
                            ))}
                          </datalist>
                          {typedStation.trim() !== "" && (
                            <FormDescription>
                              {stationInCatalog
                                ? "Está en tu catálogo de puestos: el contacto queda enlazado."
                                : "No está en tu catálogo de puestos: se guarda como texto."}
                            </FormDescription>
                          )}
                        </>
                      )}
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

          {/* --- 5. NUEVA SECCIÓN: VERIFICACIÓN (SOLO ADMINS GLOBALES) --- */}
            {isGlobalAdmin && (
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
                                        <div className="flex items-center space-x-2">
                                            <FormControl>
                                            <input
                                                type="checkbox"
                                                checked={field.value}
                                                onChange={field.onChange}
                                                className="h-6 w-6 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer accent-emerald-600"
                                            />
                                            </FormControl>
                                            <span className="text-sm font-medium text-emerald-900">
                                                {field.value ? "VERIFICADO" : "PENDIENTE"}
                                            </span>
                                        </div>
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
                        // CRM-03: una autorización ya registrada no se quita
                        // desde aquí (no viajaría); la persona la retira desde «Mis datos» (Habeas Data).
                        disabled={!!initialData?.dataTreatment}
                        className="data-[state=checked]:bg-primary border-slate-400"
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel className="font-bold text-primary text-base">
                        Autorización de Tratamiento de Datos Personales
                        </FormLabel>
                        <FormDescription className="text-slate-600">
                        {initialData?.dataTreatment
                          ? "Esta persona ya autorizó el uso de sus datos. Si quiere retirarla, debe pedirlo en «Mis datos»; la solicitud llega a Habeas Data."
                          : "Confirmo que el ciudadano ha autorizado el uso de sus datos para fines de campaña política conforme a la Ley 1581 de 2012."}
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
             <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 min-w-[180px] font-bold text-white shadow-lg shadow-blue-900/20">
               {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
               {action}
             </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}