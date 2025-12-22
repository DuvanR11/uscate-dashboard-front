'use client';

import { Table } from "@tanstack/react-table"
import { X, Download, Search } from "lucide-react"
import * as XLSX from 'xlsx';
import { toast } from "sonner";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableFacetedFilter } from "./data-table-faceted-filter" // El componente de dropdown con checkboxes

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  // --- LÓGICA DE EXPORTACIÓN ---
  const exportFilteredData = () => {
    const rows = table.getFilteredRowModel().rows; // Obtiene SOLO lo filtrado

    if (rows.length === 0) {
        toast.error("No hay datos visibles para exportar");
        return;
    }

    const excelData = rows.map((row: any) => {
        const original = row.original;
        return {
            "Nombre Completo": `${original.firstName} ${original.lastName}`,
            "Cédula": original.documentNumber || '',
            "Teléfono": original.phone || '',
            "Email": original.email || '',
            "Departamento": original.municipality?.department?.name || '',
            "Municipio": original.municipality?.name || '',
            "Segmento": original.segment?.name || '',
            "Ocupación": original.occupation?.name || '',
            "Líder": original.leader?.fullName || 'Sin asignar',
            "Intereses": original.tags?.map((t: any) => t.name).join(", ") || '',
            "Puesto Votación": original.votingStation || '',
            "Mesa": original.votingTable || '',
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prospectos");
    XLSX.writeFile(workbook, `Prospectos_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Se exportaron ${rows.length} registros`);
  };

  // Helper para obtener opciones únicas de una columna (para llenar los dropdowns automáticamente)
  const getUniqueOptions = (columnId: string) => {
    const column = table.getColumn(columnId);
    if (!column) return [];
    const uniqueValues = Array.from(column.getFacetedUniqueValues().keys()).sort();
    return uniqueValues.filter(Boolean).map(value => ({
        label: value,
        value: value,
    }));
  };

  // Helper para Tags (que vienen separados por comas)
  const getTagOptions = () => {
      const column = table.getColumn("tags");
      if (!column) return [];
      // Obtenemos todos los strings "Tag1, Tag2", los unimos, separamos por coma y quitamos duplicados
      const allTags = Array.from(column.getFacetedUniqueValues().keys())
        .join(",").split(",").map(t => t.trim()).filter(Boolean);
      const uniqueTags = Array.from(new Set(allTags)).sort();
      return uniqueTags.map(tag => ({ label: tag, value: tag }));
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
      
      {/* ZONA DE FILTROS */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        
        {/* 1. INPUT NOMBRE */}
        <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Buscar nombre..."
            value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
                table.getColumn("fullName")?.setFilterValue(event.target.value)
            }
            className="h-9 w-[150px] lg:w-[200px] pl-8 bg-white"
            />
        </div>

        {/* 2. INPUT CÉDULA */}
        {table.getColumn("documentNumber") && (
            <Input
            placeholder="Cédula..."
            value={(table.getColumn("documentNumber")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
                table.getColumn("documentNumber")?.setFilterValue(event.target.value)
            }
            className="h-9 w-[120px] bg-white"
            />
        )}

        {/* 3. DROPDOWN SEGMENTO */}
        {table.getColumn("segment") && (
          <DataTableFacetedFilter
            column={table.getColumn("segment")}
            title="Segmento"
            options={getUniqueOptions("segment")}
          />
        )}

        {/* 4. DROPDOWN OCUPACIÓN */}
        {table.getColumn("occupation") && (
          <DataTableFacetedFilter
            column={table.getColumn("occupation")}
            title="Ocupación"
            options={getUniqueOptions("occupation")}
          />
        )}

        {/* 5. DROPDOWN TAGS */}
        {table.getColumn("tags") && (
          <DataTableFacetedFilter
            column={table.getColumn("tags")}
            title="Intereses"
            options={getTagOptions()} 
          />
        )}

        {/* 6. DROPDOWN LÍDER */}
        {table.getColumn("leader") && (
          <DataTableFacetedFilter
            column={table.getColumn("leader")}
            title="Líder"
            options={getUniqueOptions("leader")}
          />
        )}

        {/* BOTÓN LIMPIAR */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3 text-[#E11D48] hover:bg-red-50 hover:text-red-700"
          >
            Limpiar Filtros
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ZONA DE EXPORTAR */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportFilteredData}
        className="ml-auto hidden h-9 lg:flex bg-[#1B2541] text-white hover:bg-[#1B2541]/90 hover:text-white shadow-sm"
      >
        <Download className="mr-2 h-4 w-4" />
        Exportar Vista
      </Button>
    </div>
  )
}