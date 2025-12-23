'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { User } from "@/types/user";
import { toast } from "sonner";
import { CreateUserForm } from "@/components/dashboard/user/create-user-form";

// Desempaquetado de params (Next.js 15+)
export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { id } = await params; // await params
        const res = await api.get(`/users/${id}`);
        setUser(res.data);
      } catch (error) {
        toast.error("No se pudo cargar el usuario");
        router.push('/admin/users');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [params, router]);

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container py-10 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1B2541]">Editar Usuario</h1>
          <p className="text-muted-foreground">Modifica los datos y permisos de acceso.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <CreateUserForm 
            mode="edit" 
            user={user}
            onSuccess={() => router.push('/users')} 
        />
      </div>
    </div>
  );
}