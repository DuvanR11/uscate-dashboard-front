'use client';

import Link from "next/link"; 
import { ColumnDef } from "@tanstack/react-table";
import { Prospect } from "@/types/prospect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import { 
  ArrowUpDown, MoreHorizontal, MessageCircle, User, 
  Pencil, Trash2, History, Briefcase, Hash, Tag, 
  ShieldCheck,
  Circle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

export const columns: ColumnDef<Prospect>[] = [
  {
    accessorKey: "voteConfirmed",
    header: "Estado Voto",
    cell: ({ row }) => {
      const isConfirmed = row.original.voteConfirmed;

      return (
        <div className="flex justify-center">
          {isConfirmed ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 flex gap-1 items-center px-2 py-1">
               <ShieldCheck className="h-3 w-3" />
               Asegurado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 border-slate-300 flex gap-1 items-center px-2 py-1">
               <Circle className="h-3 w-3" />
               Pendiente
            </Badge>
          )}
        </div>
      );
    },
  },
  // 1. NOMBRE (Búsqueda de texto)
  {
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    id: "fullName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => (
        <div className="flex flex-col ml-1">
            <span className="font-bold text-[#1B2541]">{row.original.firstName} {row.original.lastName}</span>
            <span className="text-xs text-slate-500">{row.original.email || ''}</span>
        </div>
    ),
    enableSorting: true,
  },

  // 2. DOCUMENTO (Búsqueda exacta o parcial)
  {
    accessorKey: "documentNumber",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cédula" />,
    cell: ({ row }) => {
      const doc = row.getValue("documentNumber") as string;
      if (!doc) return <span className="text-slate-300 text-xs">-</span>;
      return (
        <div className="flex items-center gap-1.5">
            <Hash className="h-3 w-3 text-slate-400" />
            <span className="text-xs font-mono font-medium text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
                {doc}
            </span>
        </div>
      );
    },
  },

  // 3. OCUPACIÓN (Filtro de Selección Múltiple)
  {
    id: "occupation",
    accessorFn: (row) => row.occupation?.name || "Sin ocupación",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ocupación" />,
    cell: ({ row }) => {
      const name = row.getValue("occupation") as string;
      return (
        <div className="flex items-center gap-2">
            <Briefcase className="h-3 w-3 text-slate-400" />
            <span className="text-sm text-slate-700 truncate max-w-[120px]" title={name}>
                {name}
            </span>
        </div>
      );
    },
    // LOGICA DE FILTRO: Permite seleccionar varios (Ej: Abogado O Ingeniero)
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  // 4. SEGMENTO (Filtro de Selección Múltiple)
  {
    id: "segment",
    accessorFn: (row) => row.segment?.name || "Sin segmento",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Segmento" />,
    cell: ({ row }) => {
      const name = row.getValue("segment") as string;
      return (
        <Badge variant="outline" className="font-medium bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
            {name}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  // 5. CONTACTO
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contacto" />,
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string;
      if (!phone) return <span className="text-slate-300 text-xs italic">Sin cel</span>;
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-slate-600">{phone}</span>
          <a href={`https://wa.me/57${phone}`} target="_blank" className="text-green-600 hover:bg-green-100 p-1 rounded-full">
            <MessageCircle size={16} />
          </a>
        </div>
      );
    },
  },

  // 6. LÍDER (Filtro de Selección Múltiple)
  {
    id: "leader",
    accessorFn: (row) => row.leader?.fullName || "Sin asignar",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Líder" />,
    cell: ({ row }) => {
      const leaderName = row.getValue("leader") as string;
      return (
        <div className="flex items-center gap-2 text-sm">
            <User className="h-3 w-3 text-[#FFC400]" />
            <span className="text-[#1B2541] font-medium text-xs truncate max-w-[100px]">{leaderName}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  // 7. ETIQUETAS / TAGS (Filtro complejo de Array)
  {
    id: "tags",
    // Convertimos el array de objetos a un string simple para visualización
    accessorFn: (row) => row.tags?.map((t) => t.name).join(", ") || "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Intereses" />,
    cell: ({ row }) => {
      const tags = row.original.tags;
      if (!tags || tags.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-[10px] h-5 px-1 bg-slate-100 text-slate-600">
              {tag.name}
            </Badge>
          ))}
          {tags.length > 2 && <span className="text-[10px] text-slate-400">+{tags.length - 2}</span>}
        </div>
      );
    },
    // LOGICA AVANZADA: Filtra si la fila contiene ALGUNO de los tags seleccionados
    filterFn: (row, id, value: string[]) => {
       const rowValue = row.getValue(id) as string;
       return value.some((val) => rowValue.includes(val));
    },
  },

  // 8. ACCIONES
  {
    id: "actions",
    cell: ({ row }) => {
      const prospect = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/prospects/${prospect.id}`} className="cursor-pointer flex items-center w-full">
                 <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 cursor-pointer">
               <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];