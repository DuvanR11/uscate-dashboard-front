'use client';

import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link"; // Importamos Link
import { 
  MoreHorizontal, 
  Edit, 
  UserX, 
  UserCheck, 
  Target, 
  CreditCard, 
  Smartphone
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ColumnsProps {
  // onEdit ya no es necesaria porque usamos Link
  onToggleStatus: (user: User) => void;
}

export const columns = ({ onToggleStatus }: ColumnsProps): ColumnDef<User>[] => [
  {
    accessorKey: "fullName",
    header: "Nombre",
    cell: ({ row }) => {
      // Manejo seguro de localidad
      const loc = row.original.locality;
      const localityName = (typeof loc === 'object' && loc !== null) ? loc.name : loc;

      return (
        <div className="flex flex-col min-w-[150px]">
          <span className="font-medium text-foreground">{row.original.fullName}</span>
          
          {!row.original.isActive && (
            <span className="text-[10px] text-destructive font-bold uppercase tracking-wider">Inactivo</span>
          )}
          
          {localityName && (
             <span className="text-[10px] text-muted-foreground truncate">
               {String(localityName)}
             </span>
          )}
        </div>
      );
    }
  },
  {
    accessorKey: "documentNumber",
    header: "Documento",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <CreditCard className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-sm text-foreground/80">
            {row.original.documentNumber || "N/A"}
        </span>
      </div>
    )
  },
  {
    accessorKey: "phone",
    header: "Celular",
    cell: ({ row }) => {
      const phone = row.original.phone;
      if (!phone) return <span className="text-muted-foreground text-xs">Sin datos</span>;

      return (
        <div className="flex items-center gap-2 group cursor-pointer" 
             onClick={() => {
                navigator.clipboard.writeText(phone);
                toast.success("Teléfono copiado");
             }}
             title="Clic para copiar"
        >
          <div className="p-1 rounded-full bg-green-50 text-green-600">
             <Smartphone className="h-3 w-3" />
          </div>
          <span className="font-mono text-sm group-hover:text-primary transition-colors">
            {phone}
          </span>
        </div>
      );
    }
  },
  {
    accessorKey: "email",
    header: "Correo",
    cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.email}</span>
  },
  {
    accessorKey: "requestsGoal",
    header: "Meta",
    cell: ({ row }) => {
      const goal = row.original.requestsGoal || 0;
      return (
        <div className="flex items-center gap-1.5">
          <Target className={`h-3.5 w-3.5 ${goal > 0 ? 'text-primary' : 'text-slate-300'}`} />
          <span className={`font-mono font-medium ${goal > 0 ? 'text-foreground' : 'text-slate-400'}`}>
            {goal}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "role.id", 
    header: "Rol",
    cell: ({ row }) => {
      const roleName = row.original.role?.name || "Sin Rol"; 
      const roleCode = row.original.role?.code;
      
      let badgeStyle = "bg-primary/5 text-primary border-primary/20"; 
      
      if (roleCode === 'SUPER_ADMIN') {
        badgeStyle = "bg-destructive/10 text-destructive border-destructive/20";
      } else if (roleCode === 'SECRETARY') {
        badgeStyle = "bg-secondary/20 text-yellow-700 border-secondary/50";
      } else if (roleCode === 'CITIZEN') {
        badgeStyle = "bg-green-50 text-green-700 border-green-200";
      }

      return (
        <Badge variant="outline" className={`font-medium border whitespace-nowrap ${badgeStyle}`}>
          {roleName}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            
            {/* CAMBIO AQUÍ: Usamos Link para ir a la página de edición */}
            <DropdownMenuItem asChild>
              <Link href={`/users/${user.id}`} className="cursor-pointer flex items-center w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar datos
              </Link>
            </DropdownMenuItem>

            {user.phone && (
                <DropdownMenuItem onClick={() => window.open(`https://wa.me/57${user.phone}`, '_blank')}>
                    <Smartphone className="mr-2 h-4 w-4 text-green-600" />
                    Abrir WhatsApp
                </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
                onClick={() => onToggleStatus(user)}
                className={user.isActive ? "text-destructive focus:text-destructive" : "text-green-600 focus:text-green-600"}
            >
                {user.isActive ? (
                    <>
                        <UserX className="mr-2 h-4 w-4" /> Desactivar
                    </>
                ) : (
                    <>
                        <UserCheck className="mr-2 h-4 w-4" /> Activar
                    </>
                )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];