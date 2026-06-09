import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.buhoscol.com', // Ajusta a tu backend
});

// Interceptor de Solicitud (Request)
api.interceptors.request.use((config) => {
  // Leemos el token DIRECTAMENTE del store (sin hooks, modo vainilla)
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Respuesta (Response)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el backend dice "Token vencido o inválido" (401), cerramos sesión automáticamente
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login'; // Forzamos redirección
      }
    }
    return Promise.reject(error);
  }
);

// =========================================================================
// WRAPPERS PARA COMPATIBILIDAD CON TUS COMPONENTES (apiGet, apiPost, etc.)
// =========================================================================

export async function apiGet<T>(path: string): Promise<T> {
  // Axios automáticamente parsea el JSON y lo guarda en la propiedad .data
  const response = await api.get<T>(path);
  return response.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await api.post<T>(path, body);
  return response.data;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await api.patch<T>(path, body);
  return response.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await api.delete<T>(path);
  return response.data;
}

export default api;