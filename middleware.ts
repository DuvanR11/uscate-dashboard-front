import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  // Leemos los permisos de la cookie que acabamos de setear en el login
  const permissionsCookie = request.cookies.get('user-permissions')?.value;
  
  const { pathname } = request.nextUrl;
  const isPublicRoute = pathname === '/login' || pathname === '/';

  // --- CASO 1: BLOQUEO POR FALTA DE PERMISOS (Antiguo CITIZEN) ---
  if (token && permissionsCookie) {
    try {
        const permissions = JSON.parse(permissionsCookie);
        if (permissions.length === 0) {
            const response = NextResponse.redirect(new URL('/login?error=app_only', request.url));
            response.cookies.delete('auth-token');
            response.cookies.delete('user-permissions');
            return response;
        }
    } catch(e) {
        // Ignorar error de parseo
    }
  }

  // --- CASO 2: USUARIO NO LOGUEADO ---
  if (!token) {
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // --- CASO 3: USUARIO LOGUEADO INTENTA IR AL LOGIN ---
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL('/profile', request.url)); // O envíalo a un loader inicial
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};