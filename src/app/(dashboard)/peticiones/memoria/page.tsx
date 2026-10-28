'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BrainCircuit, Loader2, Database, BookOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// Fase 3 del análisis de punta a punta (2026-10-28, GOB-15): el mismo máximo
// que el servidor (`MEMORY_MAX_CHARS`). Un texto largo se guarda en partes.
const MAX_CONTENT_CHARS = 100_000;

function serverMessage(error: unknown): string | undefined {
  const message = (error as { response?: { data?: { message?: string | string[] } } } | null)
    ?.response?.data?.message;
  return Array.isArray(message) ? message[0] : message;
}

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

    if (content.length > MAX_CONTENT_CHARS) {
      return toast.error(
        `El texto tiene ${content.length.toLocaleString('es-CO')} caracteres y el máximo por envío es ${MAX_CONTENT_CHARS.toLocaleString('es-CO')}. Pártelo en varios fragmentos, cada uno con su propio título.`,
      );
    }

    setLoading(true);

    try {
      const normalizeText = (value: string) =>
        value
          .replace(/\r\n/g, '\n')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

      // Plan "Cadena de Firma", Fase 1 (2026-09-03) — unificación: la
      // ingesta de memoria política ahora vive en `PetitionsController`
      // (mismo dueño real de la tabla `Petition`/`PoliticalMemory`), ya no
      // en `IntelligenceController`. El permiso real también coincide
      // ahora con el que ya exige el sidebar para ver esta pantalla
      // (`ENTRENAR_IA`) — antes pedía `INTELIGENCIA`, un permiso distinto.
      const res = await api.post('/petitions/memory/ingest', {
        title: title.trim(),
        content: normalizeText(content),
      });

      if (res.data.success) {
        toast.success(
          res.data.parts > 1
            ? `¡Memoria asimilada en ${res.data.parts} partes! La IA ahora usará este conocimiento.`
            : '¡Memoria asimilada! La IA ahora usará este conocimiento.',
        );
        setTitle('');
        setContent('');
      } else {
        toast.info(res.data.message);
      }
    } catch (error) {
      // Antes decía siempre "Error al conectar con la base de datos vectorial",
      // también cuando el problema era el largo del texto o el servicio de IA.
      toast.error(serverMessage(error) || 'No se pudo guardar en la memoria de la IA. Inténtalo de nuevo en unos minutos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-ai" /> Entrenar Inteligencia Artificial
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Carga leyes, criterios jurídicos, respuestas modelo y antecedentes para que la IA los use al redactar.
          </p>
        </div>
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA: INSTRUCCIONES (UX) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-0 shadow-sm bg-ink text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-secondary">
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
                <p className="text-xs text-slate-600"><strong>Leyes aprobadas:</strong> Resúmenes de artículos importantes donde tu despacho sea autor.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600"><strong>Intervenciones:</strong> Transcripciones de debates de control político clave.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600"><strong>Posturas oficiales:</strong> &quot;El Representante opina que la seguridad ciudadana debe abordarse mediante...&quot;</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO DE INGESTA */}
        <div className="lg:col-span-8">
          <Card className="h-full border-0 shadow-sm">
            <CardHeader className="border-b py-4 bg-white rounded-t-xl">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
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
                  <p className={`text-[10px] mt-1 text-right ${content.length > MAX_CONTENT_CHARS ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                    {content.length.toLocaleString('es-CO')}/{MAX_CONTENT_CHARS.toLocaleString('es-CO')} caracteres · un texto largo se guarda en varias partes
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-ai hover:bg-ai/90 text-ai-foreground font-bold h-12 shadow-md transition-all"
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin mr-2" /> Vectorizando y asimilando memoria...</>
                    ) : (
                      <><BrainCircuit size={18} className="mr-2" /> Guardar en la memoria de la IA</>
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