'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DocumentItem } from '@/types/document';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Download,
  History,
  Eye,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getDownloadUrl } from '@/lib/api/documents';

const EXTENSION_ICON: Record<string, any> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
  webp: FileImage,
};

const EXTENSION_LABEL: Record<string, string> = {
  pdf: 'PDF',
  doc: 'Word',
  docx: 'Word',
  xls: 'Excel',
  xlsx: 'Excel',
  jpg: 'Imagen',
  jpeg: 'Imagen',
  png: 'Imagen',
  webp: 'Imagen',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleDownload(id: string, name: string) {
  try {
    const { url } = await getDownloadUrl(id);
    window.open(url, '_blank');
  } catch (error: any) {
    toast.error('Error al descargar', {
      description: error?.response?.data?.message || `No se pudo descargar "${name}".`,
    });
  }
}

interface ColumnsProps {
  canWrite?: boolean;
  canDelete?: boolean;
}

export const columns = ({}: ColumnsProps = {}): ColumnDef<DocumentItem>[] => [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => {
      const doc = row.original;
      const ext = doc.currentVersion?.extension || '';
      const Icon = EXTENSION_ICON[ext] || FileIcon;

      return (
        <Link
          href={`/documentos/${doc.id}`}
          className="flex items-center gap-2 font-semibold text-primary hover:underline"
        >
          <Icon className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="max-w-[280px] truncate" title={doc.name}>
            {doc.name}
          </span>
        </Link>
      );
    },
  },
  {
    id: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const ext = row.original.currentVersion?.extension;
      if (!ext) return <span className="text-slate-400 text-xs">—</span>;

      return (
        <Badge variant="outline" className="font-medium">
          {EXTENSION_LABEL[ext] || ext.toUpperCase()}
        </Badge>
      );
    },
  },
  {
    id: 'folder',
    header: 'Carpeta',
    cell: ({ row }) => {
      const folder = row.original.folder;

      return folder ? (
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <FolderOpen className="h-3.5 w-3.5 text-slate-400" /> {folder.name}
        </span>
      ) : (
        <span className="text-slate-400 text-xs italic">Raíz</span>
      );
    },
  },
  {
    id: 'version',
    header: 'Versión',
    cell: ({ row }) => (
      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
        v{row.original.currentVersionNumber}
      </span>
    ),
  },
  {
    id: 'size',
    header: 'Tamaño',
    cell: ({ row }) => (
      <span className="text-xs text-slate-500">
        {row.original.currentVersion ? formatSize(row.original.currentVersion.sizeBytes) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Modificado',
    cell: ({ row }) => (
      <span className="text-xs text-slate-500">
        {new Date(row.original.updatedAt).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const doc = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>

            <DropdownMenuItem asChild>
              <Link href={`/documentos/${doc.id}`} className="cursor-pointer">
                <Eye className="mr-2 h-3.5 w-3.5 text-slate-600" /> Ver detalle
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => handleDownload(doc.id, doc.name)}
              className="cursor-pointer"
            >
              <Download className="mr-2 h-3.5 w-3.5 text-blue-600" /> Descargar
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href={`/documentos/${doc.id}#historial`} className="cursor-pointer">
                <History className="mr-2 h-3.5 w-3.5 text-slate-600" /> Historial de versiones
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
