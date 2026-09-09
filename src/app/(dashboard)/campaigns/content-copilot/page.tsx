'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2, Copy, History, Wand2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateContent,
  listContentGenerationHistory,
  extractErrorMessage,
  type ContentGeneration,
  type ContentGenerationType,
  type ContentGenerationTone,
} from '@/lib/api/content-copilot';

/**
 * `/campaigns/content-copilot` — genera texto real para difusiones
 * (SMS/Email/WhatsApp), redes sociales y comunicados/discursos con IA.
 * Página independiente (no botones inline en los compositores existentes
 * por ahora) — cada generación queda en el historial de la organización.
 */
const TYPE_LABEL: Record<ContentGenerationType, string> = {
  SMS: 'SMS',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  TWITTER: 'Twitter / X',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  COMUNICADO_PRENSA: 'Comunicado de prensa',
  DISCURSO: 'Discurso',
};

const TONE_LABEL: Record<ContentGenerationTone, string> = {
  CERCANO: 'Cercano',
  FORMAL: 'Formal',
  URGENTE: 'Urgente',
  INSPIRADOR: 'Inspirador',
  INFORMATIVO: 'Informativo',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

async function copyToClipboard(variant: { subject?: string; body: string }) {
  const text = variant.subject ? `${variant.subject}\n\n${variant.body}` : variant.body;
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  } catch {
    toast.error('No se pudo copiar — selecciona el texto manualmente');
  }
}

export default function ContentCopilotPage() {
  const [form, setForm] = useState({
    contentType: 'WHATSAPP' as ContentGenerationType,
    tone: 'CERCANO' as ContentGenerationTone,
    topic: '',
    keyPoints: '',
    callToAction: '',
    audience: '',
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ContentGeneration | null>(null);
  const [history, setHistory] = useState<ContentGeneration[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await listContentGenerationHistory();
      setHistory(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleGenerate = async () => {
    if (!form.topic.trim()) {
      toast.error('Escribe el tema central del contenido.');
      return;
    }
    setGenerating(true);
    try {
      const generation = await generateContent({
        contentType: form.contentType,
        tone: form.tone,
        topic: form.topic.trim(),
        keyPoints: form.keyPoints.trim() || undefined,
        callToAction: form.callToAction.trim() || undefined,
        audience: form.audience.trim() || undefined,
      });
      setResult(generation);
      loadHistory();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo generar el contenido — intenta de nuevo');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Copiloto de Contenido IA</h1>
          <p className="text-slate-500 text-sm">
            Genera borradores de difusiones, redes sociales y comunicados — siempre revísalos antes de publicar.
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de contenido</Label>
              <Select
                value={form.contentType}
                onValueChange={(v) => setForm((f) => ({ ...f, contentType: v as ContentGenerationType }))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL) as ContentGenerationType[]).map((v) => (
                    <SelectItem key={v} value={v}>{TYPE_LABEL[v]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tono</Label>
              <Select
                value={form.tone}
                onValueChange={(v) => setForm((f) => ({ ...f, tone: v as ContentGenerationTone }))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TONE_LABEL) as ContentGenerationTone[]).map((v) => (
                    <SelectItem key={v} value={v}>{TONE_LABEL[v]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tema central</Label>
            <Textarea
              rows={2}
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="Ej: Jornada de salud gratuita este sábado en el barrio X"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Puntos clave (opcional)</Label>
              <Textarea
                rows={2}
                value={form.keyPoints}
                onChange={(e) => setForm((f) => ({ ...f, keyPoints: e.target.value }))}
                placeholder="Ej: hora, lugar, requisitos para asistir"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Llamado a la acción (opcional)</Label>
              <Input
                value={form.callToAction}
                onChange={(e) => setForm((f) => ({ ...f, callToAction: e.target.value }))}
                placeholder='Ej: "Inscríbete en el link de la bio"'
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Audiencia (opcional)</Label>
            <Input
              value={form.audience}
              onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
              placeholder="Ej: adultos mayores de la localidad de Suba"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generando...</>
              ) : (
                <><Wand2 className="mr-1.5 h-4 w-4" /> Generar</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Variantes generadas — {TYPE_LABEL[result.contentType]}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.variants.map((variant, i) => (
              <Card key={i} className="border-0 shadow-md ring-1 ring-slate-100">
                <CardContent className="p-4 space-y-3 flex flex-col h-full">
                  <div className="flex-1 space-y-2">
                    {variant.subject && <p className="text-sm font-bold">{variant.subject}</p>}
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{variant.body}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(variant)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial reciente</p>
          </div>
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">Sin generaciones todavía.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <details key={item.id} className="rounded-lg border border-slate-100 p-3">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0">{TYPE_LABEL[item.contentType]}</Badge>
                      <span className="text-sm truncate">{item.topic}</span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {item.createdByUser?.fullName ?? ''} · {formatDate(item.createdAt)}
                    </span>
                  </summary>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {item.variants.map((variant, i) => (
                      <div key={i} className="rounded-md bg-slate-50 p-3 space-y-2">
                        {variant.subject && <p className="text-xs font-bold">{variant.subject}</p>}
                        <p className="text-xs text-slate-600 whitespace-pre-wrap">{variant.body}</p>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(variant)}>
                          <Copy className="mr-1.5 h-3 w-3" /> Copiar
                        </Button>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
