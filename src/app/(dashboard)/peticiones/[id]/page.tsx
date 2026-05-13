'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BrainCircuit, Save, CheckCircle, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/apis';

export default function PetitionEditorPage() {
  const params = useParams();
  const router = useRouter();
  
  const [petition, setPetition] = useState<any>(null);
  const [draftContent, setDraftContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // NUEVO ESTADO: Controla quién va a firmar el documento
  const [senderRole, setSenderRole] = useState<'CIUDADANO' | 'CONGRESISTA'>('CIUDADANO');

  useEffect(() => {
    fetchPetition();
  }, [params.id]);

  const fetchPetition = async () => {
    try {
      const data = await apiGet(`/petitions/${params.id}`) as any;
      setPetition(data);
      setDraftContent(data.generatedDraft || '');
    } catch (error) {
      console.error('Error fetching petition', error);
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      // Pasamos el senderRole al backend para que cambie el Prompt
      const res = await apiPost(`/petitions/${params.id}/generate-ai`, { senderRole }) as any;
      setPetition(res);
      setDraftContent(res.generatedDraft);
    } catch (error) {
      alert('Error al generar con IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiPatch(`/petitions/${params.id}`, { 
        generatedDraft: draftContent,
        status: 'EN_REVISION' // O lo pasas a FIRMADO según tu flujo
      });
      alert('¡Documento guardado con éxito!');
    } catch (error) {
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!petition) return <div className="p-10 text-center text-slate-500">Cargando documento...</div>;

  const deadline = new Date(petition.deadlineAt).toLocaleDateString('es-CO');

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] pb-6">
      {/* HEADER DE LA HERRAMIENTA */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/peticiones" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1B2541]">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1B2541]">Redactor Legal</h1>
            <p className="text-sm font-medium text-slate-500">
              Peticionario: <span className="text-slate-700">{petition.petitioner}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 border border-orange-200">
            <Clock size={16} />
            Límite legal: {deadline}
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving || !draftContent}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSaving ? <BrainCircuit className="animate-pulse" size={16}/> : <Save size={16} />}
            {isSaving ? 'Guardando...' : 'Guardar Documento'}
          </button>
        </div>
      </div>

      {/* WORKSPACE: Split View */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: Contexto */}
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Apuntes Originales</h2>
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed border border-slate-100">
              {petition.originalText}
            </div>
          </div>

          {/* Panel de Control IA */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm flex flex-col">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-2">
              <BrainCircuit size={18} />
              Asistente Jurídico
            </h2>
            <p className="text-xs text-indigo-600/80 mb-5">
              Genera un documento estructurado basado en la Constitución (Art. 23) y la Ley 1755.
            </p>

            {/* NUEVO: Selector de Rol para la Firma */}
            <div className="mb-5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 mb-2 block">
                ¿Quién firmará el documento?
              </label>
              <select 
                className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2.5 text-sm font-medium text-indigo-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={senderRole}
                onChange={(e) => setSenderRole(e.target.value as any)}
                disabled={isGenerating}
              >
                <option value="CIUDADANO">El Ciudadano (Apoyo legal)</option>
                <option value="CONGRESISTA">El Congresista (Control Político)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="mt-auto w-full flex items-center justify-center gap-2 rounded-lg bg-[#1B2541] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-900 disabled:opacity-70"
            >
              {isGenerating ? (
                <BrainCircuit className="animate-pulse" size={18} />
              ) : (
                <CheckCircle size={18} />
              )}
              {isGenerating ? 'Redactando...' : draftContent ? 'Regenerar Documento' : 'Generar Petición'}
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA: El Documento (Hoja A4) */}
        <div className="flex-1 rounded-xl bg-slate-100 p-6 overflow-y-auto border border-slate-200 shadow-inner flex justify-center">
          
          {draftContent || isGenerating ? (
            <textarea
              className={`w-full max-w-3xl flex-1 resize-none bg-white p-12 shadow-md outline-none transition-all duration-500 focus:ring-2 focus:ring-blue-200 ${
                isGenerating ? 'animate-pulse text-slate-300' : 'text-slate-800'
              }`}
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "1.05rem",
                lineHeight: "1.6",
                minHeight: "100%",
              }}
              value={isGenerating ? "La inteligencia artificial está redactando el documento. Por favor, espera unos segundos..." : draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              disabled={isGenerating}
            />
          ) : (
            <div className="flex w-full max-w-3xl flex-col items-center justify-center bg-white p-12 shadow-sm border border-slate-200 border-dashed text-slate-400">
              <FileText size={48} className="mb-4 opacity-50" />
              <p className="font-medium text-lg text-slate-500">Documento en blanco</p>
              <p className="text-sm">Presiona "Generar Petición" para que la IA redacte el borrador.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}