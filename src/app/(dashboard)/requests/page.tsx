'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { RequestItem } from "@/types/request";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlusCircle, Download, UserCheck } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import * as XLSX from 'xlsx';
import { columns } from "@/components/dashboard/requests/columns";
import { RequestsToolbar } from "@/components/dashboard/requests/requests-toolbar";
import { useAuthStore } from "@/store/auth-store"; // <--- Importamos el store

export default function RequestsPage() {
  const { user } = useAuthStore(); // Obtenemos el usuario logueado
  const [data, setData] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADO DE LOS FILTROS ---
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    priority: 'ALL',
    type: 'ALL'
  });

  const fetchRequests = useCallback(async () => {
    // Evitar llamada si no hay usuario cargado aún (seguridad extra)
    if (!user) return; 

    setLoading(true);
    try {
      // Construimos los parámetros URL
      const params: any = {};
      if (filters.search) params.search = filters.search;
      if (filters.status !== 'ALL') params.status = filters.status;
      if (filters.priority !== 'ALL') params.priority = filters.priority;
      if (filters.type !== 'ALL') params.type = filters.type;
      
      // --- LÓGICA DE ROLES ---
      // Si NO es Admin, solo ve lo asignado a él
      const isAdmin = user.role?.code === 'ADMIN' || user.role?.code === 'SUPER_ADMIN';
      
      if (!isAdmin) {
          params.assignedUserId = user.id; 
      }
      
      // Llamada con params de axios
      const response = await api.get('/requests', { params });
      setData(response.data.data); 
    } catch (error) {
      toast.error("Error cargando solicitudes");
    } finally {
      setLoading(false);
    }
  }, [filters, user]); // Se ejecuta cuando filters o user cambian

  // Carga inicial
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const exportToExcel = () => {
      const excelData = data.map(item => ({
        "Asunto": item.subject,
        "Estado": item.status,
        "Prioridad": item.priority,
        "Tipo": item.type,
        "Código": item.type === 'INTERNAL' ? item.publicCode : item.externalCode,
        "Solicitante": item.type === 'SECURITY_APP' 
            ? item.createdBy?.fullName 
            : (item.prospect ? `${item.prospect.firstName} ${item.prospect.lastName}` : 'N/A'),
        "Creado": new Date(item.createdAt).toLocaleDateString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
      XLSX.writeFile(workbook, "Solicitudes_Gestion.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"> 
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1B2541]">Solicitudes y PQRs</h2>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
             <p className="font-medium">Bandeja de Gestión</p>
             {user && user.role?.code !== 'ADMIN' && user.role?.code !== 'SUPER_ADMIN' && (
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

          <Link href="/requests/new">
            <Button className="bg-[#1B2541] hover:bg-[#1B2541]/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Nueva Solicitud
            </Button>
          </Link>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <RequestsToolbar 
        filters={filters} 
        setFilters={setFilters} 
        onSearch={fetchRequests} 
      />

      {loading ? (
        <div className="flex justify-center p-12 text-slate-500 animate-pulse">
            <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-[#1B2541] animate-spin" />
                <p>Cargando tickets...</p>
            </div>
        </div>
      ) : (
        <DataTable 
            columns={columns} 
            data={data} 
        />
      )}
    </div>
  );
}