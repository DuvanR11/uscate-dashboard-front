import { MediaCatalogPanel } from '@/components/platform/media-catalog-panel';
import { ProjectQueriesPanel } from '@/components/platform/project-queries-panel';

// Catálogo de medios (2026-11-09): los medios que eligen las organizaciones en
// Monitoreo y (piloto de Zyron Prensa, Fase B) las búsquedas comunes de los
// proyectos del Radar que se siguen en medios.
export default function PlatformMediaCatalogPage() {
  return (
    <>
      <MediaCatalogPanel />
      <ProjectQueriesPanel />
    </>
  );
}
