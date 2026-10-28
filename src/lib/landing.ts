// A qué pantalla llega cada persona al entrar. La usan el inicio de sesión y
// `/start` (la dirección con la que abre la aplicación instalada en el
// celular — Fase 4 "Líderes y celular", 2026-10-06).

interface LandingUser {
  role?: { code?: string } | null;
  permissions?: { module: string; canRead?: boolean }[] | null;
}

export function landingPathFor(user: LandingUser | null | undefined): string {
  const canRead = (module: string) =>
    (user?.permissions ?? []).some((p) => p.module === module && p.canRead);

  // El operador de la plataforma trabaja en su panel (antes llegaba a "Mi
  // perfil": no tiene Tablero porque no pertenece a una organización).
  if (user?.role?.code === 'PLATFORM_OPERATOR') return '/platform';
  if (user?.role?.code === 'COMMERCIAL_REP' && canRead('COMERCIAL')) return '/commercial';
  // El líder trabaja desde su panel: registrar votantes, su meta y su red.
  if (user?.role?.code === 'LEADER' && canRead('PROSPECTOS')) return '/leader';
  if (canRead('DASHBOARD')) return '/dashboard';
  // TRV-07: Derechos de petición es `/peticiones`; `/requests` (Solicitudes)
  // pide otros módulos y le mostraba «No tienes permiso».
  if (canRead('PETICIONES')) return '/peticiones';
  if (canRead('PROSPECTOS')) return '/prospects';
  // El recolector de firmas tampoco ve el Tablero: entra a registrar firmas.
  if (canRead('CONTABILIDAD')) return '/signatures';
  // El voluntario no ve el Tablero: entra directo a sus misiones.
  if (canRead('MISIONES')) return '/gamification';
  if (canRead('GAMIFICACION')) return '/gamification/dashboard';
  return '/profile';
}
