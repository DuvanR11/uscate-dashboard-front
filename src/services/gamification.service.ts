// 1. IMPORTA TU INSTANCIA CENTRALIZADA
// Asegúrate de que la ruta sea correcta según dónde guardaste el código que me enviaste.
// Por ejemplo: '@/lib/api' o '@/services/api'
import api from '@/lib/api'; 
import { SocialTask } from '../types/gamification';

export const GamificationService = {
  // --- MÉTODOS PARA EL BÚHO (USUARIO) ---

  // Obtener mis tareas
    // 2. Obtener mis tareas
  getMyTasks: async (): Promise<SocialTask[]> => {
    const { data } = await api.get('/gamification/my-tasks');
    return data;
  },

  // 3. Subir la evidencia
  submitEvidence: async (taskId: number, file: File) => {
    const formData = new FormData();
    formData.append('screenshot', file);
    const { data } = await api.post(`/gamification/submit/${taskId}`, formData);
    return data;
  },

  getLeaderboardStats: async (period: 'weekly' | 'monthly' | 'all' = 'all') => {
    // Llamamos al endpoint que creaste en el Controller de NestJS
    const { data } = await api.get(`/gamification/admin/stats`, {
      params: { period }
    });
    return data;
  },
  
  // --- MÉTODOS PARA EL ADMIN (GESTIÓN) ---

  createTask: async (taskData: any) => {
    const { data } = await api.post('/gamification/tasks', taskData);
    return data;
  },

  // Obtener TODAS las misiones
  getAllTasks: async (page = 1, limit = 10) => {
    const { data } = await api.get(`/gamification/tasks/all?page=${page}&limit=${limit}`); 
    return data; 
  },
  
  // Editar misión
  updateTask: async (id: number, datas: any) => {
    const { data } = await api.put(`/gamification/tasks/${id}`, datas); 
    return data;
  },

  async getHistory() {
    // Ajusta la URL según tu backend
    const { data } = await api.get('/gamification/history'); 
    return data;
  },

  // Eliminar misión
  deleteTask: async (id: number) => {
    const { data } = await api.delete(`/gamification/tasks/${id}`);
    return data;
  },

  // Activar/Inactivar misión
  toggleStatus: async (id: number) => {
    const { data } = await api.patch(`/gamification/tasks/${id}/toggle`);
    return data;
  },

  // --- MÉTODOS DE AUDITORÍA ---

  // Obtener lista de pendientes
  getPendingAudits: async () => {
    const { data } = await api.get('/gamification/admin/audit');
    return data;
  },

  // Tomar decisión (Aprobar/Rechazar)
  
  async auditDecision(completionId: number, approved: boolean, reason?: string) {
    // CAMBIO IMPORTANTE: Usamos el nuevo endpoint PATCH de auditoría manual
    const decision = approved ? 'APPROVE' : 'REJECT';
    
    const res = await api.patch(`/gamification/audit/${completionId}`, {
      decision,
      reason
    });
    return res.data;
  },

  getMyStats: async () => {
    const { data } = await api.get('/gamification/stats');
    return data; // { totalPoints: 150, fullName: "Juan" }
  },

};