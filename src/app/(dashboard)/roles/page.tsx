'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ChevronRight } from 'lucide-react';
import { Can } from '@/components/shared/can';
import { getRoles, Role } from '@/lib/api/roles';

/**
 * Listado de roles del catálogo global (`GET /roles`). Cada uno enlaza al
 * editor de su plantilla (`/roles/[id]`), donde se edita el override de la
 * organización — nunca la plantilla base del sistema (ver Fase 9 backend).
 */
export default function RolesPage() {
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
      <RolesList />
    </Can>
  );
}

function RolesList() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRoles() {
      setLoading(true);
      try {
        const res = await getRoles();
        if (active) setRoles(res);
      } catch (error) {
        console.error(error);
        toast.error('No se pudo cargar el catálogo de roles', {
          description: 'Intenta recargar la página. Si el problema persiste, contacta a soporte.',
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRoles();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border/40 pb-6">
        <div className="p-2 bg-secondary/20 rounded-lg">
          <ShieldCheck className="h-6 w-6 text-secondary-foreground" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Roles y Plantillas
          </h2>
          <p className="text-muted-foreground">
            Edita el override de permisos de tu organización para cada rol del sistema.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando roles...
        </div>
      ) : roles.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          No hay roles disponibles en el catálogo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <Link
              key={role.id}
              href={`/roles/${role.id}`}
              className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div>
                <p className="font-bold text-primary">{role.name}</p>
                <p className="text-xs text-slate-400 font-mono">{role.code}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}