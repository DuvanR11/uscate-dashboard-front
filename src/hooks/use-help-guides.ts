import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useNavAccess } from '@/hooks/use-nav-access';
import { GUIDE_INDEX, GUIDE_PRESS_ONLY, GUIDE_SCREENS, guidesForPath, type GuideSummary } from '@/lib/help-guides';

/**
 * Guías que puede leer la persona: las de las pantallas que puede abrir (misma
 * regla del menú) y las generales. El operador de la plataforma las ve todas,
 * porque acompaña a los clientes.
 */
export function useHelpGuides() {
  const { routeAccess } = useNavAccess();
  const roleCode = useAuthStore((s) => s.user?.role?.code);
  const operator = roleCode === 'PLATFORM_OPERATOR';
  const press = useAuthStore((s) => s.user?.organizationUsage === 'PRESS');

  const canRead = useCallback(
    (guide: GuideSummary) => {
      if (operator) return true;
      const pressOnly = GUIDE_PRESS_ONLY[guide.slug];
      if (pressOnly !== undefined && pressOnly !== press) return false;
      const screens = GUIDE_SCREENS[guide.slug] ?? [];
      return screens.length === 0 || screens.some((screen) => routeAccess(screen) === 'allowed');
    },
    [operator, press, routeAccess],
  );

  const guides = useMemo(() => GUIDE_INDEX.filter(canRead), [canRead]);
  const forPath = useCallback((pathname: string) => guidesForPath(pathname, guides), [guides]);

  return { guides, forPath, canRead, operator };
}
