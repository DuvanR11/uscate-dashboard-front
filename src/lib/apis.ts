// src/lib/api.ts (o apis.ts)
import { useAuthStore } from '@/store/auth-store'; // Asegúrate de que esta ruta sea correcta

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('Falta NEXT_PUBLIC_API_URL en .env.local');
}

// Función auxiliar para inyectar el Token automáticamente
function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Sacamos el token directo de tu Zustand store
  // (Si lo guardas en localStorage directo, cambia esto por localStorage.getItem('token'))
  const token = useAuthStore.getState().token; 

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: getHeaders(), // <-- INYECTAMOS LOS HEADERS AQUÍ
  });

  if (!res.ok) {
    throw new Error(`Error consultando ${path}`);
  }

  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(), // <-- INYECTAMOS LOS HEADERS AQUÍ
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
    headers: getHeaders(), // <-- INYECTAMOS LOS HEADERS AQUÍ
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Error actualizando (PATCH) en ${path}`);
  }

  return res.json();
}