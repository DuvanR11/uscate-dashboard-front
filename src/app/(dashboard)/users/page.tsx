'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation"; // <--- 1. IMPORTANTE
import api from "@/lib/api";
import { User } from "@/types/user";
import { columns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";

export default function UsersPage() {
  const searchParams = useSearchParams(); // <--- 2. Hook para leer la URL
  
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0); // <--- 3. Total de páginas del back

  // Cargar usuarios con paginación
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Convertimos los params de la URL para enviarlos a Axios
      const params = {
        page: searchParams.get('page') || 1,
        limit: searchParams.get('limit') || 10, // Por defecto 10
        // Si quisieras buscador aquí, agregarías: search: searchParams.get('search')
      };

      const res = await api.get('/users', { params }); 
      
      // Ajustamos según la respuesta de tu backend (Laravel/Nest suelen dar .data y .meta)
      const users = res.data.data; 
      const meta = res.data.meta;

      setData(users);
      setPageCount(meta.lastPage); // <--- Guardamos la última página
      
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar el equipo");
    } finally {
      setLoading(false);
    }
  };

  // 4. El efecto se dispara cada vez que cambia la URL (paginación)
  useEffect(() => {
    fetchUsers();
  }, [searchParams]);

  // INTEGRACIÓN: Endpoint Toggle Status
  const handleToggleStatus = async (user: User) => {
    try {
        await api.patch(`/users/${user.id}/toggle-status`);
        toast.success(`Usuario ${user.isActive ? 'desactivado' : 'activado'} correctamente`);
        fetchUsers(); // Recargamos la página actual
    } catch (error) {
        toast.error("Error al cambiar el estado del usuario");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary/20 rounded-lg">
             <UsersIcon className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Equipo de Campaña</h2>
            <p className="text-muted-foreground">Gestión de permisos y accesos al sistema.</p>
          </div>
        </div>
        
        {/* Botón de Acción Principal */}
        <Link href="/users/new">
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold shadow-sm">
               <Plus className="mr-2 h-4 w-4" /> Nuevo Miembro
            </Button>
        </Link>
      </div>

      {/* Tabla */}
      <DataTable 
          columns={columns({ 
              onToggleStatus: handleToggleStatus 
          })} 
          data={data}
          pageCount={pageCount} // <--- 5. Pasamos el total de páginas
      />
    </div>
  );
}