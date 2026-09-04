'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import {
  Loader2, Save, MapPin, Smartphone, CreditCard, User,
  Mail, Lock, Shield, Info, Briefcase, Share2, Facebook, Instagram, Video,
  Youtube, Twitter, Key
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { User as UserType } from "@/types/user";
import { getPermissionModules, PermissionModule } from "@/lib/api/permissions";
import { getRoles, getRolePermissions, Role, PermissionSource } from "@/lib/api/roles";
import {
  PermissionChecklist,
  PermissionRow,
  flattenModules,
  buildPermissionsForModules,
} from "@/components/shared/permission-checklist";

// --- COMPONENTES UI ---
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>{children}</div>
);
const CardHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
  <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
    <div className="bg-primary/10 p-2 rounded-lg text-primary">
      <Icon className="w-5 h-5" />
    </div>
    <h3 className="text-base font-bold text-primary uppercase tracking-wide">
      {title}
    </h3>
  </div>
);
const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6">{children}</div>
);

// --- CONSTANTES ---
// Descripciones estáticas por código de rol. Solo texto de UI: si el catálogo
// real de `GET /roles` trae un `code` que no está en este mapa, se muestra un
// texto genérico (ver `currentRoleInfo` abajo) en vez de romper el formulario.
const ROLE_INFO: Record<string, { title: string; desc: string }> = {
  'SUPER_ADMIN': { title: 'Control Total', desc: 'Acceso irrestricto a configuración, usuarios y reportes financieros.' },
  'ADMIN': { title: 'Administrador', desc: 'Gestión de usuarios y campañas, sin acceso a configuración crítica.' },
  'SECRETARY': { title: 'Secretaría', desc: 'Gestión de agenda, recepción de solicitudes y validación de datos.' },
  'LEADER': { title: 'Líder Territorial', desc: 'Encargado de captar votos, gestionar su zona y cumplir metas.' },
  'LEGISLATIVE': { title: 'Equipo Legislativo', desc: 'Abogados y asesores encargados de trámites y proyectos.' },
  'CITIZEN': { title: 'Ciudadano', desc: 'Usuario final de la App. Solo puede reportar incidencias.' },
  'BUHO': { title: 'Búho Digital', desc: 'Activista digital encargado de misiones en redes sociales.' },
  'RECOLECTOR': { title: 'Recolector / Volanteo', desc: 'Personal de campo encargado de recolección de firmas y publicidad.' },
};

// Emoji puramente decorativo para el selector de roles. No condiciona qué
// roles aparecen en la lista (eso lo determina `GET /roles`) — si un código
// no está aquí, se usa el genérico.
const ROLE_EMOJI: Record<string, string> = {
  'SUPER_ADMIN': '👑',
  'ADMIN': '🛡️',
  'SECRETARY': '📋',
  'LEADER': '🤝',
  'LEGISLATIVE': '⚖️',
  'CITIZEN': '📱',
  'BUHO': '🦉',
  'RECOLECTOR': '🗳️',
};
const DEFAULT_ROLE_EMOJI = '🔑';

const LOCALIDADES = [
  { id: 1, name: "Usaquén" }, { id: 2, name: "Chapinero" }, { id: 3, name: "Santa Fe" },
  { id: 4, name: "San Cristóbal" }, { id: 5, name: "Usme" }, { id: 6, name: "Tunjuelito" },
  { id: 7, name: "Bosa" }, { id: 8, name: "Kennedy" }, { id: 9, name: "Fontibón" },
  { id: 10, name: "Engativá" }, { id: 11, name: "Suba" }, { id: 12, name: "Barrios Unidos" },
  { id: 13, name: "Teusaquillo" }, { id: 14, name: "Los Mártires" }, { id: 15, name: "Antonio Nariño" },
  { id: 16, name: "Puente Aranda" }, { id: 17, name: "La Candelaria" }, { id: 18, name: "Rafael Uribe Uribe" },
  { id: 19, name: "Ciudad Bolívar" }, { id: 20, name: "Sumapaz" }
];

// `PermissionRow`, `flattenModules` y `buildPermissionsForModules` viven en
// `@/components/shared/permission-checklist` (compartidos con el editor de
// plantillas de rol en `/roles/[id]`) — ver import de arriba.

const formSchema = z.object({
  fullName: z.string().min(3, "Mínimo 3 caracteres"),
  address: z.string().min(3, "Mínimo 6 caracteres"),
  email: z.string().email("Correo inválido"),
  role: z.string().min(1, "Rol requerido"),
  documentNumber: z.string().min(5, "Documento requerido"),
  phone: z.string().min(10, "Mínimo 10 dígitos").max(10, "Máximo 10 dígitos"),
  locality: z.string().min(1, "Localidad requerida"),
  birthDate: z.string().min(1, "Fecha de nacimiento requerida"),
  requestsGoal: z.coerce.number().min(0).default(0),
  password: z.string().optional(),

  facebookUser: z.string().optional(),
  instagramUser: z.string().optional(),
  tiktokUser: z.string().optional(),
  youtubeUser: z.string().optional(),
  xUser: z.string().optional(),

  permissions: z.array(z.object({
    module: z.string(),
    canRead: z.boolean(),
    canWrite: z.boolean(),
    canDelete: z.boolean(),
  })).optional()
}).superRefine((data, ctx) => {
    if (data.password && data.password.length > 0 && data.password.length < 6) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Mínimo 6 caracteres",
            path: ["password"],
        });
    }
});

type Props = {
  mode: 'create' | 'edit';
  user?: UserType | null;
  onSuccess: () => void;
};

export function CreateUserForm({ mode, user, onSuccess }: Props) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);

  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  // Código de módulo -> origen de la fila (heredado del sistema o
  // personalizado por la organización), solo para pintar el badge. No se
  // envía al backend.
  const [roleSources, setRoleSources] = useState<Record<string, PermissionSource>>({});

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "LEADER",
      documentNumber: "",
      phone: "",
      locality: "",
      birthDate: "",
      address: "",
      requestsGoal: 0,
      password: "",
      facebookUser: "",
      instagramUser: "",
      tiktokUser: "",
      youtubeUser: "",
      xUser: "",
      permissions: [] as PermissionRow[],
    },
  });

  const selectedRole = form.watch("role");
  const currentPermissions = form.watch("permissions") || [];

  const ROLES_WITHOUT_GOALS = ['SUPER_ADMIN', 'ADMIN', 'CITIZEN', 'BUHO'];
  const showGoals = !ROLES_WITHOUT_GOALS.includes(selectedRole);
  const showSocials = selectedRole === 'BUHO';

  const currentRoleInfo = ROLE_INFO[selectedRole] || { title: 'Rol', desc: 'Selecciona un rol' };

  useEffect(() => {
    const canWriteUsers = currentUser?.permissions?.some(
        (p: any) => p.module === 'USUARIOS' && p.canWrite === true
    ) || false;

    if (!canWriteUsers) {
        toast.error('Acceso denegado', { description: 'No tienes permisos para crear o editar usuarios.' });
        setHasPermission(false);
        router.push('/users');
    }
  }, [currentUser, router]);

  // Catálogo de módulos y roles: viene del backend (Fase 9), ya no está
  // hardcodeado en este archivo.
  useEffect(() => {
    let active = true;

    async function loadCatalogs() {
      setModulesLoading(true);
      setRolesLoading(true);
      try {
        const [modulesRes, rolesRes] = await Promise.all([
          getPermissionModules(),
          getRoles(),
        ]);
        if (!active) return;
        setModules(flattenModules(modulesRes));
        setRoles(rolesRes);
      } catch (error) {
        console.error(error);
        toast.error('No se pudo cargar el catálogo de módulos y roles', {
          description: 'Intenta recargar la página. Si el problema persiste, contacta a soporte.',
        });
      } finally {
        if (active) {
          setModulesLoading(false);
          setRolesLoading(false);
        }
      }
    }

    loadCatalogs();
    return () => { active = false; };
  }, []);

  // Datos personales/edición: se resetean apenas hay usuario, sin esperar al
  // catálogo de módulos (los permisos se sincronizan aparte, abajo).
  useEffect(() => {
    if (mode === 'edit' && user && hasPermission) {
      let locString = "";
      if (user.locality) {
          locString = typeof user.locality === 'object' && 'id' in user.locality
            ? String(user.locality.id)
            : String(user.locality);
      }

      const formattedDate = user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : "";

      form.reset({
        fullName: user.fullName,
        email: user.email,
        role: user.role?.code || "LEADER",
        documentNumber: user.documentNumber || "",
        phone: user.phone || "",
        locality: locString,
        birthDate: formattedDate,
        address: user.address,
        requestsGoal: user.requestsGoal || 0,
        password: "",
        facebookUser: (user as any).facebookUser || "",
        instagramUser: (user as any).instagramUser || "",
        tiktokUser: (user as any).tiktokUser || "",
        youtubeUser: (user as any).youtubeUser || "",
        xUser: (user as any).xUser || "",
        permissions: form.getValues('permissions'), // sincronizado aparte, ver efecto de abajo
      });
    }
  }, [mode, user, form, hasPermission]);

  // Sincroniza el checklist de permisos con el catálogo de módulos en cuanto
  // llega: en modo edición usa los permisos guardados del usuario; en modo
  // creación, arranca en falso para todos los módulos (a menos que ya se haya
  // precargado una plantilla de rol, ver `handleRoleChange`).
  useEffect(() => {
    if (modules.length === 0) return;
    const baseline = mode === 'edit' && user ? ((user as any).permissions || []) : form.getValues('permissions') || [];
    form.setValue('permissions', buildPermissionsForModules(modules, baseline), { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, mode, user]);

  // Al elegir un rol en el <Select>, precarga el checklist con la plantilla
  // efectiva de ese rol (base del sistema + override de la organización) en
  // vez de partir siempre en falso. El usuario solo necesita marcar las
  // casillas que quiera que sean EXCEPCIÓN sobre esa plantilla.
  async function handleRoleChange(roleCode: string, onChange: (value: string) => void) {
    onChange(roleCode);

    const role = roles.find((r) => r.code === roleCode);
    if (!role || modules.length === 0) return;

    setTemplateLoading(true);
    try {
      const template = await getRolePermissions(role.id);
      const sources: Record<string, PermissionSource> = {};

      const newPermissions = modules.map((m) => {
        const entry = template.find((t) => t.module === m.code && !t.subModule)
          ?? template.find((t) => t.module === m.code);
        if (entry) sources[m.code] = entry.source;
        return {
          module: m.code,
          canRead: entry?.canRead ?? false,
          canWrite: entry?.canWrite ?? false,
          canDelete: entry?.canDelete ?? false,
        };
      });

      form.setValue('permissions', newPermissions, { shouldDirty: true });
      setRoleSources(sources);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la plantilla de permisos del rol', {
        description: 'Se mantiene el checklist actual; puedes marcarlo manualmente.',
      });
    } finally {
      setTemplateLoading(false);
    }
  }

  async function onSubmit(values: any) {
    setLoading(true);
    try {
      const selectedRoleEntry = roles.find((r) => r.code === values.role);
      if (!selectedRoleEntry) {
        toast.error('Rol inválido', { description: 'Selecciona un rol válido de la lista antes de guardar.' });
        setLoading(false);
        return;
      }
      const roleId = selectedRoleEntry.id;

      const activePermissions = (values.permissions || []).filter(
          (p: any) => p.canRead || p.canWrite || p.canDelete
      );

      const payload: any = {
          fullName: values.fullName,
          email: values.email,
          roleId: roleId,
          documentNumber: values.documentNumber,
          phone: values.phone,
          locality: Number(values.locality),
          birthDate: values.birthDate,
          address: values.address,
          requestsGoal: Number(values.requestsGoal),
          facebookUser: values.facebookUser,
          instagramUser: values.instagramUser,
          tiktokUser: values.tiktokUser,
          youtubeUser: values.youtubeUser,
          xUser: values.xUser,
          permissions: activePermissions,
      };

      if (values.password && values.password.length >= 6) {
          payload.password = values.password;
      }

      if (mode === 'create') {
        if (!values.password) {
            form.setError("password", { type: "manual", message: "Requerido para crear" });
            toast.error("La contraseña es obligatoria para nuevos usuarios");
            setLoading(false);
            return;
        }
        await api.post("/users", payload);
        toast.success("Usuario creado exitosamente");
      } else {
        await api.patch(`/users/${user!.id}`, payload);
        toast.success("Usuario actualizado correctamente");
      }

      onSuccess();
    } catch (e: any) {
      console.error(e);
      const message = e.response?.data?.message || "Error al guardar usuario";
      const msgToShow = Array.isArray(message) ? message[0] : message;
      toast.error("Error", { description: msgToShow });
    } finally {
      setLoading(false);
    }
  }

  const togglePermission = (moduleCode: string, field: 'canRead' | 'canWrite' | 'canDelete', value: boolean) => {
      const index = currentPermissions.findIndex((p: PermissionRow) => p.module === moduleCode);
      if (index === -1) return;

      const updatedPermissions = [...currentPermissions];
      updatedPermissions[index] = { ...updatedPermissions[index], [field]: value };

      if ((field === 'canWrite' || field === 'canDelete') && value === true) {
          updatedPermissions[index].canRead = true;
      }
      if (field === 'canRead' && value === false) {
          updatedPermissions[index].canWrite = false;
          updatedPermissions[index].canDelete = false;
      }

      form.setValue("permissions", updatedPermissions, { shouldDirty: true });
  };

  if (!hasPermission) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-10">

        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            {/* === SECCIÓN 1: ROL Y ACCESO === */}
            <Card>
                <CardHeader title="Credenciales y Rol" icon={Briefcase} />
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">Tipo de Licencia (Rol)</FormLabel>
                                        <Select
                                            onValueChange={(value) => handleRoleChange(value, field.onChange)}
                                            defaultValue={field.value}
                                            value={field.value}
                                            disabled={rolesLoading}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-50 border-slate-200 h-11">
                                                    <SelectValue placeholder={rolesLoading ? "Cargando roles..." : "Seleccionar Rol"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {rolesLoading ? (
                                                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
                                                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando roles...
                                                    </div>
                                                ) : roles.length === 0 ? (
                                                    <div className="py-4 px-2 text-sm text-slate-500">
                                                        No hay roles disponibles.
                                                    </div>
                                                ) : (
                                                    roles.map((role) => (
                                                        <SelectItem key={role.id} value={role.code}>
                                                            {ROLE_EMOJI[role.code] || DEFAULT_ROLE_EMOJI} {role.name}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3 transition-all">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-blue-800">{currentRoleInfo.title}</h4>
                                    <p className="text-sm text-blue-600/90 mt-1 leading-relaxed">
                                        {currentRoleInfo.desc}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">Correo Electrónico</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                <Input placeholder="usuario@uscateguicol.com" {...field} className="pl-9 h-11" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">
                                            {mode === 'edit' ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                <Input type="password" placeholder="******" {...field} className="pl-9 h-11" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* === SECCIÓN NUEVA: PERMISOS GRANULARES (PBAC) === */}
            <Card className="border-emerald-200 shadow-emerald-50">
                <CardHeader title="Permisos de Acceso (Módulos)" icon={Key} />
                <CardContent>
                    <p className="text-sm text-slate-500 mb-6">
                        Selecciona a qué módulos de la plataforma web tendrá acceso este usuario.
                        Al elegir un rol arriba se precarga su plantilla; solo necesitas ajustar las
                        excepciones puntuales para este usuario.
                    </p>

                    {!modulesLoading && modules.length > 0 && templateLoading && (
                        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Cargando plantilla de permisos del rol...
                        </div>
                    )}
                    <PermissionChecklist
                        modules={modules}
                        permissions={currentPermissions}
                        sources={roleSources}
                        onChange={togglePermission}
                        loading={modulesLoading}
                    />
                </CardContent>
            </Card>

            {/* === SECCIÓN 2: DATOS PERSONALES === */}
            <Card>
                <CardHeader title="Datos Personales" icon={User} />
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Completo</FormLabel>
                                    <FormControl><Input placeholder="Ej. Juan Pérez" {...field} className="h-11" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="documentNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cédula de Ciudadanía</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input placeholder="12345678" {...field} className="pl-9 h-11" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Celular (WhatsApp)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input placeholder="3001234567" {...field} className="pl-9 h-11" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="birthDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha de Nacimiento</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input type="date" {...field} className="h-11" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección</FormLabel>
                                    <FormControl><Input placeholder="Calle..." {...field} className="h-11" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="locality" render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Localidad / Zona</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="pl-9 relative h-11">
                                                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                                <SelectValue placeholder="Seleccionar localidad" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {LOCALIDADES.map((loc) => (
                                                <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* === SECCIÓN 3: REDES SOCIALES (SOLO PARA BÚHOS) === */}
            {showSocials && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <Card className="border-indigo-200 shadow-indigo-50">
                        <CardHeader title="Perfiles Sociales (Búho)" icon={Share2} />
                        <CardContent>
                            <p className="text-sm text-slate-500 mb-4">
                                Ingresa los nombres de usuario para validar las misiones de interacción (sin @ ni enlaces).
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="facebookUser" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Facebook className="w-4 h-4 text-blue-600" /> Facebook</FormLabel>
                                            <FormControl><Input placeholder="juan.perez" {...field} className="h-11" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="instagramUser" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-600" /> Instagram</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-3 text-gray-400">@</span>
                                                    <Input placeholder="juan_perez" {...field} className="pl-7 h-11" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="tiktokUser" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Video className="w-4 h-4 text-black" /> TikTok</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-3 text-gray-400">@</span>
                                                    <Input placeholder="juan_tiktok" {...field} className="pl-7 h-11" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="youtubeUser" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-600" /> YouTube</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-3 text-gray-400">@</span>
                                                    <Input placeholder="tu_canal" {...field} className="pl-7 h-11" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="xUser" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><Twitter className="w-4 h-4 text-black" /> X (Twitter)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-3 text-gray-400">@</span>
                                                    <Input placeholder="usuario_x" {...field} className="pl-7 h-11" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* === SECCIÓN 4: METAS (SOLO PARA LÍDERES) === */}
            {showGoals && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <Card className="border-blue-200 shadow-blue-50">
                        <CardHeader title="Configuración Operativa" icon={Shield} />
                        <CardContent>
                            <div className="bg-blue-50/30 p-6 rounded-lg border border-blue-100 flex flex-col md:flex-row gap-6 items-start">
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-blue-900 mb-1">
                                        {selectedRole === 'RECOLECTOR' ? 'Meta de Planillas' : 'Meta de Gestión'}
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                        {selectedRole === 'RECOLECTOR'
                                            ? 'Establece cuántas planillas o firmas debe traer mensualmente.'
                                            : 'Establece objetivos mensuales para este usuario.'}
                                    </p>
                                </div>
                                <div className="w-full md:w-48">
                                    <FormField control={form.control} name="requestsGoal" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-blue-900 font-semibold">Meta Mensual</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number" min="0" {...field}
                                                        value={(field.value as number) || ''}
                                                        onChange={(e) => field.onChange(e)}
                                                        className="bg-white border-blue-200 text-center font-bold text-lg h-12"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex items-center justify-end gap-4 pt-4">
                <Button variant="outline" type="button" onClick={() => window.history.back()} className="h-11 px-6">Cancelar</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 h-11 px-8 shadow-lg font-semibold" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                </Button>
            </div>

        </form>
        </Form>
    </div>
  );
}