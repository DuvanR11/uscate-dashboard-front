'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { DocumentFolderItem } from '@/types/document';

interface DocumentsToolbarProps {
  filters: { search: string; folderId: string };
  setFilters: (filters: any) => void;
  folders: DocumentFolderItem[];
}

export function DocumentsToolbar({ filters, setFilters, folders }: DocumentsToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const applyFilters = (key?: string, value?: string) => {
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
    setFilters({ search: '', folderId: 'ALL' });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-6 p-4 bg-slate-50 border rounded-lg">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input
          placeholder="Buscar documentos..."
          className="pl-9 bg-white border-slate-200"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filters.folderId} onValueChange={(val) => applyFilters('folderId', val)}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Carpeta" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">Todas las carpetas</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => applyFilters()} className="bg-primary hover:bg-primary/90">
          Filtrar
        </Button>

        {(filters.search || filters.folderId !== 'ALL') && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros">
            <X className="h-4 w-4 text-slate-500" />
          </Button>
        )}
      </div>
    </div>
  );
}
