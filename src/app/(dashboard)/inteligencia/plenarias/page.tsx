'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrainCircuit, Copy, Loader2, Mic, Save, Map, Send, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// Creamos un subcomponente para el formulario que maneje los parámetros de la URL
function PlenaryFormContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [contextCount, setContextCount] = useState(0);
  
  const [formData, setFormData] = useState({
    TOPIC: '',
    STANCE: '',
    TONE: 'INSTITUCIONAL'
  });

  // --- Estados para Movilización Electoral (Email) ---
  const [mobilizeLocation, setMobilizeLocation] = useState('');
  const [mobilizeSubject, setMobilizeSubject] = useState('Importante: Defendiendo nuestra zona en plenaria');
  const [mobilizeMessage, setMobilizeMessage] = useState('Hola {{nombre}},<br/><br/>En este momento desde el concejo estamos exigiendo soluciones urgentes para la inseguridad en tu zona.<br/><br/><strong>¡Apóyanos compartiendo nuestro mensaje!</strong>');
  const [isMobilizing, setIsMobilizing] = useState(false);

  // --- Atrapa la noticia del mapa y llena el formulario ---
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const stanceParam = searchParams.get('stance');

    if (topicParam || stanceParam) {
      setFormData(prev => ({
        ...prev,
        TOPIC: topicParam || prev.TOPIC,
        STANCE: stanceParam || prev.STANCE
      }));
      if (stanceParam) {
        toast.info("Noticia cargada. Completa tu postura y haz clic en Generar.");
      }
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!formData.TOPIC || !formData.STANCE) {
      return toast.error("Por favor selecciona un tema y define tu postura.");
    }

    setLoading(true);
    setDraft(''); 
    
    try {
      const response = await api.post('/intelligence/plenary/generate', formData);
      setDraft(response.data.draft);
      setContextCount(response.data.contextUsed);
      toast.success("Borrador generado con éxito");
    } catch (error) {
      toast.error("Error al conectar con la IA predictiva.");
    } finally {
      setLoading(false);
    }
  };

  const handleMobilize = async () => {
    if (!mobilizeLocation) return toast.error("Por favor ingresa la localidad o municipio a movilizar.");
    if (!mobilizeSubject) return toast.error("Por favor ingresa un asunto para el correo.");
    
    setIsMobilizing(true);
    try {
      const res = await api.post('/intelligence/mobilize', {
        location: mobilizeLocation,
        subject: mobilizeSubject,
        message: mobilizeMessage
      });
      
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.info(res.data.message);
      }
    } catch (error) {
      toast.error("Error al conectar con la base de datos electoral.");
    } finally {
      setIsMobilizing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft);
    toast.success("Copiado al portapapeles");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* COLUMNA IZQUIERDA: CONFIGURACIÓN */}
      <div className="lg:col-span-4 space-y-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-[#1B2541] text-white py-3 rounded-t-lg">
            <CardTitle className="text-sm flex items-center gap-2">
              <BrainCircuit size={16} className="text-[#FFC400]"/> 
              Parámetros del Discurso
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Categoría</label>
              <Select value={formData.TOPIC} onValueChange={(val) => setFormData({...formData, TOPIC: val})}>
                <SelectTrigger className="w-full bg-slate-50">
                  <SelectValue placeholder="Selecciona un tema..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEGURIDAD">Seguridad Ciudadana</SelectItem>
                  <SelectItem value="SALUD_MENTAL">Salud Mental</SelectItem>
                  <SelectItem value="PROPIEDAD_HORIZONTAL">Propiedad Horizontal</SelectItem>
                  <SelectItem value="POBREZA">Pobreza y Desigualdad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Postura / Enfoque</label>
              <Textarea 
                placeholder="Ej: Necesitamos aumentar el pie de fuerza en Soacha..."
                className="bg-slate-50 resize-none h-40 focus-visible:ring-[#1B2541]"
                value={formData.STANCE}
                onChange={(e) => setFormData({...formData, STANCE: e.target.value})}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tono del Discurso</label>
              <Select value={formData.TONE} onValueChange={(val) => setFormData({...formData, TONE: val})}>
                <SelectTrigger className="w-full bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTITUCIONAL">Institucional y Formal</SelectItem>
                  <SelectItem value="PERSUASIVO">Persuasivo y Enérgico</SelectItem>
                  <SelectItem value="CRITICO">Crítico y de Denuncia</SelectItem>
                  <SelectItem value="CONCILIADOR">Conciliador y Propositivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={loading}
              className="w-full bg-[#1B2541] hover:bg-slate-800 text-white font-bold h-12 shadow-md"
            >
              {loading ? <><Loader2 className="animate-spin mr-2" /> Redactando base...</> : 'Generar Borrador con IA'}
            </Button>

          </CardContent>
        </Card>
      </div>

      {/* COLUMNA DERECHA: RESULTADO Y MOVILIZACIÓN */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* TARJETA 1: EL REDACTOR */}
        <Card className="h-full shadow-sm border-slate-200 flex flex-col min-h-[600px]">
          <CardHeader className="border-b py-3 flex flex-row justify-between items-center bg-white rounded-t-lg">
            <div>
              <CardTitle className="text-lg text-[#1B2541]">Borrador Generado</CardTitle>
              {draft && (
                <p className="text-[10px] font-bold text-green-600 mt-1 uppercase tracking-wider">
                  Contexto inyectado: {contextCount} eventos reales de Bogotá/Cundinamarca
                </p>
              )}
            </div>
            {draft && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="text-slate-600 border-slate-300 hover:bg-slate-100">
                  <Copy size={14} className="mr-2" /> Copiar Todo
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 relative bg-slate-100">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <BrainCircuit size={54} className="animate-pulse text-[#FFC400] mb-4" />
                <p className="font-bold text-slate-600 animate-pulse">Analizando noticias de las últimas 24h...</p>
                <p className="text-xs mt-2">Redactando exposición de motivos</p>
              </div>
            ) : draft ? (
              <div className="p-4 h-full">
                <Textarea 
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full h-full min-h-[500px] p-6 border border-slate-200 shadow-sm rounded-lg focus-visible:ring-1 focus-visible:ring-[#1B2541] resize-none bg-white leading-relaxed text-slate-800 text-base"
                  style={{ fontFamily: 'Georgia, serif' }} 
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm text-center px-10">
                Llena los parámetros a la izquierda. <br/> La IA leerá las últimas noticias para fundamentar tu discurso.
              </div>
            )}
          </CardContent>
        </Card>

        {/* TARJETA 2: MÓDULO DE MOVILIZACIÓN ELECTORAL POR EMAIL */}
        {draft && (
          <Card className="shadow-sm border-0 border-t-4 border-t-blue-600 bg-blue-50/50 animate-in slide-in-from-bottom-4">
            <CardHeader className="pb-3 border-b border-blue-100">
              <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                <Mail className="text-blue-600" /> Movilizar Bases Electorales (Email)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                <div className="md:col-span-4 space-y-4">
                  <p className="text-sm text-slate-600">
                    Aprovecha esta plenaria para conectar con tus líderes. El sistema cruzará esta ubicación con tu CRM y enviará un <strong>Email Masivo</strong> en tiempo real.
                  </p>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                      <MapPin size={12}/> Zona a impactar (Municipio/Localidad)
                    </label>
                    <Input 
                      placeholder="Ej: Bosa, Soacha, Neiva..." 
                      value={mobilizeLocation}
                      onChange={(e) => setMobilizeLocation(e.target.value)}
                      className="bg-white border-blue-200 focus-visible:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="md:col-span-8 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                      Asunto del Correo - Usa {'{{nombre}}'} para personalizar
                    </label>
                    <Input 
                      placeholder="Asunto llamativo..."
                      value={mobilizeSubject}
                      onChange={(e) => setMobilizeSubject(e.target.value)}
                      className="bg-white border-blue-200 focus-visible:ring-blue-600 mb-4"
                    />

                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                      Cuerpo del Mensaje (Soporta etiquetas HTML básicas como &lt;br&gt; o &lt;b&gt;)
                    </label>
                    <Textarea 
                      value={mobilizeMessage}
                      onChange={(e) => setMobilizeMessage(e.target.value)}
                      className="bg-white resize-y min-h-[120px] border-blue-200 focus-visible:ring-blue-600"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleMobilize} 
                    disabled={isMobilizing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold"
                  >
                    {isMobilizing ? <><Loader2 className="animate-spin mr-2" /> Extrayendo correos y encolando...</> : <><Send size={16} className="mr-2" /> Disparar Emails a Líderes Locales</>}
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

// Componente principal envuelto en Suspense por requerimientos de Next.js
export default function PlenaryPage() {
  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* HEADER Y NAVEGACIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <Mic className="text-[#FFC400]" /> Redactor de Plenarias IA
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Exposiciones de motivos fundamentadas en eventos reales recientes.
          </p>
        </div>
        
        <Link href="/inteligencia">
          <Button variant="outline" className="border-[#1B2541] text-[#1B2541] hover:bg-slate-200">
            <Map size={16} className="mr-2" /> Volver al Mapa Predictivo
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#1B2541]"/></div>}>
        <PlenaryFormContent />
      </Suspense>
    </div>
  );
}