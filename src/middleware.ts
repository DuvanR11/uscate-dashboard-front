import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const permissionsCookie = request.cookies.get('user-permissions')?.value;

  const { pathname } = request.nextUrl;

  const publicRoutes = [
    '/',
    '/login',
    '/consulta',
    '/datos',
    '/eventos',
    '/join',
    '/referido',
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
  const orgScopedPublicRoute = /^\/[^/]+\/(register|denuncia-publica(\/consultar)?|eventos)\/?$/;

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

  // --- CASO 2: USUARIO NO LOGUEADO ---
  if (!token) {
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // --- CASO 3: USUARIO LOGUEADO ENTRA A UNA RUTA PÚBLICA ---
  if (token && (pathname === '/' || pathname === '/login')) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};