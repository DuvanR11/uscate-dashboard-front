// src/lib/apis-server.ts
//
// Plan "Radar Legislativo", Fase 2 (cerrada 2026-09-03) — hallazgo real
// encontrado al reconectar la personalización por usuario real: las
// páginas de `(dashboard)/projects/*` son Server Components reales (sin
// `'use client'`), pero llamaban a `lib/apis.ts`, cuyo `getHeaders()` lee
// `useAuthStore.getState().token` — un store de Zustand persistido en
// `localStorage`. `localStorage` no existe en el proceso Node.js donde
// corre un Server Component: el token real ahí SIEMPRE era `undefined`,
// así que estas páginas nunca mandaban un `Authorization` real al backend
// (que exige JWT en todas sus rutas). En la práctica, esto explica en
// parte por qué el módulo legislativo nunca mostró datos reales: aunque el
// pipeline de ingesta funcionara, la página que debía mostrarlos no podía
// autenticarse para leerlos.
//
// El fix real: un archivo SEPARADO, solo para Server Components/Server
// Actions, que lee la MISMA cookie `auth-token` que ya usa `middleware.ts`
// (`request.cookies.get('auth-token')`) — puesta por `login/page.tsx` vía
// `Cookies.set('auth-token', ...)` — a través de `next/headers`, la forma
// correcta de leer cookies desde un Server Component. `lib/apis.ts`
// (Zustand) sigue existiendo tal cual para los Client Components reales
// que ya lo usan (`(dashboard)/peticiones/*`) — no se puede compartir un
// solo archivo entre los 2 contextos: `next/headers` no se puede importar
// en un bundle de cliente.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('Falta NEXT_PUBLIC_API_URL en .env.local');
}

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cookieStore = await cookies();
  // Revisión técnica, Fase 1B: la cookie httpOnly de la API (`zy-session`)
  // o la de las sesiones anteriores al cambio.
  const token =
    cookieStore.get('zy-session')?.value ?? cookieStore.get('auth-token')?.value;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Hallazgo real de QA (2026-09-19, "Fichas digitales da error"): un 403 de
// permisos (rol sin PROYECTOS_LEY) se propagaba como un `Error` genérico,
// sin el status code — la página no tenía forma de distinguir "no tienes
// permiso" de una falla real, y sin `error.tsx` en la ruta, Next.js
// renderizaba su pantalla de error genérica ("da error", tal cual lo
// reportó el tester). `status` queda adjunto al Error para que un
// `error.tsx` (o cualquier `catch`) pueda mostrar un mensaje específico.
//
// TRV-12 (2026-10-27): en producción Next borra las propiedades del error
// antes de entregarlo al `error.tsx` del navegador (llega solo `digest`), así
// que `status` no le servía. Next respeta un `digest` que ya traiga el error:
// el 403 lleva uno fijo, `ZYRON_FORBIDDEN`, que leen `projects/error.tsx` y
// `(dashboard)/error.tsx`.
class ApiServerError extends Error {
  status: number;
  digest?: string;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    if (status === 403) this.digest = 'ZYRON_FORBIDDEN';
  }
}

// TRV-12: estas páginas no pasan por el interceptor de axios (`lib/api.ts`),
// que cierra la sesión ante un 401. Con la sesión vencida mostraban «Algo
// salió mal»; ahora van al inicio de sesión. `redirect()` lanza su propia
// excepción: no se atrapa aquí. `?session=expired` evita que el middleware
// devuelva a /start a quien todavía tiene las cookies.
function failWith(res: Response, message: string): never {
  if (res.status === 401) redirect('/login?session=expired');
  throw new ApiServerError(message, res.status);
}

// Una ruta que devuelve `null` responde 200 con el cuerpo VACÍO (así lo
// hace NestJS). `res.json()` revienta con un cuerpo vacío, y esa excepción
// tumbaba la página entera: el Radar de una organización sin corporación
// mostraba "No se pudo cargar" en vez de su aviso de "sin cobertura".
async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: await getHeaders(),
  });

  if (!res.ok) {
    failWith(res, `Error consultando ${path}`);
  }

  return readJson<T>(res);
}
