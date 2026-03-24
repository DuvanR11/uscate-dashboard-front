'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrainCircuit, Copy, Loader2, Map, Mic, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import Link from 'next/link';

export default function PlenaryDraftPage() {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [contextCount, setContextCount] = useState(0);
  
  const [formData, setFormData] = useState({
    TOPIC: '',
    STANCE: '',
    TONE: 'INSTITUCIONAL'
  });

  const handleGenerate = async () => {
    if (!formData.TOPIC || !formData.STANCE) {
      return toast.error("Por favor selecciona un tema y define tu postura.");
    }

    setLoading(true);
    setDraft(''); // Limpiamos el borrador anterior
    
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft);
    toast.success("Copiado al portapapeles");
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
          <Mic className="text-[#FFC400]" /> Redactor de Plenarias IA
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Genera exposiciones de motivos fundamentadas en los últimos eventos del país.
        </p>
      </div>
      <div>
         <Link href="/inteligencia">
            <Button variant="outline" className="border-[#1B2541] text-[#1B2541] gap-2">
                <Map size={16} /> Ver Mapa Predictivo
            </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN (4 Columnas) */}
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
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tema Principal</label>
                <Select onValueChange={(val) => setFormData({...formData, TOPIC: val})}>
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
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tu Postura / Objetivo</label>
                <Textarea 
                  placeholder="Ej: Necesitamos aumentar el presupuesto policial en zonas comerciales de Bogota debido a la ola de atracos recientes..."
                  className="bg-slate-50 resize-none h-32"
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
                className="w-full bg-[#1B2541] hover:bg-slate-800 text-white font-bold h-12"
              >
                {loading ? <><Loader2 className="animate-spin mr-2" /> Redactando...</> : 'Generar Borrador'}
              </Button>

            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: RESULTADO (8 Columnas) */}
        <div className="lg:col-span-8">
          <Card className="h-full shadow-sm border-slate-200 flex flex-col min-h-[500px]">
            <CardHeader className="border-b py-3 flex flex-row justify-between items-center bg-white rounded-t-lg">
              <div>
                <CardTitle className="text-lg text-[#1B2541]">Borrador Generado</CardTitle>
                {draft && (
                  <p className="text-[10px] font-bold text-green-600 mt-1 uppercase tracking-wider">
                    Basado en {contextCount} eventos reales recientes
                  </p>
                )}
              </div>
              {draft && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="text-slate-600">
                    <Copy size={14} className="mr-2" /> Copiar
                  </Button>
                  <Button size="sm" className="bg-[#FFC400] text-[#1B2541] hover:bg-yellow-500 font-bold">
                    <Save size={14} className="mr-2" /> Guardar
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 relative bg-slate-50">
              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <BrainCircuit size={48} className="animate-pulse text-[#FFC400] mb-4" />
                  <p className="font-medium animate-pulse">Analizando contexto nacional y redactando...</p>
                </div>
              ) : draft ? (
                <Textarea 
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full h-full min-h-[500px] p-6 border-0 focus-visible:ring-0 resize-none bg-white leading-relaxed text-slate-700 text-base"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                  Llena los parámetros a la izquierda para generar tu exposición de motivos.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}