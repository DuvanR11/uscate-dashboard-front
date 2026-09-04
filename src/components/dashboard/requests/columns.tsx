'use client';

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { RequestItem } from "@/types/request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  AlertCircle,
  ArrowUpCircle,
  MinusCircle,
  ArrowDownCircle,
  FileText,
  ShieldAlert,
  Building2,
  Pencil,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MODULE_BY_TYPE = {
  INTERNAL: "SOLICITUDES_INTERNAS",
  LEGISLATIVE: "SOLICITUDES_LEGISLATIVAS",
  SECURITY_APP: "SOLICITUDES_SEGURIDAD",
} as const;

type RequestTypeKey = keyof typeof MODULE_BY_TYPE;

const priorityConfig: Record<string, { label: string; color: string; icon: any }> = {
  CRITICAL: { label: "Crítica", color: "text-red-700 bg-red-50 border-red-200", icon: AlertCircle },
  HIGH: { label: "Alta", color: "text-orange-700 bg-orange-50 border-orange-200", icon: ArrowUpCircle },
  MEDIUM: { label: "Media", color: "text-blue-700 bg-blue-50 border-blue-200", icon: MinusCircle },
  LOW: { label: "Baja", color: "text-slate-600 bg-slate-50 border-slate-200", icon: ArrowDownCircle },
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-300",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En Progreso",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",
};

interface ColumnsProps {
  permissions?: any[];
}

// EXCEPCIÓN F3: `columns` es una fábrica de ColumnDef (no un componente ni
// un hook) invocada como `columns({ permissions })` desde fuera del árbol de
// render; el módulo a chequear (`MODULE_BY_TYPE[type]`) depende de
// `row.original.type` dentro de un `cell` por fila. No hay un nivel superior
// de componente donde llamar `usePermission` de forma incondicional, así que
// se mantiene la lectura directa del array `permissions` recibido por props.
const canWriteRequestType = (type: string, permissions: any[] = []) => {
  const module = MODULE_BY_TYPE[type as RequestTypeKey];

  return permissions.some(
    (p) =>
      (p.module === "SOLICITUDES_GLOBAL" || p.module === module) &&
      p.canWrite === true
  );
};

const canReadRequestType = (type: string, permissions: any[] = []) => {
  const module = MODULE_BY_TYPE[type as RequestTypeKey];

  return permissions.some(
    (p) =>
      (p.module === "SOLICITUDES_GLOBAL" || p.module === module) &&
      p.canRead === true
  );
};

export const columns = ({ permissions = [] }: ColumnsProps): ColumnDef<RequestItem>[] => [
  {
    accessorKey: "id",
    header: "Código",
    cell: ({ row }) => {
      const request = row.original;

      const displayCode =
        request.publicCode ||
        request.externalCode ||
        `#${request.id}`;

      return (
        <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
          {displayCode}
        </span>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.original.type;

      return (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          {type === "INTERNAL" && (
            <>
              <Building2 size={14} className="text-blue-500" /> Interna
            </>
          )}
          {type === "LEGISLATIVE" && (
            <>
              <FileText size={14} className="text-purple-500" /> Legislativa
            </>
          )}
          {type === "SECURITY_APP" && (
            <>
              <ShieldAlert size={14} className="text-red-500" /> Seguridad
            </>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "subject",
    header: "Asunto",
    cell: ({ row }) => (
      <div
        className="max-w-[250px] truncate font-semibold text-primary"
        title={row.getValue("subject")}
      >
        {row.getValue("subject")}
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Prioridad",
    cell: ({ row }) => {
      const priority = row.original.priority;
      const config = priorityConfig[priority] || priorityConfig.MEDIUM;
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
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.original.status;

      return (
        <Badge variant="outline" className={`${statusStyles[status]} font-medium border`}>
          {statusLabels[status] || status}
        </Badge>
      );
    },
  },
  {
    id: "requester",
    header: "Solicitante",
    cell: ({ row }) => {
      const request = row.original;
      const prospect = request.prospect;
      const createdBy = request.createdBy;

      if (prospect) {
        return (
          <span className="text-xs font-medium text-slate-700">
            {prospect.firstName} {prospect.lastName}
          </span>
        );
      }

      if (createdBy) {
        return (
          <span className="text-xs font-medium text-slate-700">
            {createdBy.fullName}
          </span>
        );
      }

      return (
        <span className="text-slate-400 text-xs italic">
          Anónimo / Interno
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-xs text-slate-500">
        {new Date(row.original.createdAt).toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const request = row.original;
      const codeToCopy = request.publicCode || request.externalCode || String(request.id);

      const canWrite = canWriteRequestType(request.type, permissions);
      const canRead = canReadRequestType(request.type, permissions);

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

            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(codeToCopy)}>
              <Copy className="mr-2 h-3.5 w-3.5 text-slate-400" />
              Copiar Código
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {canWrite ? (
              <DropdownMenuItem asChild>
                <Link href={`/requests/${request.id}`} className="cursor-pointer font-medium">
                  <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" />
                  Gestionar / Responder
                </Link>
              </DropdownMenuItem>
            ) : canRead ? (
              <DropdownMenuItem asChild>
                <Link href={`/requests/${request.id}`} className="cursor-pointer font-medium">
                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-600" />
                  Ver Detalle
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className="text-slate-400">
                <EyeOff className="mr-2 h-3.5 w-3.5" />
                Sin acceso
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];