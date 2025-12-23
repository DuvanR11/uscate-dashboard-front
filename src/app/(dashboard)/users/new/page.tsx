'use client';

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreateUserForm } from "@/components/dashboard/user/create-user-form";

export default function CreateUserPage() {
  const router = useRouter();

  return (
    <div className="container py-10 space-y-4">
      
      {/* Header con botón volver */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1B2541]">Nuevo Usuario</h1>
          <p className="text-muted-foreground">Registra un nuevo miembro del equipo o un ciudadano.</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <CreateUserForm 
            mode="create" 
            onSuccess={() => router.push('/users')} // Redirige al listado al terminar
        />
      </div>
    </div>
  );
}