'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import { RequestItem } from "@/types/request";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusCircle, Download, UserCheck, Globe } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import * as XLSX from "xlsx";
import { columns } from "@/components/dashboard/requests/columns";
import { RequestsToolbar } from "@/components/dashboard/requests/requests-toolbar";
import { useAuthStore } from "@/store/auth-store";
import { usePermission } from "@/hooks/use-permission";

export default function RequestsPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // `columns()` sigue necesitando el array crudo de permisos (ver excepción
  // documentada en columns.tsx).
  const permissions = user?.permissions || [];

  const canWriteGlobal = usePermission("SOLICITUDES_GLOBAL", "canWrite");
  const canWriteInternal = usePermission("SOLICITUDES_INTERNAS", "canWrite");
  const canWriteLegislative = usePermission("SOLICITUDES_LEGISLATIVAS", "canWrite");
  const canWriteSecurity = usePermission("SOLICITUDES_SEGURIDAD", "canWrite");

  const hasWritePermission =
    canWriteGlobal || canWriteInternal || canWriteLegislative || canWriteSecurity;

  const canReadGlobal = usePermission("SOLICITUDES_GLOBAL", "canRead");
  const canReadInternal = usePermission("SOLICITUDES_INTERNAS", "canRead");
  const canReadLegislative = usePermission("SOLICITUDES_LEGISLATIVAS", "canRead");
  const canReadSecurity = usePermission("SOLICITUDES_SEGURIDAD", "canRead");

  const hasReadPermission =
    canReadGlobal || canReadInternal || canReadLegislative || canReadSecurity;

  const isGlobalAdmin = canReadGlobal;

  const filters = {
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "ALL",
    priority: searchParams.get("priority") || "ALL",
    type: searchParams.get("type") || "ALL",
  };

  const updateFilters = (newFilters: any) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newFilters.search) params.set("search", newFilters.search);
    else params.delete("search");

    if (newFilters.status && newFilters.status !== "ALL") params.set("status", newFilters.status);
    else params.delete("status");

    if (newFilters.priority && newFilters.priority !== "ALL") params.set("priority", newFilters.priority);
    else params.delete("priority");

    if (newFilters.type && newFilters.type !== "ALL") params.set("type", newFilters.type);
    else params.delete("type");

    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const fetchRequests = useCallback(async () => {
    if (!user || !hasReadPermission) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const params: any = {
        page: searchParams.get("page") || 1,
        limit: searchParams.get("limit") || 10,
        search: searchParams.get("search") || "",
        status: searchParams.get("status") || "ALL",
        priority: searchParams.get("priority") || "ALL",
        type: searchParams.get("type") || "ALL",
      };

      if (params.status === "ALL") delete params.status;
      if (params.priority === "ALL") delete params.priority;
      if (params.type === "ALL") delete params.type;
      if (!params.search) delete params.search;

      const response = await api.get("/requests", { params });

      setData(response.data.data);
      setTotalRecords(response.data.meta.total);
      setPageCount(response.data.meta.lastPage);
    } catch (error: any) {
      console.error(error);
      toast.error("Error cargando solicitudes", {
        description:
          error?.response?.data?.message || "No se pudo cargar la bandeja.",
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams, user, hasReadPermission]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const exportToExcel = () => {
    const excelData = data.map((item) => ({
      Asunto: item.subject,
      Estado: item.status,
      Prioridad: item.priority,
      Tipo: item.type,
      Código: item.publicCode || item.externalCode || item.id,
      Solicitante:
        item.type === "SECURITY_APP"
          ? item.createdBy?.fullName
          : item.prospect
            ? `${item.prospect.firstName} ${item.prospect.lastName}`
            : "N/A",
      Creado: new Date(item.createdAt).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, "Solicitudes_Gestion.xlsx");
  };

  if (!user) {
    return (
      <div className="p-12 text-center text-slate-500">
        Cargando usuario...
      </div>
    );
  }

  if (!hasReadPermission) {
    return (
      <div className="p-12 text-center text-slate-500">
        No tienes permisos para consultar solicitudes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary">
            Solicitudes y PQRs
          </h2>

          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <p className="font-medium">Bandeja de Gestión</p>

            {isGlobalAdmin ? (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Globe size={12} /> Visión Global
              </span>
            ) : (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <UserCheck size={12} /> Mis Asignaciones
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>

          {hasWritePermission && (
            <Link href="/requests/new">
              <Button className="bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Nueva Solicitud
              </Button>
            </Link>
          )}
        </div>
      </div>

      <RequestsToolbar
        filters={filters}
        setFilters={updateFilters}
        onSearch={() => {}}
      />

      {loading ? (
        <div className="flex justify-center p-12 text-slate-500 animate-pulse">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
            <p>Cargando tickets...</p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns({ permissions })}
          data={data}
          totalRecords={totalRecords}
          pageCount={pageCount}
        />
      )}
    </div>
  );
}