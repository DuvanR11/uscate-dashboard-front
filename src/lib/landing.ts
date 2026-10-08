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

  // El líder trabaja desde su panel: registrar votantes, su meta y su red.
  if (user?.role?.code === 'LEADER' && canRead('PROSPECTOS')) return '/leader';
  if (canRead('DASHBOARD')) return '/dashboard';
  if (canRead('PETICIONES')) return '/requests';
  if (canRead('PROSPECTOS')) return '/prospects';
  // El voluntario no ve el Tablero: entra directo a sus misiones.
  if (canRead('MISIONES')) return '/gamification';
  if (canRead('GAMIFICACION')) return '/gamification/dashboard';
  return '/profile';
}
