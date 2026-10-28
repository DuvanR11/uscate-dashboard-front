'use client';

import { useEffect, useState } from 'react';
import { getPermissionModules, type PermissionModule } from '@/lib/api/permissions';

// Nombres de los módulos del catálogo (`GET /permissions/modules`) para
// mostrar un plan o una cotización, que guardan solo los códigos. Se piden
// una vez por carga del panel; si fallan, el mapa queda vacío y quien lo use
// decide qué mostrar.
//
// Fase 4 del análisis de punta a punta (2026-10-28, PLT-12): salió de
// `components/billing/commercial-quote-card.tsx` para que la ficha de la
// organización en `/platform` deje de listar "PROSPECTOS, DIFUSIONES…".
let moduleNamesCache: Promise<Map<string, string>> | null = null;

function loadModuleNames() {
  moduleNamesCache ??= getPermissionModules()
    .then((tree) => {
      const names = new Map<string, string>();
      const walk = (items: PermissionModule[]) =>
        items.forEach((m) => {
          names.set(m.code, m.name);
          walk(m.children ?? []);
        });
      walk(tree);
      return names;
    })
    .catch(() => {
      moduleNamesCache = null;
      return new Map<string, string>();
    });
  return moduleNamesCache;
}

/** `null` mientras carga; un mapa (quizás vacío) cuando terminó. */
export function useModuleNames(): Map<string, string> | null {
  const [names, setNames] = useState<Map<string, string> | null>(null);
  useEffect(() => {
    let alive = true;
    loadModuleNames().then((n) => alive && setNames(n));
    return () => {
      alive = false;
    };
  }, []);
  return names;
}
