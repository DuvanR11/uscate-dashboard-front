'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, Eye, CheckCircle2, XCircle, Clock, 
  Facebook, Instagram, Twitter, Video, MessageCircle, Link as LinkIcon, X, 
  ExternalLink
} from 'lucide-react';
import { GamificationService } from '@/services/gamification.service';
import { toast } from 'sonner';
import Link from 'next/link';

// --- TIPOS DE DATOS (Basado en tu JSON) ---
interface User {
    id: string;
    fullName: string;
    email: string;
}

interface Task {
    title: string;
    platform: string;
    points: number;
}

interface Submission {
    id: number;
    userId: string;
    taskId: number;
    proofUrl: string; // <-- Ajustado a tu JSON
    status: 'PENDING' | 'APPROVED' | 'REJECTED'; // <-- Ajustado a tu JSON
    rejectionReason: string | null;
    createdAt: string;
    user: User;
    task: Task;
}

// --- COMPONENTES HELPER ---

const getPlatformIcon = (platform: string) => {
    switch(platform) {
        case 'FACEBOOK': return <Facebook className="text-blue-600" size={18} />;
        case 'INSTAGRAM': return <Instagram className="text-pink-600" size={18} />;
        case 'TIKTOK': return <Video className="text-black" size={18} />;
        case 'X': return <Twitter className="text-sky-500" size={18} />;
        case 'WHATSAPP': return <MessageCircle className="text-green-500" size={18} />;
        default: return <LinkIcon className="text-gray-500" size={18} />;
    }
};

const StatusBadge = ({ status, reason }: { status: string, reason?: string | null }) => {
    if (status === 'APPROVED') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                <CheckCircle2 size={14} /> Aprobada
            </span>
        );
    }
    if (status === 'REJECTED') {
        return (
            <div className="group relative inline-block">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 cursor-help">
                    <XCircle size={14} /> Rechazada
                </span>
                {/* Tooltip con la razón del rechazo */}
                {reason && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                        <p className="font-bold mb-1">Motivo:</p>
                        {reason}
                        {/* Triangulito del tooltip */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                    </div>
                )}
            </div>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
            <Clock size={14} /> Pendiente
        </span>
    );
};

// --- PÁGINA PRINCIPAL ---

export default function AdminHistoryPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, APPROVED, REJECTED, PENDING
    const [search, setSearch] = useState('');
    
    // Estado para el Modal de Evidencia
    const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await GamificationService.getHistory();
            setSubmissions(data);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando historial");
        } finally {
            setLoading(false);
        }
    };

    // Lógica de filtrado
    const filteredData = submissions.filter(item => {
        // 1. Filtro por Estado (Usando el string status)
        if (filter !== 'ALL' && item.status !== filter) return false;

        // 2. Filtro por Búsqueda (Usuario o Misión)
        if (search) {
            const searchLower = search.toLowerCase();
            const userName = item.user?.fullName?.toLowerCase() || '';
            const userEmail = item.user?.email?.toLowerCase() || '';
            const taskTitle = item.task?.title?.toLowerCase() || '';
            
            return userName.includes(searchLower) || 
                   userEmail.includes(searchLower) || 
                   taskTitle.includes(searchLower);
        }
        return true;
    });

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#1B2541]">Historial de Participaciones</h1>
                <p className="text-slate-500">Auditoría completa de todas las misiones enviadas por los usuarios.</p>
            </div>

            {/* Toolbar de Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
                <div className="flex gap-2 p-1 bg-white rounded-lg border border-slate-200">
                    {[
                        { key: 'ALL', label: 'Todos' },
                        { key: 'APPROVED', label: 'Aprobados' },
                        { key: 'REJECTED', label: 'Rechazados' },
                        { key: 'PENDING', label: 'Pendientes' }
                    ].map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => setFilter(opt.key)}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                                filter === opt.key 
                                ? 'bg-[#1B2541] text-white shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 text-slate-400 h-4 w-4" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, email o misión..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC400]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#1B2541] text-white text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-4">Usuario</th>
                                <th className="p-4">Misión / Plataforma</th>
                                <th className="p-4">Fecha Envío</th>
                                <th className="p-4">Evidencia</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 text-right">Puntos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Cargando datos...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No se encontraron registros.</td></tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4">
                                            <Link 
                                                href={`/users/${item.user?.id}`} 
                                                className="group/link block"
                                            >
                                                <div className="font-bold text-[#1B2541] group-hover/link:text-blue-600 group-hover/link:underline transition-colors flex items-center gap-2">
                                                    {item.user?.fullName}
                                                    <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 text-blue-500 transition-opacity" />
                                                </div>
                                                <div className="text-xs text-slate-500 group-hover/link:text-blue-400 transition-colors">
                                                    {item.user?.email}
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-100 rounded-md">
                                                    {getPlatformIcon(item.task?.platform)}
                                                </div>
                                                <span className="font-medium text-slate-700 max-w-[200px] truncate block" title={item.task?.title}>
                                                    {item.task?.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500 whitespace-nowrap">
                                            <div className="font-medium">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs opacity-70">
                                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {item.proofUrl ? (
                                                <button 
                                                    onClick={() => setEvidenceUrl(item.proofUrl)}
                                                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline text-xs font-bold border border-blue-100 bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
                                                >
                                                    <Eye size={14} /> Ver captura
                                                </button>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Sin adjunto</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={item.status} reason={item.rejectionReason} />
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`font-bold px-2 py-1 rounded text-xs ${
                                                item.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 
                                                item.status === 'REJECTED' ? 'bg-red-50 text-red-400 line-through' : 
                                                'bg-slate-100 text-slate-400'
                                            }`}>
                                                +{item.task?.points} pts
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE EVIDENCIA (Lightbox) */}
            {evidenceUrl && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B2541]/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setEvidenceUrl(null)}
                >
                    <div className="relative max-w-5xl w-full flex flex-col items-center">
                        {/* Botón Cerrar */}
                        <button 
                            onClick={() => setEvidenceUrl(null)}
                            className="absolute -top-12 right-0 md:-right-8 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full"
                        >
                            <X size={24} />
                        </button>
                        
                        {/* Imagen */}
                        <img 
                            src={evidenceUrl} 
                            alt="Evidencia" 
                            className="rounded-lg shadow-2xl max-h-[85vh] object-contain bg-black border border-white/10"
                            onClick={(e) => e.stopPropagation()} 
                        />
                        
                        <p className="text-white/50 text-xs mt-4">Clic fuera de la imagen para cerrar</p>
                    </div>
                </div>
            )}

        </div>
    );
}