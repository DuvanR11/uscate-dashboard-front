'use client';

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { usePermission } from "@/hooks/use-permission";

const MODULE_BY_TYPE = {
  INTERNAL: "SOLICITUDES_INTERNAS",
  LEGISLATIVE: "SOLICITUDES_LEGISLATIVAS",
  SECURITY_APP: "SOLICITUDES_SEGURIDAD",
} as const;

interface RequestsToolbarProps {
  filters: {
    search: string;
    status: string;
    priority: string;
    type: string;
  };
  setFilters: (filters: any) => void;
  onSearch?: () => void;
}

export function RequestsToolbar({
  filters,
  setFilters,
}: RequestsToolbarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  const canReadGlobal = usePermission("SOLICITUDES_GLOBAL", "canRead");
  const canReadInternalOwn = usePermission("SOLICITUDES_INTERNAS", "canRead");
  const canReadLegislativeOwn = usePermission("SOLICITUDES_LEGISLATIVAS", "canRead");
  const canReadSecurityOwn = usePermission("SOLICITUDES_SEGURIDAD", "canRead");

  const availableTypes = {
    INTERNAL: canReadGlobal || canReadInternalOwn,
    LEGISLATIVE: canReadGlobal || canReadLegislativeOwn,
    SECURITY_APP: canReadGlobal || canReadSecurityOwn,
  };

  // canReadType(type) recibe `filters.type`, un string dinámico leído de la
  // URL (no un literal fijo). En vez de forzar usePermission con un
  // argumento variable, reutiliza los booleanos ya resueltos arriba (todos
  // calculados con llamadas incondicionales al hook).
  const canReadType = (type: keyof typeof MODULE_BY_TYPE) => availableTypes[type];

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (filters.type !== "ALL") {
      const selectedType = filters.type as keyof typeof MODULE_BY_TYPE;

      if (!canReadType(selectedType)) {
        setFilters({
          ...filters,
          type: "ALL",
        });
      }
    }
  }, [filters.type, availableTypes]);

  const applyFilters = (key?: string, value?: string) => {
    const newFilters = {
      ...filters,
      search: localSearch,
      ...(key && value ? { [key]: value } : {}),
    };

    setFilters(newFilters);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  const clearFilters = () => {
    setLocalSearch("");
    setFilters({
      search: "",
      status: "ALL",
      priority: "ALL",
      type: "ALL",
    });
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
        <Select
          value={filters.status}
          onValueChange={(val) => applyFilters("status", val)}
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

        <Select
          value={filters.priority}
          onValueChange={(val) => applyFilters("priority", val)}
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

        <Select
          value={filters.type}
          onValueChange={(val) => applyFilters("type", val)}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">Todos (Tipos)</SelectItem>

            {availableTypes.INTERNAL && (
              <SelectItem value="INTERNAL">Interna (PQR)</SelectItem>
            )}

            {availableTypes.LEGISLATIVE && (
              <SelectItem value="LEGISLATIVE">Legislativa</SelectItem>
            )}

            {availableTypes.SECURITY_APP && (
              <SelectItem value="SECURITY_APP">Seguridad</SelectItem>
            )}
          </SelectContent>
        </Select>

        <Button
          onClick={() => applyFilters()}
          className="bg-primary hover:bg-primary/90"
        >
          Filtrar
        </Button>

        {(filters.search ||
          filters.status !== "ALL" ||
          filters.priority !== "ALL" ||
          filters.type !== "ALL") && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            title="Limpiar filtros"
          >
            <X className="h-4 w-4 text-slate-500" />
          </Button>
        )}
      </div>
    </div>
  );
}