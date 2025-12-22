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
  Copy
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- CONFIGURACIÓN DEL SEMÁFORO DE PRIORIDAD ---
const priorityConfig: Record<string, { label: string; color: string; icon: any }> = {
  CRITICAL: { label: "Crítica", color: "text-red-700 bg-red-50 border-red-200", icon: AlertCircle },
  HIGH:     { label: "Alta",    color: "text-orange-700 bg-orange-50 border-orange-200", icon: ArrowUpCircle },
  MEDIUM:   { label: "Media",   color: "text-blue-700 bg-blue-50 border-blue-200", icon: MinusCircle },
  LOW:      { label: "Baja",    color: "text-slate-600 bg-slate-50 border-slate-200", icon: ArrowDownCircle },
};

// --- CONFIGURACIÓN DE ESTADOS ---
const statusStyles: Record<string, string> = {
  PENDING:     "bg-yellow-100 text-yellow-800 border-yellow-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
  RESOLVED:    "bg-emerald-100 text-emerald-800 border-emerald-300",
  CLOSED:      "bg-slate-100 text-slate-600 border-slate-300",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En Progreso",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado"
};

// --- DEFINICIÓN DE COLUMNAS ---
export const columns: ColumnDef<RequestItem>[] = [
  // 1. CÓDIGO
  {
    accessorKey: "id",
    header: "Código",
    cell: ({ row }) => {
      const type = row.original.type;
      
      // SOLUCIÓN: Convertimos id a string antes de manipularlo
      // O simplemente lo mostramos tal cual si es un número autoincremental
      const idString = row.original.id.toString(); 

      const displayCode = type === 'INTERNAL' 
        ? row.original.publicCode 
        : row.original.externalCode || `#${idString}`; 
      
      return (
        <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
            {displayCode || "---"}
        </span>
      );
    },
  },
  // 2. TIPO
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          {type === 'INTERNAL' && <><Building2 size={14} className="text-blue-500" /> Interna</>}
          {type === 'LEGISLATIVE' && <><FileText size={14} className="text-purple-500" /> Legislativa</>}
          {type === 'SECURITY_APP' && <><ShieldAlert size={14} className="text-red-500"/> Seguridad</>}
        </div>
      );
    }
  },

  // 3. ASUNTO
  {
    accessorKey: "subject",
    header: "Asunto",
    cell: ({ row }) => (
      <div className="max-w-[250px] truncate font-semibold text-[#1B2541]" title={row.getValue("subject")}>
        {row.getValue("subject")}
      </div>
    ),
  },

  // 4. PRIORIDAD
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

  // 5. ESTADO
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="outline" className={`${statusStyles[status]} font-medium border`}>
          {statusLabels[status]}
        </Badge>
      );
    },
  },

  // 6. ASIGNADO / SOLICITANTE
  {
    id: "requester",
    header: "Solicitante",
    cell: ({ row }) => {
        const prospect = row.original.prospect;
        return prospect ? (
            <span className="text-xs font-medium text-slate-700">{prospect.firstName} {prospect.lastName}</span>
        ) : (
            <span className="text-slate-400 text-xs italic">Anónimo / Interno</span>
        );
    },
  },

  // 7. FECHA
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => {
      return (
        <span className="text-xs text-slate-500">
            {new Date(row.original.createdAt).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', year: '2-digit'
            })}
        </span>
      );
    },
  },

  // 8. ACCIONES
  {
    id: "actions",
    cell: ({ row }) => {
      const request = row.original;
      // Determinamos qué código copiar
      const codeToCopy = request.type === 'INTERNAL' ? request.publicCode : request.externalCode;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            
            {codeToCopy && (
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(codeToCopy || "")}>
                <Copy className="mr-2 h-3.5 w-3.5 text-slate-400" /> Copiar Código
                </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            {/* ENLACE A LA PÁGINA DE EDICIÓN COMPLETA */}
            <DropdownMenuItem asChild>
              <Link href={`/requests/${request.id}`} className="cursor-pointer font-medium">
                <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" /> 
                Gestionar / Responder
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];