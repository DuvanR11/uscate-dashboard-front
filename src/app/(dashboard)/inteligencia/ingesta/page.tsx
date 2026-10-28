'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Type, UploadCloud, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { usePermission } from '@/hooks/use-permission';
import { keywordsApi, MonitoringKeyword } from '@/lib/api/monitoring';
import { extractErrorMessage } from '@/lib/api-error';

export default function IngestaManualPage() {
  // Cargar noticias pide escritura en Monitoreo; quien solo lee (Jurídica)
  // veía los botones y el servidor le rechazaba la carga.
  const canIngest = usePermission('MONITOREO_PREDICTIVO', 'canWrite');
  const [activeTab, setActiveTab] = useState<'TEXTO' | 'PDF'>('TEXTO');
  const [loading, setLoading] = useState(false);

  // Fase C7 (migración IntelligenceEvent→Mention): la IA ya no decide sola
  // la categoría — el analista confirma explícitamente a qué etiqueta
  // administrada pertenece el contenido, obligatorio en ambas pestañas.
  const [keywords, setKeywords] = useState<MonitoringKeyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(true);
  const [keywordId, setKeywordId] = useState('');

  // Estados para Texto
  const [manualTitle, setManualTitle] = useState('');
  const [manualText, setManualText] = useState('');
  const [textSource, setTextSource] = useState('');

  // Estados para PDF
  const [pdfTitle, setPdfTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfSource, setPdfSource] = useState('');

  useEffect(() => {
    keywordsApi
      .list()
      .then(setKeywords)
      .catch(() => toast.error('No se pudieron cargar las etiquetas de monitoreo.'))
      .finally(() => setLoadingKeywords(false));
  }, []);

  const handleTextSubmit = async () => {
    if (!keywordId) return toast.error("Selecciona la etiqueta a la que pertenece este contenido.");
    if (!manualTitle.trim()) return toast.error("El título es obligatorio.");
    if (!manualText.trim()) return toast.error("El texto no puede estar vacío.");
    setLoading(true);

    try {
      await api.post('/monitoring/manual-ingest/text', {
        keywordId,
        title: manualTitle,
        text: manualText,
        sourceUrl: textSource || undefined,
      });
      toast.success("¡Mención creada! Visible en Monitoreo de Etiquetas.");
      setManualTitle('');
      setManualText('');
      setTextSource('');
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Error al procesar el texto.");
    } finally {
      setLoading(false);
    }
  };

  const handlePdfSubmit = async () => {
    if (!keywordId) return toast.error("Selecciona la etiqueta a la que pertenece este documento.");
    if (!selectedFile) return toast.error("Debes seleccionar un archivo PDF");
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('keywordId', keywordId);
    formData.append('title', pdfTitle || selectedFile.name);
    if (pdfSource) formData.append('sourceUrl', pdfSource);

    try {
      await api.post('/monitoring/manual-ingest/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("¡Documento procesado! Visible en Monitoreo de Etiquetas.");
      setPdfTitle('');
      setSelectedFile(null);
      setPdfSource('');
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Error al procesar el documento PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen flex flex-col items-center">

      {/* HEADER */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Database className="text-secondary" /> Ingesta de Inteligencia
          </h1>
          <p className="text-slate-500 text-sm mt-1">Carga manual de panfletos, denuncias y documentos clasificados.</p>
        </div>
      </div>

      <Card className="w-full max-w-4xl shadow-lg border-0">

        {/* TABS DE NAVEGACIÓN */}
        <div className="flex w-full border-b border-slate-200">
          <button
            onClick={() => setActiveTab('TEXTO')}
            className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'TEXTO' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <Type size={16} className={activeTab === 'TEXTO' ? 'text-secondary' : ''} />
            Ingreso por Texto
          </button>
          <button
            onClick={() => setActiveTab('PDF')}
            className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'PDF' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <FileText size={16} className={activeTab === 'PDF' ? 'text-secondary' : ''} />
            Subir Documento PDF
          </button>
        </div>

        <CardContent className="p-6 md:p-8 space-y-6">

          {/* ETIQUETA — compartida entre las dos pestañas, obligatoria */}
          <div>
            <label htmlFor="ing-1" className="text-xs font-bold text-slate-500 uppercase block mb-1">Etiqueta *</label>
            <Select value={keywordId} onValueChange={setKeywordId} disabled={loadingKeywords}>
              <SelectTrigger id="ing-1" className="w-full bg-slate-50">
                <SelectValue placeholder={loadingKeywords ? "Cargando etiquetas..." : "¿A qué etiqueta pertenece este contenido?"} />
              </SelectTrigger>
              <SelectContent>
                {keywords.length === 0 && !loadingKeywords ? (
                  <div className="px-2 py-3 text-xs text-slate-400 text-center">
                    No hay etiquetas activas. Créalas en Monitoreo de Etiquetas.
                  </div>
                ) : (
                  keywords.map((kw) => (
                    <SelectItem key={kw.id} value={kw.id}>{kw.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* VISTA: TEXTO MANUAL */}
          {activeTab === 'TEXTO' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <label htmlFor="ing-2" className="text-xs font-bold text-slate-500 uppercase block mb-1">Título *</label>
                <Input id="ing-2"
                  placeholder="Ej: Denuncia de irregularidad en contrato de obra pública"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="ing-3" className="text-xs font-bold text-slate-500 uppercase block mb-1">Contenido de Inteligencia *</label>
                <Textarea id="ing-3"
                  placeholder="Pega aquí el reporte, noticia o denuncia. La IA extraerá entidades, sentimiento y urgencia, y lo ubicará en el mapa..."
                  className="min-h-[200px] resize-none focus-visible:ring-primary text-base leading-relaxed bg-slate-50"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ing-4" className="text-xs font-bold text-slate-500 uppercase block mb-1">Fuente (Opcional)</label>
                <Input id="ing-4"
                  placeholder="Ej: Denuncia anónima, Redes Sociales, Noticiero Local..."
                  value={textSource}
                  onChange={(e) => setTextSource(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-primary"
                />
              </div>
              <Button
                onClick={handleTextSubmit}
                disabled={loading || !canIngest}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-md mt-4"
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
                  className="max-w-[300px] cursor-pointer file:bg-primary file:text-white file:border-0 file:mr-4 file:py-1 file:px-4 file:rounded-md file:font-bold hover:file:bg-slate-800"
                />
              </div>

              <div>
                <label htmlFor="ing-5" className="text-xs font-bold text-slate-500 uppercase block mb-1">Título *</label>
                <Input id="ing-5"
                  placeholder="Ej: Reporte Defensoría del Pueblo Abril 2026"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="ing-6" className="text-xs font-bold text-slate-500 uppercase block mb-1">Fuente (Opcional)</label>
                <Input id="ing-6"
                  placeholder="Ej: URL o referencia del documento original"
                  value={pdfSource}
                  onChange={(e) => setPdfSource(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-primary"
                />
              </div>

              <Button
                onClick={handlePdfSubmit}
                disabled={loading || !selectedFile || !canIngest}
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
