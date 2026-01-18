'use client';

import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, Clock, UploadCloud, XCircle, 
  AlertCircle, ExternalLink, ChevronRight, Eye, 
  Instagram,
  Facebook,
  Youtube,
  Megaphone
} from 'lucide-react';
import { toast } from 'sonner';
import { GamificationService } from '@/services/gamification.service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const XIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

// Logo oficial de TikTok
const TikTokIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.65-1.55-1.1-.06-.06-.15-.05-.22-.05v9.81c-.08 2.85-2.06 5.38-4.96 5.86-2.95.49-5.93-1.2-6.83-4.05-.72-2.28-.1-4.79 1.61-6.41 1.65-1.57 4.14-1.79 6.04-.55v4.22c-1.13-.76-2.61-.88-3.86-.33-1.17.51-1.97 1.63-2.07 2.91-.12 1.45.92 2.79 2.33 3.06 1.47.28 2.96-.53 3.55-1.89.37-.85.37-1.8.37-2.73V.02Z"/>
  </svg>
);

// Interfaces (Asegúrate de que coincidan con tu servicio)
interface Task {
  id: number;
  title: string;
  description?: string;
  points: number;
  platform: string;
  postUrl?: string;
  endDate?: string;
  myStatus: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
}

interface Props {
  onTaskCompleted: () => void;
}

export default function SocialTasksBoard({ onTaskCompleted }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el Modal de Detalles
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Estados de subida
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await GamificationService.getMyTasks();
      const safeData = data.map((t: any) => ({
        ...t,
        description: t.description || '' // Si es null/undefined, pon string vacío
      }));

      setTasks(safeData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (taskId: number, file: File) => {
    try {
      setUploadingId(taskId);
      await GamificationService.submitEvidence(taskId, file);
      toast.success('Evidencia enviada. La IA la verificará en breve.');
      loadTasks(); // Recargar estados
      onTaskCompleted(); // Actualizar puntos en el padre
      setIsDetailOpen(false); // Cerrar modal si estaba abierto
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al subir evidencia');
    } finally {
      setUploadingId(null);
    }
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'INSTAGRAM': 
        return <Instagram className="text-pink-600" size={24} />;
      
      case 'FACEBOOK': 
        return <Facebook className="text-blue-600" size={24} />;
      
      case 'TIKTOK': 
        return <TikTokIcon className="text-black" size={24} />;
      
      case 'X': 
      case 'TWITTER':
        return <XIcon className="text-black" size={22} />;
      
      case 'YOUTUBE': 
        return <Youtube className="text-red-600" size={24} />;
      
      default: 
        return <Megaphone className="text-slate-400" size={24} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Completada</Badge>;
      case 'PENDING': return <Badge className="bg-blue-500 hover:bg-blue-600"><Clock className="w-3 h-3 mr-1"/> Verificando</Badge>;
      case 'REJECTED': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Rechazada</Badge>;
      default: return <Badge variant="outline" className="text-slate-500">Disponible</Badge>;
    }
  };

  if (loading) return <div className="p-4 text-center text-slate-400">Cargando misiones...</div>;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            
            {/* Cabecera Tarjeta */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getPlatformIcon(task.platform)}</span>
                <span className="font-bold text-[#FFC400] text-sm border border-[#FFC400]/30 bg-[#FFC400]/10 px-2 py-0.5 rounded">
                  +{task.points} PTS
                </span>
              </div>
              {getStatusBadge(task.myStatus)}
            </div>

            {/* Título y Descripción Truncada */}
            <h3 className="font-bold text-[#1B2541] leading-tight mb-2 line-clamp-1" title={task.title}>
              {task.title}
            </h3>
            
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">
              {task.description}
            </p>

            {/* Footer de Tarjeta */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
              
              {/* Botón Ver Detalles (Abre Modal) */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#1B2541] hover:text-blue-600 p-0 h-auto font-bold text-xs"
                onClick={() => openTaskDetails(task)}
              >
                <Eye size={14} className="mr-1"/> Ver detalles
              </Button>

              {/* Acciones Rápidas (Solo si no está completada/pendiente) */}
              {task.myStatus === 'NOT_STARTED' || task.myStatus === 'REJECTED' ? (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(task.id, e.target.files[0]);
                    }}
                    disabled={uploadingId === task.id}
                  />
                  <Button size="sm" className="bg-[#1B2541] hover:bg-[#2a385f] text-xs h-8" disabled={uploadingId === task.id}>
                    {uploadingId === task.id ? 'Subiendo...' : 'Subir Captura'}
                    <UploadCloud size={14} className="ml-1" />
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Mensaje de Rechazo (Si existe) */}
            {task.myStatus === 'REJECTED' && task.reason && (
              <div className="mt-3 bg-red-50 p-2 rounded text-xs text-red-600 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0"/>
                <span><strong>Motivo:</strong> {task.reason}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* --- MODAL DE DETALLES (POPUP) --- */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md bg-white">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl text-[#1B2541]">
                  <span>{getPlatformIcon(selectedTask.platform)}</span>
                  {selectedTask.title}
                </DialogTitle>
                <div className="flex gap-2 mt-2">
                    {getStatusBadge(selectedTask.myStatus)}
                    <Badge variant="outline" className="border-[#FFC400] text-[#1B2541] bg-[#FFC400]/10">
                        Recompensa: {selectedTask.points} Puntos
                    </Badge>
                </div>
              </DialogHeader>

              {/* Contenido Scrollable */}
              <div className="max-h-[60vh] overflow-y-auto space-y-4 my-2 pr-2">
                
                {/* Descripción Completa */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h4 className="font-bold text-sm text-[#1B2541] mb-2">Instrucciones:</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                        {selectedTask.description}
                    </p>
                </div>

                {/* Link al Post */}
                {selectedTask.postUrl && (
                    <a 
                        href={selectedTask.postUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 text-sm font-medium"
                    >
                        Ir a la publicación <ExternalLink size={16}/>
                    </a>
                )}

                {/* Zona de Error */}
                {selectedTask.myStatus === 'REJECTED' && selectedTask.reason && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm text-red-700">
                        <p className="font-bold flex items-center gap-1"><XCircle size={14}/> Tarea Rechazada:</p>
                        <p className="mt-1">{selectedTask.reason}</p>
                    </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                    Cerrar
                </Button>

                {/* Botón de Acción en el Modal */}
                {(selectedTask.myStatus === 'NOT_STARTED' || selectedTask.myStatus === 'REJECTED') && (
                    <div className="relative w-full sm:w-auto">
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleFileUpload(selectedTask.id, e.target.files[0]);
                            }}
                            disabled={uploadingId === selectedTask.id}
                        />
                        <Button className="w-full bg-[#1B2541] hover:bg-[#2a385f]" disabled={uploadingId === selectedTask.id}>
                            {uploadingId === selectedTask.id ? 'Subiendo...' : 'Subir Evidencia Ahora'}
                            <UploadCloud size={16} className="ml-2" />
                        </Button>
                    </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}