'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import { User } from "@/types/user";
import { columns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users as UsersIcon, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store"; // <-- NUEVA IMPORTACIÓN

const LOCALIDADES = [
  { id: 1, name: "Usaquén" }, { id: 2, name: "Chapinero" }, { id: 3, name: "Santa Fe" },
  { id: 4, name: "San Cristóbal" }, { id: 5, name: "Usme" }, { id: 6, name: "Tunjuelito" },
  { id: 7, name: "Bosa" }, { id: 8, name: "Kennedy" }, { id: 9, name: "Fontibón" },
  { id: 10, name: "Engativá" }, { id: 11, name: "Suba" }, { id: 12, name: "Barrios Unidos" },
  { id: 13, name: "Teusaquillo" }, { id: 14, name: "Los Mártires" }, { id: 15, name: "Antonio Nariño" },
  { id: 16, name: "Puente Aranda" }, { id: 17, name: "La Candelaria" }, { id: 18, name: "Rafael Uribe Uribe" },
  { id: 19, name: "Ciudad Bolívar" }, { id: 20, name: "Sumapaz" }
];

export default function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams(); 
  
  // --- SEGURIDAD: VERIFICAMOS PERMISOS ---
  const { user } = useAuthStore();
  const hasWritePermission = user?.permissions?.some(
    (p: any) => p.module === 'USUARIOS' && p.canWrite === true
  ) || false;

  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0); 
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: searchParams.get('page') || 1,
        limit: searchParams.get('limit') || 10,
        search: searchParams.get('search') || '',
        locality: searchParams.get('locality') || '',
      };

      const res = await api.get('/users', { params }); 
      
      const users = res.data.data; 
      const meta = res.data.meta;

      setData(users);
      setTotalRecords(meta.total);
      setPageCount(meta.lastPage); 
      
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar el equipo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchParams]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateFilter('search', searchTerm);
  };

  const clearFilters = () => {
    setSearchTerm('');
    router.push(pathname); 
  };

  const handleToggleStatus = async (user: User) => {
    try {
        await api.patch(`/users/${user.id}/toggle-status`);
        toast.success(`Usuario ${user.isActive ? 'desactivado' : 'activado'} correctamente`);
        fetchUsers(); 
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
            <h2 className="text-3xl font-bold tracking-tight text-primary">Equipo de la Seguridad</h2>
            <p className="text-muted-foreground">Gestión de permisos y accesos al sistema.</p>
          </div>
        </div>
        
        {/* --- MAGIA PBAC: Solo mostramos el botón si tiene permiso de escritura --- */}
        {hasWritePermission && (
          <Link href="/users/new">
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold shadow-sm">
                 <Plus className="mr-2 h-4 w-4" /> Nuevo Miembro
              </Button>
          </Link>
        )}
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
          <form onSubmit={handleSearch} className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre o cédula..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-full"
            />
            <button type="submit" className="hidden">Buscar</button>
          </form>

          <div className="w-full md:w-56">
            <Select 
              value={searchParams.get('locality') || "all"} 
              onValueChange={(val) => updateFilter('locality', val === "all" ? "" : val)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Todas las localidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las localidades</SelectItem>
                {LOCALIDADES.map(loc => (
                  <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="h-10 w-full md:w-auto" onClick={handleSearch}>
            Buscar
          </Button>
          {(searchParams.get('search') || searchParams.get('locality')) && (
            <Button variant="ghost" className="h-10 text-slate-500 w-full md:w-auto" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <DataTable 
          columns={columns({ 
              onToggleStatus: handleToggleStatus,
              canWrite: hasWritePermission // <-- Pasamos el permiso a las columnas
          })} 
          data={data}
          totalRecords={totalRecords}
          pageCount={pageCount} 
      />
    </div>
  );
}