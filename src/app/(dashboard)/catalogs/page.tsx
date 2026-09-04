'use client';

import { Database } from 'lucide-react';
import { Can } from '@/components/shared/can';
import { usePermission } from '@/hooks/use-permission';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleCatalogManager } from '@/components/dashboard/catalogs/simple-catalog-manager';
import { LocalityManager } from '@/components/dashboard/catalogs/locality-manager';
import { DepartmentManager } from '@/components/dashboard/catalogs/department-manager';
import { MunicipalityManager } from '@/components/dashboard/catalogs/municipality-manager';
import {
  channelsApi,
  occupationsApi,
  segmentsApi,
  tagsApi,
} from '@/lib/api/catalogs';

/**
 * `/catalogs` — administración de los 7 catálogos maestros (tags, localities,
 * channels, occupations, municipalities, departments, segments). Gateada por
 * el módulo `CATALOGOS` (submódulo de `CONFIGURACION`, exclusivo de
 * SUPER_ADMIN en la matriz de permisos — ver `backfill-role-permissions.ts`
 * y el backfill puntual de `UserPermission` en
 * `scripts/backfill-catalogos-user-permission.ts`).
 */
export default function CatalogsPage() {
  return (
    <Can
      module="CATALOGOS"
      action="canRead"
      fallback={
        <div className="p-12 text-center text-slate-500">
          No tienes permisos para administrar catálogos.
        </div>
      }
    >
      <CatalogsTabs />
    </Can>
  );
}

function CatalogsTabs() {
  const canWrite = usePermission('CATALOGOS', 'canWrite');
  const canDelete = usePermission('CATALOGOS', 'canDelete');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border/40 pb-6">
        <div className="p-2 bg-secondary/20 rounded-lg">
          <Database className="h-6 w-6 text-secondary-foreground" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Catálogos</h2>
          <p className="text-muted-foreground">
            Administra los datos maestros que usa el resto de la aplicación. &ldquo;Eliminar&rdquo;
            desactiva el registro salvo que no tenga ningún dato asociado.
          </p>
        </div>
      </div>

      <Tabs defaultValue="channels">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="channels">Canales</TabsTrigger>
          <TabsTrigger value="occupations">Ocupaciones</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="localities">Localidades</TabsTrigger>
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
          <TabsTrigger value="municipalities">Municipios</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="pt-4">
          <SimpleCatalogManager
            pluralTitle="Canales"
            singular="canal"
            article="el"
            newLabel="Nuevo canal"
            api={channelsApi}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="occupations" className="pt-4">
          <SimpleCatalogManager
            pluralTitle="Ocupaciones"
            singular="ocupación"
            article="la"
            newLabel="Nueva ocupación"
            api={occupationsApi}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="segments" className="pt-4">
          <SimpleCatalogManager
            pluralTitle="Segmentos"
            singular="segmento"
            article="el"
            newLabel="Nuevo segmento"
            api={segmentsApi}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="tags" className="pt-4">
          <SimpleCatalogManager
            pluralTitle="Tags"
            singular="tag"
            article="el"
            newLabel="Nuevo tag"
            api={tagsApi}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="localities" className="pt-4">
          <LocalityManager canWrite={canWrite} canDelete={canDelete} />
        </TabsContent>

        <TabsContent value="departments" className="pt-4">
          <DepartmentManager canWrite={canWrite} canDelete={canDelete} />
        </TabsContent>

        <TabsContent value="municipalities" className="pt-4">
          <MunicipalityManager canWrite={canWrite} canDelete={canDelete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
