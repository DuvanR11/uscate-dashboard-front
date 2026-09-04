'use client';

import { useState, useEffect, useCallback } from "react";
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
import {
  Plus,
  Users as UsersIcon,
  Search,
  X,
  Activity,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { usePermission } from "@/hooks/use-permission";
import { getRoles, Role } from "@/lib/api/roles";

const LOCALIDADES = [
  { id: 1, name: "Usaquén" },
  { id: 2, name: "Chapinero" },
  { id: 3, name: "Santa Fe" },
  { id: 4, name: "San Cristóbal" },
  { id: 5, name: "Usme" },
  { id: 6, name: "Tunjuelito" },
  { id: 7, name: "Bosa" },
  { id: 8, name: "Kennedy" },
  { id: 9, name: "Fontibón" },
  { id: 10, name: "Engativá" },
  { id: 11, name: "Suba" },
  { id: 12, name: "Barrios Unidos" },
  { id: 13, name: "Teusaquillo" },
  { id: 14, name: "Los Mártires" },
  { id: 15, name: "Antonio Nariño" },
  { id: 16, name: "Puente Aranda" },
  { id: 17, name: "La Candelaria" },
  { id: 18, name: "Rafael Uribe Uribe" },
  { id: 19, name: "Ciudad Bolívar" },
  { id: 20, name: "Sumapaz" },
];

export default function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const canReadUsersOwn = usePermission("USUARIOS", "canRead");
  const canReadUsersGlobal = usePermission("USUARIOS_GLOBAL", "canRead");
  const canReadUsers = canReadUsersOwn || canReadUsersGlobal;

  const canWriteUsersOwn = usePermission("USUARIOS", "canWrite");
  const canWriteUsersGlobal = usePermission("USUARIOS_GLOBAL", "canWrite");
  const canWriteUsers = canWriteUsersOwn || canWriteUsersGlobal;

  const canReadProductivityOwn = usePermission("PRODUCTIVIDAD", "canRead");
  const canReadProductivityGlobal = usePermission("PRODUCTIVIDAD_GLOBAL", "canRead");
  const canReadProductivity = canReadProductivityOwn || canReadProductivityGlobal;

  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  // Catálogo de roles para el filtro: viene del backend (Fase 9), ya no está
  // hardcodeado — una sola fuente de verdad compartida con create-user-form.tsx.
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRoles() {
      setRolesLoading(true);
      try {
        const rolesRes = await getRoles();
        if (active) setRoles(rolesRes);
      } catch (error) {
        console.error(error);
        toast.error("No se pudo cargar el catálogo de roles", {
          description: "El filtro por rol puede no funcionar. Intenta recargar la página.",
        });
      } finally {
        if (active) setRolesLoading(false);
      }
    }

    loadRoles();
    return () => { active = false; };
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!user || !canReadUsers) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const params: any = {
        page: searchParams.get("page") || 1,
        limit: searchParams.get("limit") || 10,
        search: searchParams.get("search") || "",
        locality: searchParams.get("locality") || "",
        roles: searchParams.get("roles") || "",
      };

      if (!params.search) delete params.search;
      if (!params.locality) delete params.locality;
      if (!params.roles) delete params.roles;

      const res = await api.get("/users", { params });

      setData(res.data.data);
      setTotalRecords(res.data.meta.total);
      setPageCount(res.data.meta.lastPage);
    } catch (error: any) {
      console.error(error);
      toast.error("No se pudo cargar el equipo", {
        description: error?.response?.data?.message || "Error consultando usuarios.",
      });
    } finally {
      setLoading(false);
    }
  }, [user, canReadUsers, searchParams]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateFilter("search", searchTerm);
  };

  const clearFilters = () => {
    setSearchTerm("");
    router.push(pathname);
  };

  const handleToggleStatus = async (targetUser: User) => {
    if (!canWriteUsers) {
      toast.error("No tienes permisos para cambiar el estado del usuario");
      return;
    }

    try {
      await api.patch(`/users/${targetUser.id}/toggle-status`);

      toast.success(
        `Usuario ${targetUser.isActive ? "desactivado" : "activado"} correctamente`,
      );

      fetchUsers();
    } catch (error: any) {
      toast.error("Error al cambiar el estado del usuario", {
        description: error?.response?.data?.message || "No se pudo actualizar.",
      });
    }
  };

  if (!user) {
    return (
      <div className="p-12 text-center text-slate-500">
        Cargando usuario...
      </div>
    );
  }

  if (!canReadUsers) {
    return (
      <div className="p-12 text-center text-slate-500">
        No tienes permisos para consultar usuarios.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary/20 rounded-lg">
            <UsersIcon className="h-6 w-6 text-secondary-foreground" />
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">
              Equipo de la Seguridad
            </h2>

            <p className="text-muted-foreground">
              Gestión de usuarios, permisos, productividad y seguimiento.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {canReadProductivity && (
            <Link href="users/productivity/reports">
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Reportes
              </Button>
            </Link>
          )}

          {canReadProductivity && (
            <Link href="users/productivity/ranking">
              <Button variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Ranking
              </Button>
            </Link>
          )}

          {canWriteUsers && (
            <Link href="/users/new">
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Miembro
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
          <form onSubmit={handleSearch} className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

            <Input
              placeholder="Buscar por nombre, correo o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-full"
            />

            <button type="submit" className="hidden">
              Buscar
            </button>
          </form>

          <div className="w-full md:w-56">
            <Select
              value={searchParams.get("locality") || "all"}
              onValueChange={(val) =>
                updateFilter("locality", val === "all" ? "" : val)
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Todas las localidades" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Todas las localidades</SelectItem>

                {LOCALIDADES.map((loc) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-56">
            <Select
              value={searchParams.get("roles") || "all"}
              onValueChange={(val) =>
                updateFilter("roles", val === "all" ? "" : val)
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder={rolesLoading ? "Cargando roles..." : "Todos los roles"} />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>

                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.code}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="h-10 w-full md:w-auto" onClick={handleSearch}>
            Buscar
          </Button>

          {(searchParams.get("search") ||
            searchParams.get("locality") ||
            searchParams.get("roles")) && (
            <Button
              variant="ghost"
              className="h-10 text-slate-500 w-full md:w-auto"
              onClick={clearFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-500 animate-pulse">
          Cargando equipo...
        </div>
      ) : (
        <DataTable
          columns={columns({
            onToggleStatus: handleToggleStatus,
            canWrite: canWriteUsers,
            canReadProductivity,
          })}
          data={data}
          totalRecords={totalRecords}
          pageCount={pageCount}
        />
      )}
    </div>
  );
}