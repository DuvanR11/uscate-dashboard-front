import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100', // el build de producción exige NEXT_PUBLIC_API_URL; un dominio ajeno de respaldo enviaría tokens a un host equivocado
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
    // Fase 1 "Poder cobrar": el backend bloquea escrituras (solo lectura) o
    // todo acceso (suspendida/cancelada) por vencimiento. Se avisa una sola
    // vez con el mensaje real del servidor, en vez de dejar que cada
    // pantalla muestre un "error genérico".
    const code = error.response?.data?.code;
    if (error.response?.status === 403 && typeof code === 'string' && code.startsWith('SUBSCRIPTION_')) {
      toast.error('Suscripción vencida', {
        id: 'subscription-blocked',
        description: error.response.data.message,
      });
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

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await api.put<T>(path, body);
  return response.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await api.delete<T>(path);
  return response.data;
}

export default api;