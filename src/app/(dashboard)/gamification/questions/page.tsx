'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, Upload, CheckCircle2, Trophy, 
  Users, ChevronDown, ChevronUp, AlertCircle, Smartphone 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// --- DATOS DE PREGUNTAS FRECUENTES ---
const FAQS = [
  {
    question: "¿Qué es un Búho Digital?",
    answer: "Es un activista clave en nuestra campaña. Tu misión es amplificar nuestro mensaje en redes sociales, combatir la desinformación y sumar nuevos seguidores a través de interacciones digitales."
  },
  {
    question: "¿Cómo gano puntos?",
    answer: "Ganas puntos de dos formas: 1) Completando las 'Misiones' diarias (dar like, comentar, compartir) y subiendo la captura de pantalla. 2) Refiriendo amigos con tu enlace único; cada persona que se registre suma puntos a tu perfil."
  },
  {
    question: "¿Qué pasa si rechazan mi evidencia?",
    answer: "Si la Inteligencia Artificial o un administrador rechaza tu captura, recibirás una notificación con el motivo (ej: 'No se ve el like'). Podrás volver a realizar la misión y subir una nueva foto para reclamar tus puntos."
  },
  {
    question: "¿Para qué sirven los rangos (Bronce, Plata, Oro)?",
    answer: "Los rangos demuestran tu compromiso. A medida que subes de nivel, desbloqueas insignias especiales y accedes a eventos exclusivos con el candidato. ¡La meta es llegar a ser Búho Dorado!"
  },
  {
    question: "¿Cómo invito a mis amigos?",
    answer: "En tu panel principal encontrarás un botón dorado que dice 'Copiar Link de Referido'. Envíalo por WhatsApp a tus conocidos. Cuando ellos se registren, el sistema detectará automáticamente que vienen de tu parte."
  }
];

// --- DATOS DE RANGOS ---
const RANKS = [
  { level: 'Novato 🐣', points: '0 - 99', desc: 'El inicio del camino.' },
  { level: 'Bronce 🥉', points: '100 - 499', desc: 'Activista constante.' },
  { level: 'Plateado 🥈', points: '500 - 999', desc: 'Influenciador clave.' },
  { level: 'Dorado 🏆', points: '1000+', desc: 'Líder de opinión digital.' },
];

export default function BuhoHelpPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* 1. HERO SECTION */}
      <div className="bg-[#1B2541] text-white pt-12 pb-20 px-6 relative overflow-hidden rounded-b-[3rem] shadow-xl">
        {/* Decoración Fondo */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#FFC400] rounded-full opacity-10 blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/10 shadow-lg">
            <HelpCircle className="h-8 w-8 text-[#FFC400]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
            Manual del <span className="text-[#FFC400]">Búho Digital</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
            Aprende cómo funciona nuestra plataforma, cómo completar misiones y convertirte en una leyenda de la campaña.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-12 relative z-20 space-y-16">

        {/* 2. CÓMO FUNCIONA (PASO A PASO) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard 
                number="1"
                icon={<Smartphone className="text-white" />}
                title="Elige tu Misión"
                desc="Entra a tu tablero y selecciona una tarea activa (Facebook, Instagram, WhatsApp, etc)."
            />
            <StepCard 
                number="2"
                icon={<Upload className="text-white" />}
                title="Sube la Evidencia"
                desc="Realiza la acción (Like/Comentario), toma una captura de pantalla y súbela al sistema."
            />
            <StepCard 
                number="3"
                icon={<Trophy className="text-white" />}
                title="Gana Puntos"
                desc="Nuestra IA validará tu foto. Si es correcta, sumarás puntos y subirás en el ranking."
            />
        </div>

        {/* 3. SISTEMA DE RANGOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50/50 p-6 border-b border-slate-100 text-center">
                <h2 className="text-2xl font-bold text-[#1B2541]">Sistema de Rangos</h2>
                <p className="text-slate-500 text-sm mt-1">Tu esfuerzo tiene recompensa y reconocimiento.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {RANKS.map((rank, index) => (
                    <div key={index} className="p-6 text-center hover:bg-slate-50 transition-colors group">
                        <h3 className="text-lg font-black text-[#1B2541] mb-1 group-hover:scale-110 transition-transform duration-300">
                            {rank.level}
                        </h3>
                        <span className="inline-block bg-[#FFC400]/10 text-[#1B2541] text-xs font-bold px-3 py-1 rounded-full border border-[#FFC400]/20 mb-3">
                            {rank.points} pts
                        </span>
                        <p className="text-sm text-slate-500">
                            {rank.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>

        {/* 4. PREGUNTAS FRECUENTES (ACCORDION) */}
        <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1B2541] text-center mb-8 flex items-center justify-center gap-2">
                <CheckCircle2 className="text-[#FFC400]" /> Preguntas Frecuentes
            </h2>
            <div className="space-y-4">
                {FAQS.map((faq, index) => (
                    <AccordionItem key={index} question={faq.question} answer={faq.answer} />
                ))}
            </div>
        </div>

        {/* 5. CTA FINAL */}
        <div className="text-center py-10">
            <div className="bg-[#1B2541] rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-white max-w-4xl mx-auto">
                {/* Fondo decorativo */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                
                <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">¿Listo para empezar?</h2>
                    <p className="text-slate-300 mb-8 max-w-xl mx-auto">
                        Hay misiones esperando por ti. Únete a la fuerza digital más grande y marca la diferencia.
                    </p>
                    <Link href="/gamification">
                        <Button size="lg" className="bg-[#FFC400] text-[#1B2541] hover:bg-[#ffd54f] font-bold px-8 h-12 rounded-xl shadow-lg transition-transform hover:scale-105">
                            Ir a Mis Misiones
                        </Button>
                    </Link>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function StepCard({ number, icon, title, desc }: { number: string, icon: any, title: string, desc: string }) {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 relative group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute -top-4 -left-4 w-10 h-10 bg-[#FFC400] rounded-xl flex items-center justify-center text-[#1B2541] font-black text-lg shadow-md rotate-3 group-hover:rotate-6 transition-transform">
                {number}
            </div>
            <div className="mb-4 bg-[#1B2541] w-12 h-12 rounded-full flex items-center justify-center shadow-lg group-hover:bg-[#2a385f] transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-[#1B2541] mb-2">{title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
                {desc}
            </p>
        </div>
    );
}

function AccordionItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-md">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
            >
                <span className="font-bold text-[#1B2541] text-lg">{question}</span>
                {isOpen ? (
                    <ChevronUp className="text-[#FFC400]" />
                ) : (
                    <ChevronDown className="text-slate-400" />
                )}
            </button>
            <div 
                className={`px-5 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <p className="text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
                    {answer}
                </p>
            </div>
        </div>
    );
}