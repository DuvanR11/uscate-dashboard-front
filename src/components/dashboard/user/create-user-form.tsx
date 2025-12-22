'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Save, MapPin, Smartphone, CreditCard, User, Mail, Lock, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { User as UserType } from "@/types/user";

const ROLE_TO_ID: Record<string, number> = {
  'SUPER_ADMIN': 1,
  'SECRETARY': 2,
  'LEADER': 3,
  'CITIZEN': 4 
};

// --- 1. DEFINICIÓN DEL ESQUEMA ---
const formSchema = z.object({
  fullName: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Correo inválido"),
  role: z.string().min(1, "Rol requerido"),
  documentNumber: z.string().min(5, "Documento requerido"),
  phone: z.string().min(10, "Mínimo 10 dígitos").max(10, "Máximo 10 dígitos"),
  locality: z.string().min(1, "Localidad requerida"),
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

type FormValues = z.infer<typeof formSchema>;

type Props = {
  mode: 'create' | 'edit';
  user?: UserType | null;
  onSuccess: () => void;
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

export function CreateUserForm({ mode, user, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "LEADER",
      documentNumber: "",
      phone: "",
      locality: "",
      requestsGoal: 0,
      password: "",
    },
  });

  const selectedRole = form.watch("role");
  const isAgent = selectedRole === 'LEADER';
  const isCitizen = selectedRole === 'CITIZEN';

  useEffect(() => {
    if (mode === 'edit' && user) {
      let locString = "";
      if (user.locality) {
          locString = typeof user.locality === 'object' ? String(user.locality.id) : String(user.locality);
      }

      form.reset({
        fullName: user.fullName,
        email: user.email,
        role: user.role?.code || "LEADER",
        documentNumber: user.documentNumber || "",
        phone: user.phone || "",
        locality: locString,
        requestsGoal: user.requestsGoal || 0,
        password: "", 
      });
    }
  }, [mode, user, form]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const roleId = ROLE_TO_ID[values.role] || 3;
      
      const payload: any = {
          fullName: values.fullName,
          email: values.email,
          roleId: roleId,
          documentNumber: values.documentNumber,
          phone: values.phone,
          localityId: Number(values.locality),
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
    // CONTENEDOR CENTRADO Y AJUSTADO A LA PALETA
    <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
        
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* === SECCIÓN 1: CREDENCIALES === */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
                        <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
                        Acceso y Permisos
                    </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700 font-medium">Rol asignado</FormLabel>
                                <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-[#1B2541]">
                                            <SelectValue placeholder="Seleccionar Rol" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
                                        <SelectItem value="SECRETARY">Secretaría</SelectItem>
                                        <SelectItem value="LEADER">Líder / Agente</SelectItem>
                                        <SelectItem value="CITIZEN">Ciudadano App</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-xs text-slate-400">Determina los permisos dentro del sistema.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-medium">Correo Electrónico</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input placeholder="usuario@babel.com" {...field} className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-[#1B2541]" />
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
                                    <FormLabel className="text-slate-700 font-medium">{mode === 'edit' ? 'Cambiar Contraseña (Opcional)' : 'Contraseña'}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input type="password" placeholder="******" {...field} className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-[#1B2541]" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* === SECCIÓN 2: INFORMACIÓN PERSONAL === */}
            <div className="space-y-6 pt-2">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
                        <User className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
                        Datos Personales
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700 font-medium">Nombre Completo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. Juan Pérez" {...field} className="bg-slate-50 border-slate-200 focus-visible:ring-[#1B2541]" />
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
                                <FormLabel className="text-slate-700 font-medium">Cédula de Ciudadanía</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input placeholder="12345678" {...field} className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-[#1B2541]" />
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
                                <FormLabel className="text-slate-700 font-medium">Celular (WhatsApp)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input placeholder="3001234567" {...field} className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-[#1B2541]" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* VISIBLE PARA TODOS */}
                    <FormField
                        control={form.control}
                        name="locality"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-700 font-medium">Localidad / Zona</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="pl-9 relative bg-slate-50 border-slate-200 focus:ring-[#1B2541]">
                                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
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
            </div>

            {/* === SECCIÓN 3: METAS (SOLO AGENTES) === */}
            {isAgent && (
                <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 mt-6 animate-in fade-in zoom-in duration-300">
                    <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                        <Shield className="w-4 h-4" /> Configuración de Agente
                    </h3>
                    <div className="max-w-xs">
                        <FormField
                            control={form.control}
                            name="requestsGoal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-blue-900 font-medium">Meta Mensual de Solicitudes</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="0" {...field} className="bg-white border-blue-200 focus-visible:ring-blue-500 font-bold text-blue-900" />
                                    </FormControl>
                                    <FormDescription className="text-blue-600/80">Objetivo de gestión para el dashboard.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 mt-8">
                <Button variant="outline" type="button" onClick={() => window.history.back()} className="border-slate-300 text-slate-600 hover:bg-slate-50">
                    Cancelar
                </Button>
                <Button type="submit" className="bg-[#1B2541] hover:bg-[#1B2541]/90 min-w-[180px] shadow-lg shadow-[#1B2541]/20 font-bold" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                </Button>
            </div>

        </form>
        </Form>
    </div>
  );
}