'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, ZoomIn, RefreshCw, ExternalLink, User, Calendar, Award } from 'lucide-react';
import { toast } from 'sonner';
import { GamificationService } from '@/services/gamification.service';

interface AuditItem {
  id: number;
  proofUrl: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  task: {
    title: string;
    platform: string;
    points: number;
  };
}

export default function AdminAuditPage() {
  const [reviews, setReviews] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    loadReviews(); 
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await GamificationService.getPendingAudits();
      setReviews(data);
    } catch (error) {
      console.error(error);
      toast.error('Error cargando evidencias');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id: number, approved: boolean) => {
    let reason = 'Aprobado manualmente';

    if (!approved) {
      const input = window.prompt("¿Por qué rechazas esta evidencia?", "La imagen no corresponde a la misión");
      if (input === null) return; 
      reason = input;
    }

    try {
      await GamificationService.auditDecision(id, approved, reason);
      toast.success(approved ? 'Evidencia Aprobada ✅' : 'Evidencia Rechazada ❌');
      setReviews((prev) => prev.filter(r => r.id !== id));
    } catch (error) {
      toast.error('Hubo un error al procesar la decisión');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50 text-slate-500 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B2541]"></div>
        <p className="font-medium animate-pulse">Cargando auditoría...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* HEADER CORPORATIVO */}
      <div className="bg-[#1B2541] text-white pt-8 pb-16 px-6 relative overflow-hidden mb-8 shadow-md">
         {/* Decoración */}
         <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-[#FFC400] rounded-full opacity-10 blur-3xl"></div>
         
         <div className="max-w-7xl mx-auto flex justify-between items-end relative z-10">
            <div>
                <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                    🕵️ Auditoría de Evidencias
                </h1>
                <p className="text-slate-300 text-sm max-w-lg">
                    Revisión manual de tareas fallidas o pendientes de aprobación.
                </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3 rounded-xl flex items-center gap-3">
                <div className="text-right">
                    <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">Pendientes</p>
                    <p className="text-2xl font-black text-[#FFC400] leading-none">{reviews.length}</p>
                </div>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
        
        {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed">
                <div className="bg-green-50 p-4 rounded-full mb-4">
                    <Check size={48} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-[#1B2541] mb-2">¡Todo al día!</h3>
                <p className="text-slate-500 mb-6">No hay evidencias pendientes de revisión en este momento.</p>
                <button 
                    onClick={loadReviews} 
                    className="text-[#1B2541] hover:text-[#FFC400] font-bold text-sm flex items-center gap-2 transition-colors border-b-2 border-transparent hover:border-[#FFC400]"
                >
                    <RefreshCw size={16}/> Recargar lista
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300 group">
                
                {/* Imagen (Evidencia) */}
                <div className="relative h-64 bg-slate-900 group-hover:brightness-110 transition-all overflow-hidden">
                    <img 
                        src={item.proofUrl} 
                        alt="Evidencia" 
                        className="w-full h-full object-contain opacity-90 group-hover:scale-105 transition-transform duration-500" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Error+Cargando+Imagen';
                        }}
                    />
                    
                    {/* Overlay Hover */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 backdrop-blur-[2px]">
                        <a 
                        href={item.proofUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white text-[#1B2541] px-5 py-2.5 rounded-full font-bold hover:bg-[#FFC400] transition-colors shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-300"
                        >
                        <ZoomIn size={18} /> Ver Completa
                        </a>
                    </div>

                    <div className="absolute top-3 right-3 bg-black/70 text-white text-[10px] font-medium px-2 py-1 rounded-md backdrop-blur-md flex items-center gap-1">
                        <Calendar size={10} className="text-slate-300"/>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col">
                    <div className="mb-4">
                        <span className="inline-block text-[10px] font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase mb-2 border border-slate-200">
                            {item.task.platform}
                        </span>
                        <h3 className="font-bold text-[#1B2541] text-lg leading-tight line-clamp-2" title={item.task.title}>
                            {item.task.title}
                        </h3>
                    </div>
                    
                    <div className="mt-auto space-y-3">
                        {/* Usuario */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="bg-slate-200 p-1.5 rounded-full text-slate-500">
                                    <User size={14} />
                                </div>
                                <div className="flex flex-col truncate">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Usuario</span>
                                    <Link 
                                        href={`/users/${item.user.id}`} 
                                        target="_blank"
                                        className="font-bold text-sm text-[#1B2541] hover:text-blue-600 truncate flex items-center gap-1 transition-colors"
                                        title={item.user.fullName}
                                    >
                                        {item.user.fullName} <ExternalLink size={10} className="opacity-50"/>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Puntos */}
                        <div className="flex items-center justify-between px-3">
                            <span className="text-xs text-slate-500 font-medium">Recompensa</span>
                            <span className="font-bold text-[#1B2541] flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100 text-xs">
                                <Award size={12}/> +{item.task.points} PTS
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className="grid grid-cols-2 border-t border-slate-100">
                    <button 
                    onClick={() => handleDecision(item.id, false)}
                    className="py-4 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 font-bold flex justify-center items-center gap-2 transition-colors text-sm border-r border-slate-100"
                    >
                    <X size={18} /> Rechazar
                    </button>
                    <button 
                    onClick={() => handleDecision(item.id, true)}
                    className="py-4 bg-white hover:bg-green-50 text-[#1B2541] hover:text-green-700 font-bold flex justify-center items-center gap-2 transition-colors text-sm"
                    >
                    <Check size={18} /> Aprobar
                    </button>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
}