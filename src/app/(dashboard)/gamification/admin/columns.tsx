// components/dashboard/gamification/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TaskPlatform } from '@/types/gamification';
import { Facebook, Instagram, Twitter, Link as LinkIcon, Video, MessageCircle, MoreHorizontal, Pencil, Trash2, Power } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Tipo de dato
export type Task = {
  id: number;
  title: string;
  platform: TaskPlatform;
  points: number;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  postUrl: string;
}

// Helper de iconos
const getIcon = (platform: string) => {
    switch(platform) {
        case 'FACEBOOK': return <Facebook className="text-blue-600 h-5 w-5" />;
        case 'INSTAGRAM': return <Instagram className="text-pink-600 h-5 w-5" />;
        case 'TIKTOK': return <Video className="text-black h-5 w-5" />;
        case 'TWITTER': return <Twitter className="text-sky-500 h-5 w-5" />;
        case 'WHATSAPP': return <MessageCircle className="text-green-500 h-5 w-5" />;
        default: return <LinkIcon className="text-gray-500 h-5 w-5" />;
    }
};

// Acciones (Recibimos funciones desde el padre)
interface ActionProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (id: number) => void;
    onToggle: (id: number) => void;
}

const ActionsCell = ({ task, onEdit, onDelete, onToggle }: ActionProps) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggle(task.id)}>
                    <Power className="mr-2 h-4 w-4" /> {task.isActive ? 'Desactivar' : 'Activar'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// Definición de columnas
export const getColumns = (
    onEdit: (t: Task) => void, 
    onDelete: (id: number) => void,
    onToggle: (id: number) => void
): ColumnDef<Task>[] => [
  {
    accessorKey: "platform",
    header: "Red",
    cell: ({ row }) => <div className="pl-2">{getIcon(row.getValue("platform"))}</div>,
  },
  {
    accessorKey: "title",
    header: "Misión",
    cell: ({ row }) => (
        <div>
            <div className="font-bold text-[#1B2541]">{row.getValue("title")}</div>
            <a href={row.original.postUrl} target="_blank" className="text-xs text-blue-600 hover:underline truncate max-w-[200px] block">
                Ver enlace
            </a>
        </div>
    ),
  },
  {
    accessorKey: "points",
    header: "Puntos",
    cell: ({ row }) => (
        <span className="bg-[#FFC400]/20 text-[#1B2541] border border-[#FFC400]/40 text-xs font-bold px-2 py-1 rounded-full">
            +{row.getValue("points")} pts
        </span>
    ),
  },
  {
    accessorKey: "startDate",
    header: "Vigencia",
    cell: ({ row }) => {
        const start = new Date(row.getValue("startDate")).toLocaleDateString();
        const end = row.original.endDate ? new Date(row.original.endDate).toLocaleDateString() : null;
        return (
            <div className="text-xs text-slate-500">
                <div className="flex gap-1"><span className="font-bold text-green-600">IN:</span> {start}</div>
                {end && <div className="flex gap-1"><span className="font-bold text-red-500">OFF:</span> {end}</div>}
            </div>
        )
    },
  },
  {
    accessorKey: "isActive",
    header: "Estado",
    cell: ({ row }) => {
        const active = row.getValue("isActive");
        return active ? (
            <span className="inline-flex items-center gap-1.5 text-green-700 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Activa
            </span>
        ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-bold bg-slate-200 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactiva
            </span>
        )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell task={row.original} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
  },
]