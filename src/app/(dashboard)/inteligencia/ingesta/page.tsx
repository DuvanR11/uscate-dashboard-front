'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FileText, Type, UploadCloud, Loader2, ArrowLeft, Database } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function IngestaManualPage() {
  const [activeTab, setActiveTab] = useState<'TEXTO' | 'PDF'>('TEXTO');
  const [loading, setLoading] = useState(false);
  
  // Estados para Texto
  const [manualText, setManualText] = useState('');
  const [textSource, setTextSource] = useState('');

  // Estados para PDF
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfSource, setPdfSource] = useState('');

  const handleTextSubmit = async () => {
    if (!manualText.trim()) return toast.error("El texto no puede estar vacío");
    setLoading(true);

    try {
      const res = await api.post('/intelligence/manual/text', {
        text: manualText,
        sourceUrl: textSource
      });
      toast.success(`¡Evento catalogado como ${res.data.CATEGORY}! Visible en el mapa.`);
      setManualText('');
      setTextSource('');
    } catch (error) {
      toast.error("Error al procesar el texto con IA.");
    } finally {
      setLoading(false);
    }
  };

  const handlePdfSubmit = async () => {
    if (!selectedFile) return toast.error("Debes seleccionar un archivo PDF");
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (pdfSource) formData.append('sourceUrl', pdfSource);

    try {
      const res = await api.post('/intelligence/manual/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`¡Documento procesado! Evento catalogado como ${res.data.CATEGORY}.`);
      setSelectedFile(null);
      setPdfSource('');
    } catch (error) {
      toast.error("Error al procesar el documento PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen flex flex-col items-center">
      
      {/* HEADER */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <Database className="text-[#FFC400]" /> Ingesta de Inteligencia
          </h1>
          <p className="text-slate-500 text-sm mt-1">Carga manual de panfletos, denuncias y documentos clasificados.</p>
        </div>
        <Link href="/inteligencia">
          <Button variant="outline" className="border-[#1B2541] text-[#1B2541] hover:bg-slate-200 gap-2">
            <ArrowLeft size={16} /> Volver al Mapa
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-4xl shadow-lg border-0">
        
        {/* TABS DE NAVEGACIÓN */}
        <div className="flex w-full border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('TEXTO')}
            className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'TEXTO' ? 'bg-[#1B2541] text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <Type size={16} className={activeTab === 'TEXTO' ? 'text-[#FFC400]' : ''} />
            Ingreso por Texto
          </button>
          <button 
            onClick={() => setActiveTab('PDF')}
            className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'PDF' ? 'bg-[#1B2541] text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <FileText size={16} className={activeTab === 'PDF' ? 'text-[#FFC400]' : ''} />
            Subir Documento PDF
          </button>
        </div>

        <CardContent className="p-6 md:p-8">
          
          {/* VISTA: TEXTO MANUAL */}
          {activeTab === 'TEXTO' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Contenido de Inteligencia</label>
                <Textarea 
                  placeholder="Pega aquí el reporte, noticia o denuncia. La IA se encargará de clasificarlo, extraer entidades y ubicarlo en el mapa..."
                  className="min-h-[200px] resize-none focus-visible:ring-[#1B2541] text-base leading-relaxed bg-slate-50"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fuente (Opcional)</label>
                <Input 
                  placeholder="Ej: Denuncia anónima, Redes Sociales, Noticiero Local..."
                  value={textSource}
                  onChange={(e) => setTextSource(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-[#1B2541]"
                />
              </div>
              <Button 
                onClick={handleTextSubmit} 
                disabled={loading}
                className="w-full bg-[#1B2541] hover:bg-slate-800 text-white font-bold h-12 shadow-md mt-4"
              >
                {loading ? <><Loader2 className="animate-spin mr-2" /> Procesando con IA...</> : 'Analizar e Ingestar'}
              </Button>
            </div>
          )}

          {/* VISTA: ARCHIVO PDF */}
          {activeTab === 'PDF' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <UploadCloud size={48} className="text-slate-400 mb-4" />
                <h3 className="font-bold text-slate-700 mb-1">Sube el reporte en PDF</h3>
                <p className="text-xs text-slate-500 mb-6">Máximo recomendado: 10 páginas (Se leerán los primeros 15,000 caracteres).</p>
                
                <Input 
                  type="file" 
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="max-w-[300px] cursor-pointer file:bg-[#1B2541] file:text-white file:border-0 file:mr-4 file:py-1 file:px-4 file:rounded-md file:font-bold hover:file:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre o Referencia de Fuente (Opcional)</label>
                <Input 
                  placeholder="Ej: Reporte Defensoría del Pueblo Abril 2026"
                  value={pdfSource}
                  onChange={(e) => setPdfSource(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-[#1B2541]"
                />
              </div>

              <Button 
                onClick={handlePdfSubmit} 
                disabled={loading || !selectedFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-md mt-4"
              >
                {loading ? <><Loader2 className="animate-spin mr-2" /> Leyendo y Procesando...</> : 'Procesar Documento'}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}