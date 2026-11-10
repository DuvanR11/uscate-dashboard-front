'use client';

import { localDateTimeInput } from '@/lib/dates';
import React, { useEffect, useState } from 'react';
import { TaskPlatform, AdminTask, TaskEvidence, TaskKind, TaskPriority, TaskFormPayload } from '@/types/gamification';
import {
  Plus, Facebook, Instagram, Twitter, Link as LinkIcon,
  X, Save, Trash2, Pencil, Power, Calendar, MessageCircle, Video, MapPinned
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { GamificationService } from '@/services/gamification.service';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/store/auth-store';
import { usePermission } from '@/hooks/use-permission';
import {
  ADMIN_AUDIENCE_OPTIONS,
  COORDINATOR_AUDIENCE_OPTIONS,
  EVIDENCE_LABEL,
  FIELD_EVIDENCE_OPTIONS,
  PRIORITY_LABEL,
  audienceChoiceOf,
  audienceFields,
  audienceLabel,
  type AudienceChoice,
} from '@/lib/team-tasks';

interface FieldPerson {
  id: string;
  fullName: string;
  role?: { code: string } | null;
}

const ROLE_SHORT: Record<string, string> = {
  LEADER: 'Líder',
  BUHO: 'Voluntario',
  COORDINATOR: 'Coordinador',
};

// Fase 3 (2026-10-28): en la hora de quien edita, no en UTC (ver `localDateTimeInput`).
const formatDateForInput = (isoString?: string) => localDateTimeInput(isoString);

// Fase 3b de la versión estable (2026-11-10): además de las misiones de
// redes, tareas en terreno para un rol, todo el equipo, el equipo de un
// Coordinador o una persona. Un Coordinador ve y crea solo las de su equipo
// (lo decide el servidor) y no borra.
const emptyForm = (coordinator: boolean) => ({
  title: '',
  description: '',
  platform: TaskPlatform.FACEBOOK,
  postUrl: '',
  points: 10,
  startDate: '',
  endDate: '',
  kind: (coordinator ? 'FIELD' : 'SOCIAL') as TaskKind,
  audienceChoice: (coordinator ? 'TEAM' : 'ROLE:BUHO') as AudienceChoice,
  assigneeId: '',
  priority: 'NORMAL' as TaskPriority,
  evidenceType: 'PHOTO' as TaskEvidence,
});

export default function AdminMissionsPage() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const me = useAuthStore((s) => s.user);
  const isCoordinator = me?.role?.code === 'COORDINATOR';
  const canDelete = usePermission('GAMIFICACION_ADMIN', 'canDelete');
  const audienceOptions = isCoordinator ? COORDINATOR_AUDIENCE_OPTIONS : ADMIN_AUDIENCE_OPTIONS;

  const [formData, setFormData] = useState(() => emptyForm(false));
  // Personas del equipo en terreno (un Coordinador recibe solo las suyas).
  const [people, setPeople] = useState<FieldPerson[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    api
      .get('/users?roles=LEADER,BUHO,COORDINATOR&limit=500')
      .then((res) => {
        const list: FieldPerson[] = res.data?.data ?? res.data ?? [];
        setPeople(list.filter((p) => p.id !== me?.id));
      })
      .catch(() => setPeople([]));
  }, [me?.id]);

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
    setFormData({ ...emptyForm(isCoordinator), startDate: localDateTimeInput() });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: AdminTask) => {
    setEditingId(task.id);
    setFormData({
      title: task.title,
      description: task.description || '',
      platform: task.platform,
      postUrl: task.postUrl || '', // Asegura que no sea null
      points: task.points,
      startDate: formatDateForInput(task.startDate),
      endDate: formatDateForInput(task.endDate || undefined),
      kind: task.kind ?? 'SOCIAL',
      audienceChoice: audienceChoiceOf(task.audience ?? 'ROLE', task.audienceRole),
      assigneeId: task.assigneeId ?? '',
      priority: task.priority ?? 'NORMAL',
      evidenceType: task.kind === 'FIELD' ? task.evidenceType : 'PHOTO',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // CAMBIO: Ya no validamos !formData.postUrl
    if (!formData.title || !formData.startDate) {
      return toast.error("Completa el título y la fecha de inicio");
    }
    if (!Number.isInteger(formData.points) || formData.points < 1 || formData.points > 10000) {
      return toast.error("Los puntos deben ser un número entero entre 1 y 10.000");
    }
    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      return toast.error("El cierre debe ser posterior al inicio");
    }

    if (formData.audienceChoice === 'PERSON' && !formData.assigneeId) {
      return toast.error("Elige a la persona que debe hacer la tarea");
    }

    // Solo los campos que el servidor conoce (con campos de más responde 400).
    const social = formData.kind === 'SOCIAL';
    const payload: TaskFormPayload = {
        title: formData.title,
        description: formData.description,
        points: formData.points,
        kind: formData.kind,
        priority: formData.priority,
        ...audienceFields(formData.audienceChoice),
        assigneeId: formData.audienceChoice === 'PERSON' ? formData.assigneeId : undefined,
        platform: social ? formData.platform : undefined,
        postUrl: social ? (formData.postUrl || null) : null,
        evidenceType: social ? undefined : formData.evidenceType,
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
      const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      toast.error('No se pudo guardar la misión', {
        id: 'save',
        description: Array.isArray(message) ? message.join(' ') : message,
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!await confirmDialog('¿Seguro que deseas eliminar esta misión?')) return;
    try {
      await GamificationService.deleteTask(id);
      toast.success('Eliminada correctamente');
      setTasks(tasks.filter(t => t.id !== id));
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await GamificationService.toggleStatus(id);
      toast.success('Estado actualizado');
      fetchTasks();
    } catch {
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
            <h1 className="text-3xl font-black text-foreground">Gestor de Misiones</h1>
            <p className="text-slate-500">
              {isCoordinator
                ? 'Crea y revisa las tareas de tu equipo en terreno.'
                : 'Crea misiones de redes y tareas en terreno para el equipo.'}
            </p>
        </div>
        <button 
            onClick={handleOpenCreate}
            className="bg-secondary hover:bg-[#ffd54f] text-secondary-foreground px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition shadow-md shadow-yellow-900/10 active:scale-95"
        >
            <Plus size={20} /> {isCoordinator ? 'Nueva tarea' : 'Nueva Misión'}
        </button>
      </div>

      {/* TABLA DE MISIONES */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-primary text-white text-xs uppercase font-bold tracking-wider">
                    <tr>
                        <th className="p-5 w-20 text-center">Red</th>
                        <th className="p-5">Detalle Misión</th>
                        <th className="p-5">Para</th>
                        <th className="p-5">Vigencia</th>
                        <th className="p-5">Recompensa</th>
                        <th className="p-5">Estado</th>
                        <th className="p-5 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {tasks.map((task) => (
                        <tr key={task.id} className={`hover:bg-slate-50 transition-colors ${!task.isActive ? 'bg-slate-50/50 opacity-60' : ''}`}>
                            <td className="p-5 text-center">{task.kind === 'FIELD' ? <MapPinned className="text-emerald-600" /> : getIcon(task.platform)}</td>
                            <td className="p-5">
                                <p className="font-bold text-primary mb-1 line-clamp-1">{task.title}</p>
                                {task.kind === 'FIELD' && (
                                    <p className="text-xs text-slate-500 mb-1">
                                        En terreno · pide {EVIDENCE_LABEL[task.evidenceType].toLowerCase()}
                                        {task.priority === 'HIGH' && <span className="ml-2 font-bold text-red-600">Prioridad alta</span>}
                                    </p>
                                )}
                                {task.kind === 'FIELD' ? null : task.postUrl ? (
                                    <a href={task.postUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[250px] block flex items-center gap-1">
                                        <LinkIcon size={10}/> Ver enlace
                                    </a>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Sin enlace adjunto</span>
                                )}
                            </td>
                            <td className="p-5 text-xs text-slate-600">
                                {audienceLabel(task)}
                            </td>
                            <td className="p-5 text-xs text-slate-500 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-600bg-green-50 px-1.5 py-0.5 rounded uppercase text-[10px]">Inicio</span> 
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
                                <span className="bg-secondary/20 text-primary border border-secondary/40 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
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

                                    {canDelete && (
                                    <button
                                        onClick={() => handleDelete(task.id)}
                                        title="Eliminar"
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    )}
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
                <h3 className="text-lg font-bold text-foreground">No hay misiones creadas</h3>
                <p className="text-slate-500 text-sm mt-1">Empieza creando una nueva tarea para los voluntarios.</p>
            </div>
        )}
      </div>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                
                <div className="bg-ink px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">
                        {editingId ? 'Editar Misión' : 'Crear Nueva Misión'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="task-kind" className="block text-sm font-bold text-foreground mb-1.5">Tipo</label>
                            <select
                                id="task-kind"
                                disabled={editingId !== null}
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary outline-none bg-white disabled:bg-slate-100"
                                value={formData.kind}
                                onChange={(e) => setFormData({ ...formData, kind: e.target.value as TaskKind })}
                            >
                                <option value="SOCIAL">Misión de redes</option>
                                <option value="FIELD">Tarea en terreno</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="task-priority" className="block text-sm font-bold text-foreground mb-1.5">Prioridad</label>
                            <select
                                id="task-priority"
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary outline-none bg-white"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                            >
                                {(['HIGH', 'NORMAL', 'LOW'] as TaskPriority[]).map((p) => (
                                    <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="task-audience" className="block text-sm font-bold text-foreground mb-1.5">Para quién</label>
                            <select
                                id="task-audience"
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary outline-none bg-white"
                                value={formData.audienceChoice}
                                onChange={(e) => setFormData({ ...formData, audienceChoice: e.target.value as AudienceChoice })}
                            >
                                {audienceOptions.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                                {/* Un administrador que edita la tarea de un Coordinador la deja «de su equipo». */}
                                {formData.audienceChoice === 'TEAM' && !isCoordinator && (
                                    <option value="TEAM">Equipo del Coordinador</option>
                                )}
                            </select>
                        </div>
                        {formData.audienceChoice === 'PERSON' ? (
                            <div>
                                <label htmlFor="task-assignee" className="block text-sm font-bold text-foreground mb-1.5">Persona</label>
                                <select
                                    id="task-assignee"
                                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary outline-none bg-white"
                                    value={formData.assigneeId}
                                    onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                                >
                                    <option value="">Elige…</option>
                                    {people.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.fullName}{p.role?.code && ROLE_SHORT[p.role.code] ? ` · ${ROLE_SHORT[p.role.code]}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : formData.kind === 'FIELD' ? (
                            <div>
                                <label htmlFor="task-evidence" className="block text-sm font-bold text-foreground mb-1.5">Evidencia que pide</label>
                                <select
                                    id="task-evidence"
                                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary outline-none bg-white"
                                    value={formData.evidenceType}
                                    onChange={(e) => setFormData({ ...formData, evidenceType: e.target.value as TaskEvidence })}
                                >
                                    {FIELD_EVIDENCE_OPTIONS.map((ev) => (
                                        <option key={ev} value={ev}>{EVIDENCE_LABEL[ev]}</option>
                                    ))}
                                </select>
                            </div>
                        ) : <div />}
                    </div>

                    {formData.kind === 'FIELD' && formData.audienceChoice === 'PERSON' && (
                        <div>
                            <label htmlFor="task-evidence-person" className="block text-sm font-bold text-foreground mb-1.5">Evidencia que pide</label>
                            <select
                                id="task-evidence-person"
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary outline-none bg-white"
                                value={formData.evidenceType}
                                onChange={(e) => setFormData({ ...formData, evidenceType: e.target.value as TaskEvidence })}
                            >
                                {FIELD_EVIDENCE_OPTIONS.map((ev) => (
                                    <option key={ev} value={ev}>{EVIDENCE_LABEL[ev]}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {formData.kind === 'FIELD' && formData.evidenceType === 'LOCATION' && (
                        <p className="text-xs text-slate-500 -mt-2">
                            La ubicación la comparte la persona desde su celular al enviar la evidencia, y solo la ve quien revisa la tarea.
                        </p>
                    )}
                    
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-1.5">Título de la Misión</label>
                        <input 
                            type="text" 
                            required
                            className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all"
                            placeholder="Ej: Like al video de campaña"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {formData.kind === 'SOCIAL' ? (
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-1.5">Plataforma</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary outline-none bg-white"
                                value={formData.platform}
                                onChange={(e) => setFormData({...formData, platform: e.target.value as TaskPlatform})}
                            >
                                <option value="FACEBOOK">Facebook</option>
                                <option value="INSTAGRAM">Instagram</option>
                                <option value="TIKTOK">TikTok</option>
                                <option value="X">Twitter (X)</option>
                                <option value="WHATSAPP">WhatsApp</option>
                            </select>
                        </div>
                        ) : <div />}
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-1.5">Puntos</label>
                            <input 
                                type="number" 
                                required
                                min="1"
                                max="10000"
                                step="1"
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary outline-none"
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
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-secondary outline-none"
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
                                min={formData.startDate || undefined}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-secondary outline-none"
                                value={formData.endDate}
                                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                            />
                        </div>
                    </div>

                    {formData.kind === 'SOCIAL' && (
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-1.5">
                            Enlace del Post (URL) <span className="text-slate-400 font-normal text-xs">(Opcional)</span>
                        </label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-3.5 text-slate-400 h-5 w-5" />
                            <input 
                                type="url" 
                                // CAMBIO: Eliminado el atributo required
                                className="w-full border border-slate-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-secondary outline-none"
                                placeholder="https://..."
                                value={formData.postUrl}
                                onChange={(e) => setFormData({...formData, postUrl: e.target.value})}
                            />
                        </div>
                    </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-foreground mb-1.5">Instrucciones</label>
                        <textarea 
                            rows={3}
                            className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-secondary outline-none resize-none"
                            placeholder={formData.kind === 'FIELD'
                                ? "Ej: Entrega 50 volantes en la plaza principal y toma una foto del punto."
                                : "Ej: Comenta 'Vamos con toda' y toma captura donde se vea tu usuario..."}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 mt-2 transition-all shadow-lg active:scale-95"
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