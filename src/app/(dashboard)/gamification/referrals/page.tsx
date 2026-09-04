'use client';

import React, { useState } from 'react';
import { Copy, Share2, Sparkles, Gift, Check } from 'lucide-react';
import { toast } from 'sonner';
// import { useAuth } from '@/hooks/useAuth'; // Asumo que tienes un hook para sacar el usuario

export default function GoldenReferralPage() {
  // const { user } = useAuth(); 
  // MOCK DATA (Bórralo cuando conectes tu auth real)
  const user = { id: '642198e6-38ff-478c-abbd-d1f4e25a3aef', fullName: 'Jose Jaime' };

  const [copied, setCopied] = useState(false);
  
  // Enlace Único: app.com/join?ref=ID_DEL_USUARIO
  const referralLink = `${window.location.origin}/join?ref=${user.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('¡Enlace VIP copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const text = `¡Únete a mi equipo de Búhos Digitales! 🦉\n\nTenemos misiones exclusivas y premios.\nRegístrate gratis aquí 👇\n${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-8 min-h-screen bg-slate-50 flex flex-col items-center">
      
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-4xl font-black text-primary mb-4">Invita y Gana</h1>
        <p className="text-slate-600 text-lg">
          Por cada amigo que se una con tu enlace exclusivo, recibirás <span className="font-bold text-secondary bg-primary px-2 rounded">+10 Puntos</span> inmediatamente.
        </p>
      </div>

      {/* TARJETA DORADA (GOLDEN TICKET) */}
      <div className="relative w-full max-w-xl group">
        {/* Efecto de brillo de fondo */}
        <div className="absolute -inset-1 bg-gradient-to-r from-secondary via-yellow-200 to-secondary rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-primary rounded-2xl p-8 md:p-12 text-center border border-secondary/30 shadow-2xl">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-secondary text-primary p-3 rounded-full shadow-lg border-4 border-slate-50">
            <Sparkles size={32} fill="white" className="text-white" />
          </div>

          <h2 className="text-white font-bold text-2xl mt-4 mb-2 tracking-widest uppercase">Enlace VIP</h2>
          <p className="text-slate-400 text-sm mb-8">Este enlace es único para tu cuenta.</p>

          {/* CAJA DEL ENLACE */}
          <div className="bg-white/10 rounded-xl p-2 flex items-center justify-between border border-white/10 mb-8 backdrop-blur-sm">
            <code className="text-secondary text-sm px-4 truncate flex-1 font-mono">
              {referralLink}
            </code>
            <button 
              onClick={handleCopy}
              className="bg-secondary hover:bg-[#ffd54f] text-primary p-3 rounded-lg font-bold transition-all active:scale-95 flex items-center gap-2"
            >
              {copied ? <Check size={18}/> : <Copy size={18}/>}
            </button>
          </div>

          <button 
            onClick={handleShare}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-900/20 active:scale-95"
          >
            <Share2 size={20} /> Compartir por WhatsApp
          </button>
          
          <div className="mt-6 flex justify-center items-center gap-2 text-white/40 text-xs">
            <Gift size={14} />
            <span>Tus amigos recibirán acceso inmediato</span>
          </div>
        </div>
      </div>

    </div>
  );
}