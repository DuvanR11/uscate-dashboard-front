import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const role = request.cookies.get('user-role')?.value;
  const { pathname } = request.nextUrl;

  // Rutas públicas (Login y Raíz)
  const isPublicRoute = pathname === '/login' || pathname === '/';

  // Rutas protegidas (Todo lo que no sea estático o login)
  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/admin') || 
                           pathname.startsWith('/requests') ||
                           pathname.startsWith('/prospects') ||
                           pathname.startsWith('/calendar') ||
                           pathname.startsWith('/map') ||
                           pathname.startsWith('/profile');

  // --- CASO 1: BLOQUEO DE CIUDADANOS (CITIZEN) ---
  // Si hay token, pero el rol es CITIZEN, no lo dejamos entrar al panel web.
  if (token && role === 'CITIZEN') {
    // Creamos la respuesta para redirigir al login
    const response = NextResponse.redirect(new URL('/login?error=app_only', request.url));
    
    // Eliminamos las cookies para cerrar la sesión inmediatamente
    response.cookies.delete('auth-token');
    response.cookies.delete('user-role');
    
    return response;
  }

  // --- CASO 2: USUARIO NO LOGUEADO ---
  // Si intenta entrar a ruta protegida o raíz sin token -> Login
  if (!token) {
    if (isProtectedRoute || pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // --- CASO 3: USUARIO LOGUEADO (Y NO ES CITIZEN) ---
  if (token) {
    // Definimos la ruta de inicio según el rol
    let destinationUrl = '/dashboard'; // Default para SUPER_ADMIN, ADMIN

    if (role === 'SECRETARY' || role === 'LEGISLATIVE') {
      destinationUrl = '/requests';
    } 
    else if (role === 'LEADER' || role === 'AGENT') { // Asumo que AGENT es similar a LEADER
      destinationUrl = '/prospects';
    }

    // Si intenta entrar al Login o a la Raíz, lo mandamos a su Home
    if (isPublicRoute) {
      return NextResponse.redirect(new URL(destinationUrl, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};