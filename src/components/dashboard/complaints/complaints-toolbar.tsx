'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';

interface Filters {
  search: string;
  status: string;
  priority: string;
  type: string;
}

interface ComplaintsToolbarProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
}

export function ComplaintsToolbar({ filters, setFilters }: ComplaintsToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const applyFilters = (key?: keyof Filters, value?: string) => {
    setFilters({
      ...filters,
      search: localSearch,
      ...(key && value ? { [key]: value } : {}),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applyFilters();
  };

  const clearFilters = () => {
    setLocalSearch('');
    setFilters({ search: '', status: 'ALL', priority: 'ALL', type: 'ALL' });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-6 p-4 bg-slate-50 border rounded-lg">
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

      <div className="flex gap-2 flex-wrap">
        <Select value={filters.status} onValueChange={(val) => applyFilters('status', val)}>
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos (Estado)</SelectItem>
            <SelectItem value="RECEIVED">Recibido</SelectItem>
            <SelectItem value="ASSIGNED">Asignado</SelectItem>
            <SelectItem value="IN_PROGRESS">En Trámite</SelectItem>
            <SelectItem value="RESPONDED">Respondido</SelectItem>
            <SelectItem value="CLOSED">Cerrado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(val) => applyFilters('priority', val)}>
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

        <Select value={filters.type} onValueChange={(val) => applyFilters('type', val)}>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos (Tipos)</SelectItem>
            <SelectItem value="DENUNCIA">Denuncia</SelectItem>
            <SelectItem value="DEMANDA">Demanda</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => applyFilters()} className="bg-primary hover:bg-primary/90">
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
