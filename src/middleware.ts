import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Revisión técnica, Fase 1 (2026-10-15): las pantallas privadas no se dejan
// incrustar en otro sitio (clickjacking: un sitio ajeno las muestra dentro de
// un marco invisible y engaña a la persona para que haga clic). Las públicas
// (formularios, consulta ciudadana) se siguen pudiendo incrustar.
function withFrameProtection(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Content-Security-Policy', "frame-ancestors 'self'");
  return response;
}

export function middleware(request: NextRequest) {
  // Revisión técnica, Fase 1B: `zy-session` (httpOnly, la pone la API) o la
  // cookie de las sesiones anteriores al cambio.
  const sessionCookie =
    request.cookies.get('zy-session')?.value ?? request.cookies.get('auth-token')?.value;
  const permissionsCookie = request.cookies.get('user-permissions')?.value;
  // La página borra `user-permissions` al cerrar sesión; la cookie httpOnly
  // solo la borra la API. Si esa respuesta no llegó, sin `user-permissions`
  // la sesión cuenta como cerrada (evita volver de /login al perfil).
  const token = sessionCookie && permissionsCookie ? sessionCookie : undefined;

  const { pathname } = request.nextUrl;

  const publicRoutes = [
    '/',
    '/login',
    '/consulta',
    '/datos',
    '/eventos',
    '/join',
    '/referido',
    // Centro de cumplimiento Habeas Data (2026-09-08) — el aviso de
    // privacidad es de solo lectura, sin slug de organización (texto
    // global único, ver `common/legal/privacy-notice.ts`).
    '/privacidad',
    // Página pública de confianza/seguridad (Track C de Ruta 2027,
    // 2026-09-09) — contenido estático global sobre la PLATAFORMA (nunca
    // una organización puntual), mismo criterio que `/privacidad`.
    '/confianza',
    // Fase 1 "Poder cobrar" (2026-09-26): recuperación de contraseña y
    // documentos legales vigentes — sin sesión por definición.
    '/forgot-password',
    '/reset-password',
    '/terminos',
    // Fase 4 "Salida al mercado": página pública de planes y precios.
    '/planes',
    // Fase 4 "Líderes y celular" (2026-10-06): el navegador pide el
    // manifiesto de la aplicación instalable SIN la sesión; si se redirige al
    // inicio de sesión, la plataforma deja de poder instalarse.
    '/manifest.webmanifest',
  ];

  // Deuda multi-tenant (Fase M4, ver memoria `deuda-multitenant-crm`):
  // /register y /denuncia-publica(+/consultar) se movieron detrás de un
  // slug de organización (/[orgSlug]/register, etc — decisión D5). El
  // primer segmento ya no es literal "register"/"denuncia-publica", es
  // cualquier slug real, así que se reconoce por PATRÓN (un segmento +
  // el sufijo conocido), no por prefijo fijo.
  // `/eventos` se agregó acá (gap post-M4, landing pública de eventos,
  // `/[orgSlug]/eventos`) — distinto de la ruta pelada `/eventos/[slug]`
  // (Nivel 1, ya cubierta por `pathname.startsWith('/eventos/')` abajo).
  // `mis-datos(/consultar)?` (Habeas Data, Fase 3) — mismo patrón real que
  // `denuncia-publica`: portal ARCO público sin login, por organización.
  // `consulta-ciudadana` (Plan de gobierno, Fase 6): consulta pública y
  // anónima de la campaña. No se llama `/plan` porque `/organization/plan`
  // es una pantalla privada y encajaría en este patrón.
  const orgScopedPublicRoute = /^\/[^/]+\/(register|denuncia-publica(\/consultar)?|eventos|mis-datos(\/consultar)?|consulta-ciudadana)\/?$/;

  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith('/consulta/') ||
    pathname.startsWith('/datos/') ||
    pathname.startsWith('/eventos/') ||
    pathname.startsWith('/join/') ||
    pathname.startsWith('/referido/') ||
    orgScopedPublicRoute.test(pathname);

  // --- CASO 1: BLOQUEO POR FALTA DE PERMISOS ---
  // `user-permissions` es solo un flag '1'/'0' (¿tiene AL MENOS un permiso?),
  // NO el array completo — ver el comentario en login/page.tsx: guardar el
  // array entero acá superaba el límite de ~4KB por cookie de los
  // navegadores para cuentas con muchos permisos (SUPER_ADMIN), y la cookie
  // quedaba descartada silenciosamente, rompiendo el login por completo.
  // Formato viejo ('[]' / '[{...}]', de sesiones ya guardadas antes de este
  // fix) también se soporta leyendo `.length` después de un intento de
  // `JSON.parse` — si falla el parseo, se asume string plano ('1'/'0').
  if (token && permissionsCookie) {
    const hasPermissions = (() => {
      try {
        const parsed = JSON.parse(permissionsCookie);
        return Array.isArray(parsed) ? parsed.length > 0 : permissionsCookie === '1';
      } catch {
        return permissionsCookie === '1';
      }
    })();

    if (!hasPermissions) {
      const response = NextResponse.redirect(
        new URL('/login?error=app_only', request.url)
      );
      response.cookies.delete('auth-token');
      response.cookies.delete('user-permissions');
      return response;
    }
  }

  // Las pantallas de acceso tampoco se dejan incrustar: un marco ajeno
  // podría capturar la contraseña.
  const isAccessRoute = ['/login', '/forgot-password', '/reset-password'].includes(pathname);

  // --- CASO 2: USUARIO NO LOGUEADO ---
  if (!token) {
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return isAccessRoute
      ? withFrameProtection(NextResponse.next())
      : NextResponse.next();
  }

  // --- CASO 3: USUARIO LOGUEADO ENTRA A UNA RUTA PÚBLICA ---
  if (token && (pathname === '/' || pathname === '/login')) {
    return NextResponse.redirect(new URL('/start', request.url));
  }

  return isPublicRoute && !isAccessRoute
    ? NextResponse.next()
    : withFrameProtection(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
  ],
};
