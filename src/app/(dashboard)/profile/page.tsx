'use client';

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Lock, Shield, Save, Loader2, Mail, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const profileSchema = z.object({
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Mínimo 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export default function ProfilePage() {
  const { user } = useAuthStore();
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(profileSchema)
  });

  const onSubmit = async (data: any) => {
    try {
      await api.patch(`/users/${user?.id}`, { password: data.password });
      toast.success("Contraseña actualizada correctamente");
      reset();
    } catch (e) {
      toast.error("Error al actualizar contraseña");
    }
  };

  // Helper para mostrar el rol bonito si viene como objeto o string
  const roleDisplay = typeof user?.role === 'object' ? user.role.name : user?.role;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
        {/* Encabezado */}
        <div className="flex items-center gap-4 border-b border-border/40 pb-6">
            <div className="p-3 bg-secondary/20 rounded-xl shadow-sm">
                <User className="h-8 w-8 text-primary" />
            </div>
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-primary">Mi Perfil</h2>
                <p className="text-muted-foreground">Gestiona tus credenciales y revisa tu información de acceso.</p>
            </div>
        </div>

      {/* Tarjeta de Información Personal */}
      <Card className="border-t-4 border-t-secondary shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
             <BadgeCheck className="h-5 w-5 text-secondary-foreground" />
             <CardTitle className="text-xl text-primary">Información Personal</CardTitle>
          </div>
          <CardDescription>
            Estos datos son administrados por el sistema y definen tus permisos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-foreground/80 font-medium">Nombre Completo</Label>
                <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        value={user?.fullName || ''} 
                        disabled 
                        className="pl-9 bg-muted/50 border-muted-foreground/20 text-foreground font-medium cursor-not-allowed" 
                    />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground/80 font-medium">Correo Electrónico</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        value={user?.email || ''} 
                        disabled 
                        className="pl-9 bg-muted/50 border-muted-foreground/20 text-foreground font-medium cursor-not-allowed" 
                    />
                </div>
              </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-foreground/80 font-medium block">Rol Asignado</Label>
            <div className="flex items-center gap-2 p-3 bg-secondary/10 border border-secondary/20 rounded-lg max-w-md">
                <Shield className="h-5 w-5 text-yellow-600" />
                <span className="font-bold text-primary">
                    {roleDisplay || "Usuario"}
                </span>
                <Badge variant="outline" className="ml-auto border-yellow-600/30 text-yellow-700 bg-yellow-50">
                    Activo
                </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
                * Si necesitas cambiar tu rol, contacta a un Super Administrador.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tarjeta de Seguridad */}
      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
             <Lock className="h-5 w-5 text-primary" />
             <CardTitle className="text-xl text-primary">Seguridad</CardTitle>
          </div>
          <CardDescription>Actualiza tu contraseña periódicamente para mantener tu cuenta segura.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                <Label className="text-foreground font-medium">Nueva Contraseña</Label>
                <Input 
                    type="password" 
                    {...register("password")} 
                    placeholder="Min. 6 caracteres" 
                    className="focus-visible:ring-primary"
                />
                {errors.password && <p className="text-destructive text-xs font-medium">{errors.password.message as string}</p>}
                </div>
                
                <div className="space-y-2">
                <Label className="text-foreground font-medium">Confirmar Contraseña</Label>
                <Input 
                    type="password" 
                    {...register("confirmPassword")} 
                    placeholder="Repite la contraseña" 
                    className="focus-visible:ring-primary"
                />
                {errors.confirmPassword && <p className="text-destructive text-xs font-medium">{errors.confirmPassword.message as string}</p>}
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <Button 
                    type="submit" 
                    className="w-full md:w-auto min-w-[200px] bg-primary hover:bg-primary/90 text-white font-bold shadow-md" 
                    disabled={isSubmitting}
                >
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...
                    </>
                ) : (
                    <>
                        <Save className="mr-2 h-4 w-4" /> Actualizar Contraseña
                    </>
                )}
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}