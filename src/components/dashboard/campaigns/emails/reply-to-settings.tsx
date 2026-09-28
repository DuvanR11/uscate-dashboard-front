'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Reply } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EmailSettings {
  senderName: string | null;
  senderEmail: string | null;
  replyToEmail: string | null;
}

function errorMessage(error: unknown): string | undefined {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message[0] : message;
}

// Fase B (2026-09-28): los correos salen desde el remitente técnico de la
// plataforma, pero las respuestas de los ciudadanos llegan al correo que la
// campaña configure aquí (Reply-To).
export function ReplyToSettings() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<EmailSettings>('/campaigns/email/settings')
      .then(({ data }) => {
        setSettings(data);
        setValue(data.replyToEmail ?? '');
      })
      .catch(() => setSettings(null));
  }, []);

  if (!settings) return null;

  const dirty = value.trim().toLowerCase() !== (settings.replyToEmail ?? '');

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put<EmailSettings>('/campaigns/email/settings', {
        replyToEmail: value.trim() || null,
      });
      setSettings(data);
      setValue(data.replyToEmail ?? '');
      toast.success(data.replyToEmail ? 'Las respuestas llegarán a ese correo' : 'Correo de respuesta eliminado');
    } catch (error) {
      toast.error('No se pudo guardar', { description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100 shadow-sm space-y-2">
      <Label htmlFor="reply-to" className="flex items-center gap-2 text-sm font-bold text-primary">
        <Reply className="h-4 w-4 text-secondary" /> ¿A dónde llegan las respuestas?
      </Label>
      <div className="flex gap-2">
        <Input
          id="reply-to"
          type="email"
          placeholder="equipo@tucampana.co"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Tus correos se envían como «{settings.senderName ?? 'tu campaña'}»
        {settings.senderEmail ? ` desde ${settings.senderEmail}` : ''}.{' '}
        {settings.replyToEmail
          ? `Cuando alguien responda, le llegará a ${settings.replyToEmail}.`
          : 'Sin correo de respuesta, las respuestas se pierden.'}
      </p>
    </div>
  );
}
