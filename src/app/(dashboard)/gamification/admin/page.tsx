'use client';

import React, { useEffect, useState } from 'react';
import { TaskPlatform } from '@/types/gamification';
import { 
  Plus, Facebook, Instagram, Twitter, Link as LinkIcon, 
  X, Save, Trash2, Pencil, Power, Calendar, MessageCircle, Video 
} from 'lucide-react';
import { toast } from 'sonner';
import { GamificationService } from '@/services/gamification.service';

const formatDateForInput = (isoString?: string) => {
  if (!isoString) return '';
  return new Date(isoString).toISOString().slice(0, 16);
};

export default function AdminMissionsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    platform: TaskPlatform.FACEBOOK,
    postUrl: '',
    points: 10,
    startDate: '', 
    endDate: ''    
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await GamificationService.getAllTasks();
      setTasks(data);
    } catch (error) {
      console.error(error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    const now = new Date();
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    setFormData({
      title: '',
      description: '',
      platform: TaskPlatform.FACEBOOK,
      postUrl: '',
      points: 10,
      startDate: localIso, 
      endDate: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: any) => {
    setEditingId(task.id);
    setFormData({
      title: task.title,
      description: task.description || '',
      platform: task.platform,
      postUrl: task.postUrl || '', // Asegura que no sea null
      points: task.points,
      startDate: formatDateForInput(task.startDate),
      endDate: formatDateForInput(task.endDate)
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // CAMBIO: Ya no validamos !formData.postUrl
    if (!formData.title || !formData.startDate) {
      return toast.error("Completa el título y la fecha de inicio");
    }

    const payload = {
        ...formData,
        postUrl: formData.postUrl || null,
        startDate: new Date(formData.startDate).toISOString(), 
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null
    };

    try {
      if (editingId) {
        toast.loading('Actualizando...', { id: 'save' });
        await GamificationService.updateTask(editingId, payload); 
        toast.success('Misión actualizada', { id: 'save' });
      } else {
        toast.loading('Creando...', { id: 'save' });
        await GamificationService.createTask(payload);
        toast.success('Misión creada', { id: 'save' });
      }

      setIsModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error(error); 
      toast.error('Error al guardar', { id: 'save' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar esta misión?')) return;
    try {
      await GamificationService.deleteTask(id);
      toast.success('Eliminada correctamente');
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await GamificationService.toggleStatus(id);
      toast.success('Estado actualizado');
      fetchTasks();
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const getIcon = (platform: string) => {
    switch(platform) {
        case 'FACEBOOK': return <Facebook className="text-blue-600" />;
        case 'INSTAGRAM': return <Instagram className="text-pink-600" />;
        case 'TIKTOK': return <Video className="text-black" />;
        case 'X': return <Twitter className="text-sky-500" />;
        case 'WHATSAPP': return <MessageCircle className="text-green-500" />;
        default: return <LinkIcon className="text-gray-500" />;
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">      
      
      {/* HEADER CORPORATIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-[#1B2541]">Gestor de Misiones</h1>
            <p className="text-slate-500">Crea y administra las tareas para los Búhos Digitales.</p>
        </div>
        <button 
            onClick={handleOpenCreate}
            className="bg-[#FFC400] hover:bg-[#ffd54f] text-[#1B2541] px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition shadow-md shadow-yellow-900/10 active:scale-95"
        >
            <Plus size={20} /> Nueva Misión
        </button>
      </div>

      {/* TABLA DE MISIONES */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-[#1B2541] text-white text-xs uppercase font-bold tracking-wider">
                    <tr>
                        <th className="p-5 w-20 text-center">Red</th>
                        <th className="p-5">Detalle Misión</th>
                        <th className="p-5">Vigencia</th>
                        <th className="p-5">Recompensa</th>
                        <th className="p-5">Estado</th>
                        <th className="p-5 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {tasks.map((task) => (
                        <tr key={task.id} className={`hover:bg-slate-50 transition-colors ${!task.isActive ? 'bg-slate-50/50 opacity-60' : ''}`}>
                            <td className="p-5 text-center">{getIcon(task.platform)}</td>
                            <td className="p-5">
                                <p className="font-bold text-[#1B2541] mb-1 line-clamp-1">{task.title}</p>
                                {/* CAMBIO: Solo muestra el link si existe */}
                                {task.postUrl ? (
                                    <a href={task.postUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[250px] block flex items-center gap-1">
                                        <LinkIcon size={10}/> Ver enlace
                                    </a>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Sin enlace adjunto</span>
                                )}
                            </td>
                            <td className="p-5 text-xs text-slate-500 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase text-[10px]">Inicio</span> 
                                    {new Date(task.startDate).toLocaleDateString()}
                                </div>
                                {task.endDate && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase text-[10px]">Fin</span> 
                                        {new Date(task.endDate).toLocaleDateString()}
                                    </div>
                                )}
                            </td>
                            <td className="p-5">
                                <span className="bg-[#FFC400]/20 text-[#1B2541] border border-[#FFC400]/40 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                                    +{task.points} pts
                                </span>
                            </td>
                            <td className="p-5">
                                {task.isActive ? (
                                    <span className="inline-flex items-center gap-1.5 text-green-700 text-xs font-bold bg-green-100 px-3 py-1 rounded-full">
                                        <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span> Activa
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-bold bg-slate-200 px-3 py-1 rounded-full">
                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Inactiva
                                    </span>
                                )}
                            </td>
                            <td className="p-5 text-right">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleToggleStatus(task.id)}
                                        title={task.isActive ? "Desactivar" : "Activar"}
                                        className={`p-2 rounded-lg transition-colors ${task.isActive ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600' : 'text-green-600 hover:bg-green-50'}`}
                                    >
                                        <Power size={18} />
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleOpenEdit(task)}
                                        title="Editar"
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Pencil size={18} />
                                    </button>

                                    <button 
                                        onClick={() => handleDelete(task.id)}
                                        title="Eliminar"
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {tasks.length === 0 && !loading && (
            <div className="p-16 text-center">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="text-slate-400 h-8 w-8"/>
                </div>
                <h3 className="text-lg font-bold text-[#1B2541]">No hay misiones creadas</h3>
                <p className="text-slate-500 text-sm mt-1">Empieza creando una nueva tarea para los Búhos.</p>
            </div>
        )}
      </div>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B2541]/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                
                <div className="bg-[#1B2541] px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">
                        {editingId ? 'Editar Misión' : 'Crear Nueva Misión'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    <div>
                        <label className="block text-sm font-bold text-[#1B2541] mb-1.5">Título de la Misión</label>
                        <input 
                            type="text" 
                            required
                            className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-[#FFC400] focus:border-[#FFC400] outline-none transition-all"
                            placeholder="Ej: Like al video de campaña"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-[#1B2541] mb-1.5">Plataforma</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-[#FFC400] outline-none bg-white"
                                value={formData.platform}
                                onChange={(e) => setFormData({...formData, platform: e.target.value as any})}
                            >
                                <option value="FACEBOOK">Facebook</option>
                                <option value="INSTAGRAM">Instagram</option>
                                <option value="TIKTOK">TikTok</option>
                                <option value="X">Twitter (X)</option>
                                <option value="WHATSAPP">WhatsApp</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#1B2541] mb-1.5">Puntos</label>
                            <input 
                                type="number" 
                                required
                                min="1"
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-[#FFC400] outline-none"
                                value={formData.points}
                                onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Inicio (Activación)
                            </label>
                            <input 
                                type="datetime-local" 
                                required
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#FFC400] outline-none"
                                value={formData.startDate}
                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Cierre (Opcional)
                            </label>
                            <input 
                                type="datetime-local" 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#FFC400] outline-none"
                                value={formData.endDate}
                                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[#1B2541] mb-1.5">
                            Enlace del Post (URL) <span className="text-slate-400 font-normal text-xs">(Opcional)</span>
                        </label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-3.5 text-slate-400 h-5 w-5" />
                            <input 
                                type="url" 
                                // CAMBIO: Eliminado el atributo required
                                className="w-full border border-slate-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-[#FFC400] outline-none"
                                placeholder="https://..."
                                value={formData.postUrl}
                                onChange={(e) => setFormData({...formData, postUrl: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[#1B2541] mb-1.5">Instrucciones</label>
                        <textarea 
                            rows={3}
                            className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-[#FFC400] outline-none resize-none"
                            placeholder="Ej: Comenta 'Vamos con toda' y toma captura donde se vea tu usuario..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-[#1B2541] hover:bg-[#2a385f] text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 mt-2 transition-all shadow-lg active:scale-95"
                    >
                        <Save size={20} /> {editingId ? 'Guardar Cambios' : 'Publicar Misión'}
                    </button>

                </form>
            </div>
        </div>
      )}
    </div>
  );
}