'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BrainCircuit, Loader2, ArrowLeft, Database, BookOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function MemoriaPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      return toast.error("El título y el contenido son obligatorios.");
    }
    
    if (content.length < 50) {
      return toast.warning("El contenido es muy corto. Ingresa al menos un párrafo para que la IA tenga buen contexto.");
    }

    setLoading(true);

    try {
      const res = await api.post('/intelligence/memory/ingest', {
        title,
        content
      });

      if (res.data.success) {
        toast.success("¡Memoria asimilada! La IA ahora usará este conocimiento.");
        setTitle('');
        setContent('');
      } else {
        toast.info(res.data.message);
      }
    } catch (error) {
      toast.error("Error al conectar con la base de datos vectorial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-[#FFC400]" /> Entrenar Inteligencia Artificial
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Alimenta la base de datos vectorial con leyes, ponencias y discursos del Representante.
          </p>
        </div>
        
        <Link href="/inteligencia">
          <Button variant="outline" className="border-[#1B2541] text-[#1B2541] hover:bg-slate-200">
            <ArrowLeft size={16} className="mr-2" /> Volver al Tablero
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA: INSTRUCCIONES (UX) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-0 shadow-sm bg-[#1B2541] text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-[#FFC400]">
                <Database size={20} /> ¿Cómo funciona esto?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                Este módulo utiliza tecnología <strong>RAG (Retrieval-Augmented Generation)</strong>. Cada texto que ingreses aquí se convertirá en coordenadas matemáticas (vectores).
              </p>
              <p>
                Cuando vayas al módulo de <em>Proyector de Peticiones</em> o <em>Redactor de Plenarias</em>, la IA buscará primero en este archivo y redactará las respuestas utilizando <strong>exactamente la postura política y las leyes</strong> que le hayas enseñado aquí.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-slate-700">Ejemplos de qué subir:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600"><strong>Leyes aprobadas:</strong> Resúmenes de artículos importantes donde Uscátegui sea autor.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600"><strong>Intervenciones:</strong> Transcripciones de debates de control político clave.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600"><strong>Posturas oficiales:</strong> "El Representante opina que la seguridad ciudadana debe abordarse mediante..."</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO DE INGESTA */}
        <div className="lg:col-span-8">
          <Card className="h-full border-0 shadow-sm">
            <CardHeader className="border-b py-4 bg-white rounded-t-xl">
              <CardTitle className="text-lg text-[#1B2541] flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" /> Nuevo Fragmento de Memoria
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleIngest} className="space-y-6">
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                    Título o Referencia
                  </label>
                  <Input 
                    placeholder="Ej: Debate Seguridad Bogotá - Marzo 2023" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-600 font-medium"
                    maxLength={100}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 text-right">{title.length}/100</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                    Contenido Político / Argumento
                  </label>
                  <Textarea 
                    placeholder="Pega aquí el texto de la ley, el discurso o la postura política. Sé claro y detallado. Entre más contexto, mejor responderá la IA en el futuro..." 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[300px] bg-slate-50 border-slate-200 focus-visible:ring-blue-600 resize-y leading-relaxed text-slate-700"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#1B2541] hover:bg-slate-800 text-white font-bold h-12 shadow-md transition-all"
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin mr-2" /> Vectorizando y asimilando memoria...</>
                    ) : (
                      <><BrainCircuit size={18} className="mr-2" /> Guardar en la Memoria Vectorial (RAG)</>
                    )}
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}