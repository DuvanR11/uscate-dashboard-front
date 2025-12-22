import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100', // Ajusta a tu backend
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

// Interceptor de Respuesta (Response) - Opcional pero recomendado
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el backend dice "Token vencido" (401), cerramos sesión automáticamente
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login'; // Forzamos redirección
    }
    return Promise.reject(error);
  }
);

export default api;