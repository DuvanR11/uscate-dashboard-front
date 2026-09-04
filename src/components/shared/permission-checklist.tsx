'use client';

import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PermissionModule } from '@/lib/api/permissions';
import type { PermissionSource } from '@/lib/api/roles';

/**
 * Grilla de permisos (Ver / Crear-Editar / Borrar por módulo) extraída de
 * `create-user-form.tsx` para reutilizarse también en el editor de
 * plantillas de rol (`/roles/[id]`). Mismo diseño visual, sin duplicar JSX.
 */

export type PermissionField = 'canRead' | 'canWrite' | 'canDelete';

export interface PermissionRow {
  module: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface PermissionChecklistProps {
  /** Catálogo de módulos, ya aplanado (ver `flattenModules`). */
  modules: PermissionModule[];
  permissions: PermissionRow[];
  /**
   * Código de módulo -> origen de esa fila. Solo aplica cuando se está
   * mostrando una plantilla de ROL (badge "Heredado del sistema" /
   * "Personalizado por tu organización"); se omite en el editor de
   * excepciones por usuario.
   */
  sources?: Record<string, PermissionSource>;
  onChange: (moduleCode: string, field: PermissionField, value: boolean) => void;
  loading?: boolean;
  /**
   * Solo lo pasa el editor de plantillas de rol (`/roles/[id]`): cuando está
   * presente, las filas con `source === 'ROLE_ORG'` muestran un botón
   * "Restablecer a base" que invoca este callback con el código de módulo.
   * Ver comentario en `app/(dashboard)/roles/[id]/page.tsx` sobre qué
   * significa "restablecer" realmente con la API actual.
   */
  onReset?: (moduleCode: string) => void;
}

/** Aplana el árbol jerárquico (`children`) de `GET /permissions/modules` en
 * una lista plana, preservando también los nodos padre — son filas propias
 * del checklist. */
export function flattenModules(nodes: PermissionModule[]): PermissionModule[] {
  const result: PermissionModule[] = [];
  const walk = (list: PermissionModule[]) => {
    for (const node of list) {
      result.push(node);
      if (node.children && node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return result;
}

/** Construye el array de permisos del formulario con una fila por módulo del
 * catálogo, preservando los valores ya existentes (edición, plantilla de rol
 * o plantilla base) para los módulos que coincidan. */
export function buildPermissionsForModules(
  modules: PermissionModule[],
  existing: Array<Partial<PermissionRow> & { module: string }> = [],
): PermissionRow[] {
  return modules.map((m) => {
    const found = existing.find((p) => p.module === m.code);
    return {
      module: m.code,
      canRead: found?.canRead ?? false,
      canWrite: found?.canWrite ?? false,
      canDelete: found?.canDelete ?? false,
    };
  });
}

export function PermissionChecklist({
  modules,
  permissions,
  sources,
  onChange,
  loading,
  onReset,
}: PermissionChecklistProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando catálogo de módulos...
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        No hay módulos disponibles en el catálogo.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
      {modules.map((mod) => {
        // Pequeña lógica para colorear diferente los permisos GLOBALES
        const isGlobal = mod.code.includes('_GLOBAL');
        const row = permissions.find((p) => p.module === mod.code);
        const source = sources?.[mod.code];

        return (
          <div
            key={mod.code}
            className={`flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 transition-colors ${isGlobal ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100'}`}
          >
            <div className="flex flex-col gap-1 pr-2">
              <span className={`font-semibold text-sm ${isGlobal ? 'text-amber-800' : 'text-slate-700'}`}>
                {mod.name}
              </span>
              {source && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={
                      source === 'ROLE_ORG'
                        ? 'border-amber-300 bg-amber-50 text-amber-700 w-fit'
                        : 'border-blue-200 bg-blue-50 text-blue-700 w-fit'
                    }
                  >
                    {source === 'ROLE_ORG' ? 'Personalizado por tu organización' : 'Heredado del sistema'}
                  </Badge>
                  {source === 'ROLE_ORG' && onReset && (
                    <button
                      type="button"
                      onClick={() => onReset(mod.code)}
                      className="text-[11px] font-medium text-slate-500 underline decoration-dotted hover:text-slate-700"
                    >
                      Restablecer a base
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-4 shrink-0">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={row?.canRead || false}
                  onChange={(e) => onChange(mod.code, 'canRead', e.target.checked)}
                />
                Ver
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={row?.canWrite || false}
                  onChange={(e) => onChange(mod.code, 'canWrite', e.target.checked)}
                />
                Crear/Editar
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
                  checked={row?.canDelete || false}
                  onChange={(e) => onChange(mod.code, 'canDelete', e.target.checked)}
                />
                Borrar
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}