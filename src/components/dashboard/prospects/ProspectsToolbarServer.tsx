'use client';

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce"; 
import { cn } from "@/lib/utils";

// Iconos
import { X, Search, PlusCircle, Check } from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command";

// --- TIPOS ---
interface Option {
  label: string;
  value: string;
}

interface ProspectsToolbarServerProps {
  facets: {
    segments: Option[];
    occupations: Option[];
    leaders: Option[];
    tags: Option[];
  };
}

export function ProspectsToolbarServer({ facets }: ProspectsToolbarServerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estado local del buscador
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(searchValue, 500);

  // 1. Helper para crear QueryString (Evita repetición de código)
  const createQueryString = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      return qs ? `?${qs}` : "";
    },
    []
  );

  // 2. Sincronizar Buscador con URL
  useEffect(() => {
    // Obtenemos el valor actual de la URL (si es null, lo convertimos a string vacío para comparar)
    const currentSearchParam = searchParams.get("search") || "";

    // Si el valor debounced es igual al de la URL, NO hacemos nada.
    // Esto evita el reseteo de página al navegar entre paginación sin buscar.
    if (debouncedSearch === currentSearchParam) return;

    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }

    // Solo reseteamos a página 1 si hubo un cambio REAL en la búsqueda
    params.set("page", "1");
    
    router.push(`${pathname}${createQueryString(params)}`);
  }, [debouncedSearch, searchParams, pathname, router, createQueryString]);

  // 3. Manejador de Filtros
  const handleFacetChange = (key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (values.length > 0) {
      params.set(key, values.join(","));
    } else {
      params.delete(key);
    }
    // Al filtrar, siempre es correcto volver a la página 1
    params.set("page", "1");
    router.replace(`${pathname}${createQueryString(params)}`);
  };

  // 4. Resetear todo
  const handleReset = () => {
    setSearchValue("");
    // Empujamos solo el pathname para limpiar query params
    router.push(pathname);
  };

  // Helper para leer valores actuales
  const getSelectedValues = (key: string) => {
    const val = searchParams.get(key);
    return val ? new Set(val.split(",")) : new Set<string>();
  };

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        
        {/* IZQUIERDA: Buscador y Filtros */}
        <div className="flex flex-1 flex-wrap items-center gap-2 w-full">
          
          {/* Input de Búsqueda */}
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-9 w-full md:w-[250px] pl-9 bg-white border-slate-200 focus-visible:ring-[#1B2541]"
            />
          </div>

          {/* Filtros Facetados */}
          <div className="flex flex-wrap gap-2">
            <FacetedFilter
              title="Segmento"
              options={facets.segments}
              selectedValues={getSelectedValues("segment")}
              onFilter={(vals) => handleFacetChange("segment", vals)}
            />

            <FacetedFilter
              title="Ocupación"
              options={facets.occupations}
              selectedValues={getSelectedValues("occupation")}
              onFilter={(vals) => handleFacetChange("occupation", vals)}
            />

            {facets.leaders.length > 0 && (
                <FacetedFilter
                title="Líder / Padrino"
                options={facets.leaders}
                selectedValues={getSelectedValues("leader")}
                onFilter={(vals) => handleFacetChange("leader", vals)}
                />
            )}

            <FacetedFilter
              title="Etiquetas"
              options={facets.tags}
              selectedValues={getSelectedValues("tags")}
              onFilter={(vals) => handleFacetChange("tags", vals)}
            />
          </div>

          {/* Botón Limpiar */}
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={handleReset}
              className="h-8 px-2 lg:px-3 text-slate-500 hover:text-red-600"
            >
              Limpiar
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTE: FILTRO FACETADO (Sin cambios lógicos requeridos, solo visuales) ---
interface FacetedFilterProps {
  title: string;
  options: Option[];
  selectedValues: Set<string>;
  onFilter: (values: string[]) => void;
}

function FacetedFilter({ title, options, selectedValues, onFilter }: FacetedFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed bg-white text-slate-700 hover:bg-slate-50 hover:text-[#1B2541]">
          <PlusCircle className="mr-2 h-4 w-4 text-slate-400" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden bg-[#1B2541]/10 text-[#1B2541]">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal bg-[#1B2541]/10 text-[#1B2541]">
                    {selectedValues.size} seleccionados
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal bg-[#1B2541]/10 text-[#1B2541]"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar ${title}...`} />
          <CommandList>
            <CommandEmpty>No hay resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      const newSet = new Set(selectedValues);
                      if (isSelected) {
                        newSet.delete(option.value);
                      } else {
                        newSet.add(option.value);
                      }
                      onFilter(Array.from(newSet));
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-[#1B2541] border-[#1B2541] text-white"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onFilter([])}
                    className="justify-center text-center font-medium text-slate-500 hover:text-slate-900"
                  >
                    Borrar filtros
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}