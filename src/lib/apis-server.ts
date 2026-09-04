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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('Falta NEXT_PUBLIC_API_URL en .env.local');
}

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: await getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Error consultando ${path}`);
  }

  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: await getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Error ejecutando POST ${path}`);
  }

  return res.json();
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Error actualizando (PATCH) en ${path}`);
  }

  return res.json();
}
