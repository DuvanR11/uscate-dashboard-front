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
    '/register',
  ];

  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith('/consulta/') ||
    pathname.startsWith('/datos/') ||
    pathname.startsWith('/eventos/') ||
    pathname.startsWith('/join/') ||
    pathname.startsWith('/referido/') ||
    pathname.startsWith('/register/');

  // --- CASO 1: BLOQUEO POR FALTA DE PERMISOS ---
  if (token && permissionsCookie) {
    try {
      const permissions = JSON.parse(permissionsCookie);
      if (permissions.length === 0) {
        const response = NextResponse.redirect(
          new URL('/login?error=app_only', request.url)
        );
        response.cookies.delete('auth-token');
        response.cookies.delete('user-permissions');
        return response;
      }
    } catch {}
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