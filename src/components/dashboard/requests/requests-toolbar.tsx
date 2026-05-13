'use client';

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface RequestsToolbarProps {
  filters: {
    search: string;
    status: string;
    priority: string;
    type: string;
  };
  setFilters: (filters: any) => void; 
  onSearch: () => void; 
}

export function RequestsToolbar({ filters, setFilters }: RequestsToolbarProps) {
  
  // Estado local para el INPUT de texto
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sincronizar el input local si la URL cambia externamente
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Función para aplicar TODOS los filtros (Texto + Dropdowns)
  const applyFilters = (key?: string, value?: string) => {
    const newFilters = {
      ...filters, 
      search: localSearch, 
      ...(key && value ? { [key]: value } : {}) 
    };

    setFilters(newFilters); 
  };

  // Manejador para Enter en el input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  // Limpiar filtros
  const clearFilters = () => {
    setLocalSearch(''); 
    setFilters({ search: '', status: 'ALL', priority: 'ALL', type: 'ALL' }); 
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-6 p-4 bg-slate-50 border rounded-lg">
      
      {/* 1. Buscador de Texto */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input 
          placeholder="Buscar por código, asunto o ciudadano..." 
          className="pl-9 bg-white border-slate-200"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* 2. Filtros Selectores */}
      <div className="flex gap-2 flex-wrap">
        
        {/* Filtro Estado */}
        <Select 
          value={filters.status} 
          onValueChange={(val) => applyFilters('status', val)}
        >
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos (Estado)</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
            <SelectItem value="RESOLVED">Resuelto</SelectItem>
            <SelectItem value="CLOSED">Cerrado</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro Prioridad */}
        <Select 
          value={filters.priority} 
          onValueChange={(val) => applyFilters('priority', val)}
        >
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas (Prioridad)</SelectItem>
            <SelectItem value="LOW">Baja</SelectItem>
            <SelectItem value="MEDIUM">Media</SelectItem>
            <SelectItem value="HIGH">Alta</SelectItem>
            <SelectItem value="CRITICAL">Crítica</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro Tipo */}
        <Select 
          value={filters.type} 
          onValueChange={(val) => applyFilters('type', val)}
        >
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos (Tipos)</SelectItem>
            <SelectItem value="INTERNAL">Interna (PQR)</SelectItem>
            <SelectItem value="LEGISLATIVE">Legislativa</SelectItem>
            <SelectItem value="SECURITY_APP">Seguridad</SelectItem>
          </SelectContent>
        </Select>

        {/* Botón Filtrar */}
        <Button onClick={() => applyFilters()} className="bg-[#1B2541] hover:bg-[#1B2541]/90">
          Filtrar
        </Button>
        
        {(filters.search || filters.status !== 'ALL' || filters.priority !== 'ALL' || filters.type !== 'ALL') && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros">
                <X className="h-4 w-4 text-slate-500" />
            </Button>
        )}
      </div>
    </div>
  );
}