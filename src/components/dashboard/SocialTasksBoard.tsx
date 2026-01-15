import React, { useEffect, useState, useRef } from 'react';
import { 
  Facebook, Instagram, Twitter, MessageCircle, Link as LinkIcon, 
  Upload, CheckCircle, Clock, AlertCircle 
} from 'lucide-react';
import { toast } from "sonner";
import { SocialTask, TaskPlatform, TaskStatus } from '@/types/gamification';
import { GamificationService } from '@/services/gamification.service';

interface Props {
  onTaskCompleted?: () => void;
}

export default function SocialTasksBoard({ onTaskCompleted }: Props) {
  const [tasks, setTasks] = useState<SocialTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedTaskId = useRef<number | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await GamificationService.getMyTasks();
      setTasks(data);
    } catch (error) {
      console.error(error);
      toast.error('Error obteniendo misiones');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (taskId: number) => {
    selectedTaskId.current = taskId;
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; 
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedTaskId.current === null) return;

    try {
      setUploadingId(selectedTaskId.current);
      toast.loading('Subiendo evidencia...', { id: 'upload' });
      
      await GamificationService.submitEvidence(selectedTaskId.current, file);
      
      toast.success('¡Evidencia enviada! Validando...', { id: 'upload' });
      
      // Recargamos tareas para ver el nuevo estado (PENDING)
      await fetchTasks(); 
      
      // Avisamos al padre (opcional, si quisieras actualizar algo global)
      if (onTaskCompleted) onTaskCompleted();

    } catch (error) {
      toast.error('Error al subir la imagen', { id: 'upload' });
    } finally {
      setUploadingId(null);
      selectedTaskId.current = null;
    }
  };

  // ... (getPlatformConfig se mantiene igual)
  const getPlatformConfig = (platform: TaskPlatform) => {
    switch (platform) {
      case TaskPlatform.FACEBOOK: return { icon: <Facebook />, color: 'text-blue-600', bg: 'bg-blue-50' };
      case TaskPlatform.INSTAGRAM: return { icon: <Instagram />, color: 'text-pink-600', bg: 'bg-pink-50' };
      case TaskPlatform.TWITTER: return { icon: <Twitter />, color: 'text-sky-500', bg: 'bg-sky-50' };
      case TaskPlatform.WHATSAPP: return { icon: <MessageCircle />, color: 'text-green-500', bg: 'bg-green-50' };
      case TaskPlatform.TIKTOK: return { icon: <span className="font-bold">TikTok</span>, color: 'text-black', bg: 'bg-gray-100' };
      default: return { icon: <LinkIcon />, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  return (
    <div className="p-0">      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />

      {loading ? (
        <div className="text-center py-10 bg-white rounded-xl border border-gray-100 text-gray-400">
             Cargando misiones disponibles...
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-500">No hay misiones activas por el momento. ¡Vuelve pronto!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const config = getPlatformConfig(task.platform);
            const isUploading = uploadingId === task.id;

            return (
              <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition hover:shadow-md">
                
                {/* Cabecera */}
                <div className={`p-4 flex justify-between items-center ${config.bg}`}>
                  <div className={`flex items-center gap-2 ${config.color}`}>
                    {config.icon}
                    <span className="font-semibold text-sm">{task.platform}</span>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                    +{task.points} PTS
                  </span>
                </div>

                {/* Body */}
                <div className="p-5 flex-1">
                  <h3 className="font-bold text-gray-800 text-lg mb-2">{task.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {task.description || 'Sin descripción adicional.'}
                  </p>
                  
                  <a 
                    href={task.postUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline flex items-center gap-1 mb-4 w-fit"
                  >
                    <LinkIcon size={14} /> Ir a la publicación
                  </a>

                  {task.myStatus === TaskStatus.REJECTED && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex gap-2 items-start border border-red-100">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <strong>Misión rechazada:</strong> {task.reason}
                        <br />
                        <button className="underline mt-1 font-semibold" onClick={() => handleUploadClick(task.id)}>
                          Intentar de nuevo
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  {task.myStatus === TaskStatus.APPROVED ? (
                    <button disabled className="w-full flex items-center justify-center gap-2 bg-green-100 text-green-700 py-2 rounded-lg font-medium cursor-default border border-green-200">
                      <CheckCircle size={18} /> ¡Completada!
                    </button>
                  ) : task.myStatus === TaskStatus.PENDING ? (
                    <button disabled className="w-full flex items-center justify-center gap-2 bg-blue-100 text-blue-700 py-2 rounded-lg font-medium cursor-default border border-blue-200">
                      <Clock size={18} /> Verificando...
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUploadClick(task.id)}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition active:scale-95 disabled:opacity-70 shadow-sm shadow-indigo-200"
                    >
                      {isUploading ? 'Subiendo...' : <><Upload size={18} /> Subir Evidencia</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}