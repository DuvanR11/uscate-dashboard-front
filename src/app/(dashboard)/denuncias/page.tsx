'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Globe, UserCheck } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { columns } from '@/components/dashboard/complaints/columns';
import { ComplaintsToolbar } from '@/components/dashboard/complaints/complaints-toolbar';
import { listComplaints } from '@/lib/api/complaints';
import { ComplaintItem } from '@/types/complaint';
import { useAuthStore } from '@/store/auth-store';
import { usePermission } from '@/hooks/use-permission';
import { DENUNCIAS_MODULE } from '@/components/dashboard/complaints/complaint-status.constants';

export default function ComplaintsPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const canRead = usePermission(DENUNCIAS_MODULE, 'canRead');
  const canWrite = usePermission(DENUNCIAS_MODULE, 'canWrite');

  const filters = {
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'ALL',
    priority: searchParams.get('priority') || 'ALL',
    type: searchParams.get('type') || 'ALL',
  };

  const updateFilters = (newFilters: typeof filters) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newFilters.search) params.set('search', newFilters.search);
    else params.delete('search');

    if (newFilters.status && newFilters.status !== 'ALL') params.set('status', newFilters.status);
    else params.delete('status');

    if (newFilters.priority && newFilters.priority !== 'ALL') params.set('priority', newFilters.priority);
    else params.delete('priority');

    if (newFilters.type && newFilters.type !== 'ALL') params.set('type', newFilters.type);
    else params.delete('type');

    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const fetchComplaints = useCallback(async () => {
    if (!user || !canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const params: Record<string, string | number> = {
        page: searchParams.get('page') || 1,
        limit: searchParams.get('limit') || 10,
      };

      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const type = searchParams.get('type');
      const search = searchParams.get('search');

      if (status && status !== 'ALL') params.status = status;
      if (priority && priority !== 'ALL') params.priority = priority;
      if (type && type !== 'ALL') params.type = type;
      if (search) params.search = search;

      const response = await listComplaints(params);

      setData(response.data);
      setTotalRecords(response.meta.total);
      setPageCount(response.meta.lastPage);
    } catch (error: any) {
      toast.error('Error cargando denuncias y demandas', {
        description: error?.response?.data?.message || 'No se pudo cargar la bandeja.',
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams, user, canRead]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  if (!user) {
    return <div className="p-12 text-center text-slate-500">Cargando usuario...</div>;
  }

  if (!canRead) {
    return (
      <div className="p-12 text-center text-slate-500">
        No tienes permisos para consultar denuncias y demandas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary">Denuncias y Demandas</h2>

          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <p className="font-medium">Bandeja de Casos Ciudadanos</p>

            {canWrite ? (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Globe size={12} /> Visión Global
              </span>
            ) : (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <UserCheck size={12} /> Mis Casos Asignados
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sin botón "Nuevo caso": la creación es exclusivamente pública, vía
          /denuncia-publica — nadie del equipo crea denuncias/demandas desde
          el dashboard, solo asigna/gestiona lo que el ciudadano radica. */}

      <ComplaintsToolbar filters={filters} setFilters={updateFilters} />

      {loading ? (
        <div className="flex justify-center p-12 text-slate-500 animate-pulse">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
            <p>Cargando casos...</p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns({ currentUserId: user.id, hasModuleWrite: canWrite })}
          data={data}
          totalRecords={totalRecords}
          pageCount={pageCount}
        />
      )}
    </div>
  );
}
