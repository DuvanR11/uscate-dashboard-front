'use client';

import Link from 'next/link';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { Can } from '@/components/shared/can';
import { usePermission } from '@/hooks/use-permission';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { KeywordManager } from '@/components/dashboard/monitoring/keyword-manager';
import { SourceManager } from '@/components/dashboard/monitoring/source-manager';

/**
 * `/inteligencia/monitoreo/configuracion` — administración de
 * `MonitoringKeyword`/`MonitoringSource` (Fase 2 del backend, ya
 * implementada). Gateada por `canWrite` (ADMIN/SUPER_ADMIN en la matriz de
 * permisos — LEGISLATIVE solo tiene `canRead`, ver decisión #14 del
 * informe): sin ese nivel esta página no tiene nada útil que mostrar.
 */
export default function MonitoringConfigPage() {
  return (
    <Can
      module="MONITOREO_PREDICTIVO"
      action="canWrite"
      fallback={
        <div className="p-12 text-center text-slate-500">
          No tienes permisos para configurar el monitoreo de etiquetas.
        </div>
      }
    >
      <MonitoringConfigTabs />
    </Can>
  );
}

function MonitoringConfigTabs() {
  const canDelete = usePermission('MONITOREO_PREDICTIVO', 'canDelete');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border/40 pb-6">
        <Link href="/inteligencia/monitoreo">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver al panel
          </Button>
        </Link>
        <div className="p-2 bg-secondary/20 rounded-lg">
          <Settings2 className="h-6 w-6 text-secondary-foreground" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Configuración de Monitoreo</h2>
          <p className="text-muted-foreground">
            Etiquetas (con sus alias INCLUDE/EXCLUDE) y fuentes RSS/Google News que alimentan el
            panel del analista. &ldquo;Eliminar&rdquo; desactiva salvo que no tenga menciones asociadas.
          </p>
        </div>
      </div>

      <Tabs defaultValue="keywords">
        <TabsList>
          <TabsTrigger value="keywords">Etiquetas</TabsTrigger>
          <TabsTrigger value="sources">Fuentes</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="pt-4">
          <KeywordManager canWrite={true} canDelete={canDelete} />
        </TabsContent>

        <TabsContent value="sources" className="pt-4">
          <SourceManager canWrite={true} canDelete={canDelete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}