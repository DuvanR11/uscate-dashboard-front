'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { ComplaintItem } from '@/types/complaint';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Copy, Pencil, Eye, FileWarning, Gavel } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  COMPLAINT_PRIORITY_CONFIG,
  COMPLAINT_STATUS_CONFIG,
  COMPLAINT_TYPE_LABELS,
} from './complaint-status.constants';

interface ColumnsProps {
  currentUserId?: string;
  // "Tier ADMIN" — ver ComplaintsService.canAccessComplaint(): con esto
  // en true se ve/gestiona todo; sin él, solo lo asignado a currentUserId.
  hasModuleWrite?: boolean;
}

export const columns = ({ currentUserId, hasModuleWrite }: ColumnsProps): ColumnDef<ComplaintItem>[] => [
  {
    accessorKey: 'publicCode',
    header: 'Código',
    cell: ({ row }) => (
      <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
        {row.original.publicCode}
      </span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.original.type;
      const Icon = type === 'DEMANDA' ? Gavel : FileWarning;

      return (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <Icon size={14} className={type === 'DEMANDA' ? 'text-purple-500' : 'text-red-500'} />
          {COMPLAINT_TYPE_LABELS[type] || type}
        </div>
      );
    },
  },
  {
    accessorKey: 'subject',
    header: 'Asunto',
    cell: ({ row }) => (
      <div className="max-w-[250px] truncate font-semibold text-primary" title={row.getValue('subject')}>
        {row.getValue('subject')}
      </div>
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Prioridad',
    cell: ({ row }) => {
      const priority = row.original.priority;
      const config = COMPLAINT_PRIORITY_CONFIG[priority] || COMPLAINT_PRIORITY_CONFIG.MEDIUM;
      const Icon = config.icon;

      return (
        <div className={`flex items-center w-fit px-2 py-0.5 rounded-full text-xs border ${config.color}`}>
          <Icon size={12} className="mr-1.5" />
          {config.label}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.original.status;
      const config = COMPLAINT_STATUS_CONFIG[status];

      return (
        <Badge variant="outline" className={`${config?.badgeClass} font-medium border`}>
          {config?.label || status}
        </Badge>
      );
    },
  },
  {
    id: 'citizen',
    header: 'Ciudadano',
    cell: ({ row }) => {
      const prospect = row.original.prospect;

      if (!prospect) {
        return <span className="text-slate-400 text-xs italic">Sin datos</span>;
      }

      return (
        <span className="text-xs font-medium text-slate-700">
          {prospect.firstName} {prospect.lastName}
        </span>
      );
    },
  },
  {
    id: 'assignedTo',
    header: 'Asignado a',
    cell: ({ row }) => {
      const assignedUser = row.original.assignedUser;

      if (!assignedUser) {
        return <span className="text-slate-400 text-xs italic">Sin asignar</span>;
      }

      const isMine = assignedUser.id === currentUserId;

      return (
        <span className={`text-xs font-medium ${isMine ? 'text-emerald-700' : 'text-slate-700'}`}>
          {assignedUser.fullName} {isMine && '(tú)'}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Fecha',
    cell: ({ row }) => (
      <span className="text-xs text-slate-500">
        {new Date(row.original.createdAt).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: '2-digit',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const complaint = row.original;
      const isMine = complaint.assignedUser?.id === currentUserId;
      const canManage = hasModuleWrite || isMine;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[190px]">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>

            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(complaint.publicCode);
                toast.success('Código copiado al portapapeles');
              }}
            >
              <Copy className="mr-2 h-3.5 w-3.5 text-slate-400" />
              Copiar Código
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {canManage ? (
              <DropdownMenuItem asChild>
                <Link href={`/denuncias/${complaint.id}`} className="cursor-pointer font-medium">
                  <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" />
                  Gestionar
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href={`/denuncias/${complaint.id}`} className="cursor-pointer font-medium">
                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-600" />
                  Ver Detalle
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
