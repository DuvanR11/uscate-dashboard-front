'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
  Loader2, Save, MapPin, Smartphone, CreditCard, User, 
  Mail, Lock, Shield, CalendarIcon, Info, Briefcase 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { User as UserType } from "@/types/user";

// --- COMPONENTES DE UI PARA MEJORAR EL DISEÑO ---
// Si no tienes estos componentes instalados, son simples divs con clases de tailwind
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>{children}</div>
);
const CardHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
  <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
    <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
      <Icon className="w-5 h-5" />
    </div>
    <h3 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
      {title}
    </h3>
  </div>
);
const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6">{children}</div>
);

// --- CONSTANTES Y LÓGICA ---

const ROLE_TO_ID: Record<string, number> = {
  'SUPER_ADMIN': 1,
  'ADMIN': 2,
  'SECRETARY': 3,
  'LEADER': 4,
  'LEGISLATIVE': 5,
  'CITIZEN': 6
};

// ℹ️ NUEVO: Información de apoyo para cada rol
const ROLE_INFO: Record<string, { title: string; desc: string }> = {
  'SUPER_ADMIN': { title: 'Control Total', desc: 'Acceso irrestricto a configuración, usuarios y reportes financieros.' },
  'ADMIN': { title: 'Administrador', desc: 'Gestión de usuarios y campañas, sin acceso a configuración crítica.' },
  'SECRETARY': { title: 'Secretaría', desc: 'Gestión de agenda, recepción de solicitudes y validación de datos.' },
  'LEADER': { title: 'Líder Territorial', desc: 'Encargado de captar votos, gestionar su zona y cumplir metas.' },
  'LEGISLATIVE': { title: 'Equipo Legislativo', desc: 'Abogados y asesores encargados de trámites y proyectos.' },
  'CITIZEN': { title: 'Ciudadano', desc: 'Usuario final de la App. Solo puede reportar incidencias.' },
};

const LOCALIDADES = [
  { id: 1, name: "Usaquén" }, { id: 2, name: "Chapinero" }, { id: 3, name: "Santa Fe" },
  { id: 4, name: "San Cristóbal" }, { id: 5, name: "Usme" }, { id: 6, name: "Tunjuelito" },
  { id: 7, name: "Bosa" }, { id: 8, name: "Kennedy" }, { id: 9, name: "Fontibón" },
  { id: 10, name: "Engativá" }, { id: 11, name: "Suba" }, { id: 12, name: "Barrios Unidos" },
  { id: 13, name: "Teusaquillo" }, { id: 14, name: "Los Mártires" }, { id: 15, name: "Antonio Nariño" },
  { id: 16, name: "Puente Aranda" }, { id: 17, name: "La Candelaria" }, { id: 18, name: "Rafael Uribe Uribe" },
  { id: 19, name: "Ciudad Bolívar" }, { id: 20, name: "Sumapaz" }
];

const formSchema = z.object({
  fullName: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Correo inválido"),
  role: z.string().min(1, "Rol requerido"),
  documentNumber: z.string().min(5, "Documento requerido"),
  phone: z.string().min(10, "Mínimo 10 dígitos").max(10, "Máximo 10 dígitos"),
  locality: z.string().min(1, "Localidad requerida"),
  birthDate: z.string().min(1, "Fecha de nacimiento requerida"),
  requestsGoal: z.coerce.number().min(0).default(0),
  password: z.string().optional(),
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
  const [loading, setLoading] = useState(false);

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
      requestsGoal: 0,
      password: "",
    },
  });

  const selectedRole = form.watch("role");
  
  // Lógica de exclusión de metas
  const ROLES_WITHOUT_GOALS = ['SUPER_ADMIN', 'ADMIN', 'CITIZEN'];
  const showGoals = !ROLES_WITHOUT_GOALS.includes(selectedRole);

  // Obtener info del rol actual para mostrar tooltip
  const currentRoleInfo = ROLE_INFO[selectedRole] || { title: 'Rol', desc: 'Selecciona un rol' };

  useEffect(() => {
    if (mode === 'edit' && user) {
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
        requestsGoal: user.requestsGoal || 0,
        password: "", 
      });
    }
  }, [mode, user, form]);

  async function onSubmit(values: any) {
    setLoading(true);
    try {
      const roleId = ROLE_TO_ID[values.role] || 4; 
      
      const payload: any = {
          fullName: values.fullName,
          email: values.email,
          roleId: roleId,
          documentNumber: values.documentNumber,
          phone: values.phone,
          locality: Number(values.locality), 
          birthDate: values.birthDate,       
          requestsGoal: Number(values.requestsGoal),
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-10">
        
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* === SECCIÓN 1: ROL Y ACCESO (DISEÑO MEJORADO) === */}
            <Card>
                <CardHeader title="Credenciales y Rol" icon={Briefcase} />
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Columna Izquierda: Selección de Rol */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-medium">Asignar Rol</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-50 border-slate-200 h-11">
                                                    <SelectValue placeholder="Seleccionar Rol" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="SUPER_ADMIN">👑 Super Administrador</SelectItem>
                                                <SelectItem value="ADMIN">🛡️ Admin</SelectItem>
                                                <SelectItem value="SECRETARY">📋 Secretaría</SelectItem>
                                                <SelectItem value="LEADER">🤝 Líder / Agente</SelectItem>
                                                <SelectItem value="LEGISLATIVE">⚖️ Legislativo</SelectItem>
                                                <SelectItem value="CITIZEN">📱 Ciudadano</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* CAJA DE INFORMACIÓN DE ROL */}
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

                        {/* Columna Derecha: Email y Password */}
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

            {/* === SECCIÓN 2: INFORMACIÓN PERSONAL === */}
            <Card>
                <CardHeader title="Datos Personales" icon={User} />
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Completo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. Juan Pérez" {...field} className="h-11" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="documentNumber"
                            render={({ field }) => (
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

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
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

                        <FormField
                            control={form.control}
                            name="birthDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha de Nacimiento</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            {/* Icono decorativo, el input date nativo tiene su propio picker */}
                                            <Input type="date" {...field} className="h-11" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="locality"
                            render={({ field }) => (
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
                                                <SelectItem key={loc.id} value={String(loc.id)}>
                                                    {loc.name}
                                                </SelectItem>
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

            {/* === SECCIÓN 3: METAS (DINÁMICA) === */}
            {showGoals && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <Card className="border-blue-200 shadow-blue-50">
                        <CardHeader title="Configuración Operativa" icon={Shield} />
                        <CardContent>
                            <div className="bg-blue-50/30 p-6 rounded-lg border border-blue-100 flex flex-col md:flex-row gap-6 items-start">
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-blue-900 mb-1">Metas de Gestión</h4>
                                    <p className="text-sm text-slate-600">
                                        Establece objetivos mensuales para este usuario. Esto activará gráficas de rendimiento en su dashboard.
                                    </p>
                                </div>
                                <div className="w-full md:w-48">
                                    <FormField
                                        control={form.control}
                                        name="requestsGoal"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-blue-900 font-semibold">Meta Mensual</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="number" 
                                                        min="0" 
                                                        {...field} 
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
                <Button variant="outline" type="button" onClick={() => window.history.back()} className="h-11 px-6">
                    Cancelar
                </Button>
                <Button type="submit" className="bg-[#1B2541] hover:bg-[#1B2541]/90 h-11 px-8 shadow-lg font-semibold" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                </Button>
            </div>

        </form>
        </Form>
    </div>
  );
}