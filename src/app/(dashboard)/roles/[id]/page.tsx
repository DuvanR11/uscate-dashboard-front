'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, ShieldCheck } from 'lucide-react';
import { Can } from '@/components/shared/can';
import { Button } from '@/components/ui/button';
import {
  PermissionChecklist,
  PermissionRow,
  PermissionField,
  flattenModules,
  buildPermissionsForModules,
} from '@/components/shared/permission-checklist';
import { getPermissionModules, PermissionModule } from '@/lib/api/permissions';
import {
  getRoles,
  getRolePermissions,
  updateRolePermissions,
  Role,
  PermissionSource,
} from '@/lib/api/roles';

/**
 * Editor de la plantilla de un rol: override de permisos de la organización
 * de quien llama sobre la plantilla base del sistema. Gateado con
 * `CONFIGURACION canWrite`, igual que el listado en `/roles`.
 */
export default function RoleTemplatePage() {
  return (
    <Can
      module="CONFIGURACION"
      action="canWrite"
      fallback={
        <div className="p-12 text-center text-slate-500">
          No tienes permisos para administrar roles y plantillas.
        </div>
      }
    >
      <RoleTemplateEditor />
    </Can>
  );
}

function RoleTemplateEditor() {
  const params = useParams<{ id: string }>();
  const roleId = Number(params?.id);

  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [sources, setSources] = useState<Record<string, PermissionSource>>({});
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Valor base del sistema por módulo, para las filas que ya tienen override
  // de la organización (`entry.base`, agregado al backend junto con este
  // editor — antes el merge del servidor lo descartaba, ver commit/historial
  // de `RolesService.mergeTwoWay` si hace falta el detalle).
  const [baseValues, setBaseValues] = useState<Record<string, PermissionRow>>({});

  useEffect(() => {
    if (!roleId || Number.isNaN(roleId)) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [moduleTree, template, roles] = await Promise.all([
          getPermissionModules(),
          getRolePermissions(roleId),
          getRoles(),
        ]);
        if (!active) return;

        const flat = flattenModules(moduleTree);
        setModules(flat);
        setPermissions(buildPermissionsForModules(flat, template));

        const sourceMap: Record<string, PermissionSource> = {};
        const baseMap: Record<string, PermissionRow> = {};
        for (const entry of template) {
          sourceMap[entry.module] = entry.source;
          // `entry.base` solo viene poblado cuando `source === 'ROLE_ORG'`
          // (es justo el caso donde el botón de restablecer se muestra).
          if (entry.base) {
            baseMap[entry.module] = {
              module: entry.module,
              canRead: entry.base.canRead,
              canWrite: entry.base.canWrite,
              canDelete: entry.base.canDelete,
            };
          }
        }
        setSources(sourceMap);
        setBaseValues(baseMap);
        setRole(roles.find((r) => r.id === roleId) ?? null);
      } catch (error) {
        console.error(error);
        toast.error('No se pudo cargar la plantilla del rol', {
          description: 'Intenta recargar la página. Si el problema persiste, contacta a soporte.',
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [roleId]);

  function handleChange(moduleCode: string, field: PermissionField, value: boolean) {
    setPermissions((prev) => {
      const index = prev.findIndex((p) => p.module === moduleCode);
      if (index === -1) return prev;

      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if ((field === 'canWrite' || field === 'canDelete') && value === true) {
        updated[index].canRead = true;
      }
      if (field === 'canRead' && value === false) {
        updated[index].canWrite = false;
        updated[index].canDelete = false;
      }

      return updated;
    });
  }

  /**
   * "Restablecer a base": copia el valor de la plantilla base del sistema
   * (`entry.base`, que el backend devuelve junto al override desde
   * `RolesService.mergeTwoWay`) sobre la fila editable. El resultado, al
   * guardar, es funcionalmente idéntico a "sin override" — pero técnicamente
   * sigue existiendo una fila `RolePermission` de la organización con esos
   * valores (el backend no expone un DELETE de override individual). No es
   * un true reset, es un valor que coincide con la base.
   */
  function handleReset(moduleCode: string) {
    const base = baseValues[moduleCode];
    if (!base) {
      // No debería pasar en operación normal (el botón solo se muestra en
      // filas con override, y esas siempre traen `base` del backend) — se
      // deja como red de seguridad, no como el camino esperado.
      toast.error('No se pudo obtener el valor base de esta fila', {
        description: 'Intenta recargar la página. Si el problema persiste, contacta a soporte.',
      });
      return;
    }
    setPermissions((prev) => prev.map((p) => (p.module === moduleCode ? { ...base } : p)));
    toast.success('Fila restablecida al valor base del sistema — recuerda guardar para confirmar.');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const activePermissions = permissions.filter(
        (p) => p.canRead || p.canWrite || p.canDelete,
      );
      await updateRolePermissions(roleId, { permissions: activePermissions });
      toast.success('Plantilla de rol actualizada correctamente');
    } catch (error: any) {
      console.error(error);
      toast.error('No se pudo guardar la plantilla', {
        description: error?.response?.data?.message || 'Intenta de nuevo en unos segundos.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between border-b border-border/40 pb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/roles" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="p-2 bg-secondary/20 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary">
              {role ? role.name : `Rol #${roleId}`}
            </h2>
            <p className="text-muted-foreground text-sm">
              Override de permisos de tu organización sobre la plantilla base del sistema.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading || saving}
          className="bg-primary hover:bg-primary/90 font-semibold"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar
        </Button>
      </div>

      <PermissionChecklist
        modules={modules}
        permissions={permissions}
        sources={sources}
        onChange={handleChange}
        onReset={handleReset}
        loading={loading}
      />
    </div>
  );
}