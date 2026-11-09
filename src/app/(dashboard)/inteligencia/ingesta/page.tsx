'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Type, UploadCloud, Loader2, Database, Radio, Tv } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { usePermission } from '@/hooks/use-permission';
import { keywordsApi, MonitoringKeyword } from '@/lib/api/monitoring';
import { extractErrorMessage } from '@/lib/api-error';
import { mediaCatalogApi } from '@/lib/api/media-catalog';
import { localDateTimeInput } from '@/lib/dates';

type BroadcastMedium = 'RADIO' | 'TV';

export default function IngestaManualPage() {
  // Cargar noticias pide escritura en Monitoreo; quien solo lee (Jurídica)
  // veía los botones y el servidor le rechazaba la carga.
  const canIngest = usePermission('MONITOREO_PREDICTIVO', 'canWrite');
  const [activeTab, setActiveTab] = useState<'TEXTO' | 'PDF' | 'RADIO_TV'>('TEXTO');
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

  // Fase 5 punto 3 (2026-11-09): lo que se dijo en la radio o la televisión.
  const [medium, setMedium] = useState<BroadcastMedium>('RADIO');
  const [outlet, setOutlet] = useState('');
  const [program, setProgram] = useState('');
  const [airedAt, setAiredAt] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [clipUrl, setClipUrl] = useState('');
  // Emisoras y canales del catálogo, solo como sugerencia.
  const [catalogOutlets, setCatalogOutlets] = useState<{ name: string; medium: BroadcastMedium }[]>([]);

  useEffect(() => {
    mediaCatalogApi
      .list()
      .then((catalog) => {
        const seen = new Set<string>();
        const names: { name: string; medium: BroadcastMedium }[] = [];
        for (const entry of catalog.entries) {
          if (entry.medium !== 'RADIO' && entry.medium !== 'TV') continue;
          const key = `${entry.medium}:${entry.name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          names.push({ name: entry.name, medium: entry.medium });
        }
        setCatalogOutlets(names);
      })
      .catch(() => setCatalogOutlets([]));
  }, []);

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
      toast.success("¡Noticia agregada! Ya está en Hoy.");
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
      toast.success("¡Documento procesado! Ya está en Hoy.");
      setPdfTitle('');
      setSelectedFile(null);
      setPdfSource('');
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Error al procesar el documento PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastSubmit = async () => {
    if (!keywordId) return toast.error('Selecciona la etiqueta a la que pertenece esta nota.');
    if (outlet.trim().length < 2) return toast.error(medium === 'RADIO' ? 'Escribe la emisora.' : 'Escribe el canal.');
    if (!airedAt) return toast.error('Indica cuándo salió al aire.');
    const aired = new Date(airedAt);
    if (Number.isNaN(aired.getTime())) return toast.error('La fecha y hora no son válidas.');
    if (broadcastTitle.trim().length < 3) return toast.error('El título es obligatorio.');
    if (broadcastText.trim().length < 10) return toast.error('Escribe lo que se dijo (al menos 10 caracteres).');
    if (clipUrl.trim() && !/^https:\/\//i.test(clipUrl.trim()))
      return toast.error('El enlace al clip debe empezar por https://');
    setLoading(true);
    try {
      await api.post('/monitoring/manual-ingest/broadcast', {
        keywordId,
        medium,
        outlet: outlet.trim(),
        program: program.trim() || undefined,
        airedAt: aired.toISOString(),
        title: broadcastTitle.trim(),
        text: broadcastText.trim(),
        clipUrl: clipUrl.trim() || undefined,
      });
      toast.success('¡Nota agregada! Ya está en Hoy.');
      setProgram('');
      setAiredAt('');
      setBroadcastTitle('');
      setBroadcastText('');
      setClipUrl('');
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al guardar la nota.');
    } finally {
      setLoading(false);
    }
  };

  const outletSuggestions = catalogOutlets.filter((entry) => entry.medium === medium);
  const now = localDateTimeInput();
  const monthAgo = localDateTimeInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen flex flex-col items-center">

      {/* HEADER */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Database className="text-secondary" /> Agregar una noticia
          </h1>
          <p className="text-slate-500 text-sm mt-1">Pega el texto o sube el documento de una noticia, un panfleto o una denuncia que no llegó sola, o anota lo que se dijo en la radio o la televisión: la IA la clasifica como las demás.</p>
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
          <button
            onClick={() => setActiveTab('RADIO_TV')}
            className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'RADIO_TV' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <Radio size={16} className={activeTab === 'RADIO_TV' ? 'text-secondary' : ''} />
            Radio o TV
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
                    No hay etiquetas activas. Créalas en Monitoreo de medios › Configuración.
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
                {loading ? <><Loader2 className="animate-spin mr-2" /> Procesando con IA...</> : 'Analizar y guardar'}
              </Button>
            </div>
          )}

          {/* VISTA: ARCHIVO PDF */}
          {activeTab === 'PDF' && (
            <div className="space-y-6 animate-in fade-in duration-300">

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <UploadCloud size={48} className="text-slate-400 mb-4" />
                <h3 className="font-bold text-slate-700 mb-1">Sube el reporte en PDF</h3>
                <p className="text-xs text-slate-500 mb-6">Se leen hasta 30 páginas y los primeros 15.000 caracteres.</p>

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

          {/* VISTA: RADIO O TELEVISIÓN */}
          {activeTab === 'RADIO_TV' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <p className="text-sm text-slate-500">
                Anota lo que se dijo en un programa de radio o de televisión. Llega a Hoy con la hora en que salió al aire y la
                etiqueta «Radio» o «TV». Solo se cargan notas de los últimos 30 días.
              </p>
              <div role="radiogroup" aria-label="Medio" className="grid grid-cols-2 gap-2">
                {(['RADIO', 'TV'] as const).map((option) => {
                  const Icon = option === 'RADIO' ? Radio : Tv;
                  const active = medium === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMedium(option)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                        active ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {option === 'RADIO' ? 'Radio' : 'Televisión'}
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="ing-7" className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    {medium === 'RADIO' ? 'Emisora *' : 'Canal *'}
                  </label>
                  <Input id="ing-7"
                    list="ing-7-sugerencias"
                    placeholder={medium === 'RADIO' ? 'Ej: Caracol Radio' : 'Ej: Noticias Caracol'}
                    value={outlet}
                    maxLength={120}
                    onChange={(e) => setOutlet(e.target.value)}
                    className="bg-slate-50 focus-visible:ring-primary"
                  />
                  <datalist id="ing-7-sugerencias">
                    {outletSuggestions.map((entry) => (
                      <option key={entry.name} value={entry.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="ing-8" className="text-xs font-bold text-slate-500 uppercase block mb-1">Programa (Opcional)</label>
                  <Input id="ing-8"
                    placeholder="Ej: 6AM Hoy por Hoy"
                    value={program}
                    maxLength={120}
                    onChange={(e) => setProgram(e.target.value)}
                    className="bg-slate-50 focus-visible:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ing-9" className="text-xs font-bold text-slate-500 uppercase block mb-1">Salió al aire *</label>
                <Input id="ing-9"
                  type="datetime-local"
                  value={airedAt}
                  min={monthAgo}
                  max={now}
                  onChange={(e) => setAiredAt(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="ing-10" className="text-xs font-bold text-slate-500 uppercase block mb-1">Título *</label>
                <Input id="ing-10"
                  placeholder="Ej: El concejal Pérez habló del contrato del acueducto"
                  value={broadcastTitle}
                  maxLength={500}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="ing-11" className="text-xs font-bold text-slate-500 uppercase block mb-1">Lo que se dijo *</label>
                <Textarea id="ing-11"
                  placeholder="Escribe la transcripción o un resumen fiel: quién habló, qué dijo y de quién. La IA saca el tono y la urgencia."
                  className="min-h-[160px] resize-none focus-visible:ring-primary text-base leading-relaxed bg-slate-50"
                  value={broadcastText}
                  maxLength={15000}
                  onChange={(e) => setBroadcastText(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ing-12" className="text-xs font-bold text-slate-500 uppercase block mb-1">Enlace al clip (Opcional)</label>
                <Input id="ing-12"
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={clipUrl}
                  maxLength={2000}
                  onChange={(e) => setClipUrl(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-primary"
                />
              </div>
              <Button
                onClick={handleBroadcastSubmit}
                disabled={loading || !canIngest}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-md mt-4"
              >
                {loading ? <><Loader2 className="animate-spin mr-2" /> Procesando con IA...</> : 'Analizar y guardar'}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
