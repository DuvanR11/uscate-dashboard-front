'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { columns } from '@/components/dashboard/documents/columns';
import { DocumentsToolbar } from '@/components/dashboard/documents/documents-toolbar';
import { UploadDocumentDialog } from '@/components/dashboard/documents/upload-dialog';
import { usePermission } from '@/hooks/use-permission';
import { getDocuments, getDocumentFolders } from '@/lib/api/documents';
import { DocumentItem, DocumentFolderItem } from '@/types/document';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<DocumentFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const canRead = usePermission('GESTION_DOCUMENTAL', 'canRead');
  const canWrite = usePermission('GESTION_DOCUMENTAL', 'canWrite');
  const canDelete = usePermission('GESTION_DOCUMENTAL', 'canDelete');

  const filters = {
    search: searchParams.get('search') || '',
    folderId: searchParams.get('folderId') || 'ALL',
  };

  const updateFilters = (newFilters: any) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newFilters.search) params.set('search', newFilters.search);
    else params.delete('search');

    if (newFilters.folderId && newFilters.folderId !== 'ALL') {
      params.set('folderId', newFilters.folderId);
    } else {
      params.delete('folderId');
    }

    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const fetchDocuments = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await getDocuments({
        page: Number(searchParams.get('page') || 1),
        limit: Number(searchParams.get('limit') || 10),
        search: searchParams.get('search') || undefined,
        folderId: searchParams.get('folderId') || undefined,
      });

      setData(response.data);
      setTotalRecords(response.meta.total);
      setPageCount(response.meta.lastPage);
    } catch (error: any) {
      toast.error('Error cargando documentos', {
        description: error?.response?.data?.message || 'No se pudo cargar el repositorio.',
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams, canRead]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (!canRead) return;
    getDocumentFolders()
      .then(setFolders)
      .catch(() => {});
  }, [canRead]);

  if (!canRead) {
    return (
      <div className="p-12 text-center text-slate-500">
        No tienes permisos para consultar Gestión Documental.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary">
            Gestión Documental
          </h2>
          <p className="text-muted-foreground mt-1 font-medium">
            Campaña - Oficina · repositorio privado de documentos
          </p>
        </div>

        {canWrite && <UploadDocumentDialog folders={folders} onUploaded={fetchDocuments} />}
      </div>

      <DocumentsToolbar filters={filters} setFilters={updateFilters} folders={folders} />

      {loading ? (
        <div className="flex justify-center p-12 text-slate-500 animate-pulse">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
            <p>Cargando documentos...</p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns({ canWrite, canDelete })}
          data={data}
          totalRecords={totalRecords}
          pageCount={pageCount}
        />
      )}
    </div>
  );
}
