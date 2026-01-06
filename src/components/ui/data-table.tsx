'use client';

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
// Importamos hooks de navegación para manejar la paginación por URL
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  toolbar?: React.ReactElement
  // NUEVA PROP: Total de páginas que calcula el backend
  pageCount: number; 
  totalRecords: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  totalRecords,
  pageCount, // Recibimos el total de páginas
}: DataTableProps<TData, TValue>) {
  
  // Hooks para la URL
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Obtenemos la página actual de la URL (por defecto 1)
 const page = searchParams?.get("page") ? Number(searchParams.get("page")) : 1;
  const perPage = searchParams?.get("limit") ? Number(searchParams.get("limit")) : 10;

  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])

  // Función para crear QueryString
  const createQueryString = React.useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString());
      
      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, String(value));
        }
      }
      return newSearchParams.toString();
    },
    [searchParams]
  );

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount, // Importante: Le decimos a la tabla cuántas páginas existen en total en el server
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      // Sincronizamos el estado de la tabla con la URL
      pagination: {
        pageIndex: page - 1, // TanStack usa base 0, la URL usa base 1
        pageSize: perPage,
      },
    },
    enableRowSelection: true,
    manualPagination: true, // <--- ESTO ES CRUCIAL: Desactiva la lógica cliente
    manualFiltering: true,  // Opcional: Si el filtrado también lo hace el back
    manualSorting: true,    // Opcional: Si el ordenamiento también lo hace el back
    
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Funciones de navegación por URL
  const handleNextPage = () => {
    router.push(`${pathname}?${createQueryString({
      page: page + 1,
    })}`);
  };

  const handlePreviousPage = () => {
    router.push(`${pathname}?${createQueryString({
      page: page - 1,
    })}`);
  };

  return (
    <div className="space-y-4">
      {toolbar && React.isValidElement(toolbar) 
        ? React.cloneElement(toolbar as React.ReactElement<any>, { table }) 
        : null
      }
      
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación Controlada por URL */}
      <div className="flex items-center justify-between px-2 py-4"> 
          <div className="flex-1 text-sm text-muted-foreground">
              {/* Total records display */}
              Total: {totalRecords} registros.
              {/* Optional: Selected count if needed */}
              {table.getFilteredSelectedRowModel().rows.length > 0 && (
                <span className="ml-2">
                  ({table.getFilteredSelectedRowModel().rows.length} seleccionados)
                </span>
              )}
          </div>
          
          <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center justify-center text-sm font-medium">
                  Página {page} de {pageCount}
              </div>
              <div className="flex items-center space-x-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={page <= 1}
                  >
                      Anterior
                  </Button>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= pageCount}
                  >
                      Siguiente
                  </Button>
              </div>
          </div>
      </div>
    </div>
  )
}