'use client';

// Plan hacia la versión estable, Fase 3b (2026-11-10): la evidencia de una
// tarea en terreno, desde el celular. Pide solo lo que pide la tarea: foto
// (con la cámara), documento, ubicación, enlace o nota. La foto y el documento
// quedan privados; la ubicación solo la ve quien revisa la tarea.
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Camera, FileUp, Loader2, LocateFixed, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/api-error';
import { EVIDENCE_LABEL } from '@/lib/team-tasks';
import { GamificationService } from '@/services/gamification.service';
import type { SocialTask } from '@/types/gamification';

interface Props {
  task: SocialTask | null;
  onClose: () => void;
  onSent: () => void;
}

interface Position {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

const MAX_BYTES = 10 * 1024 * 1024;

export function FieldEvidenceDialog({ task, onClose, onSent }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setFile(null);
    setLink('');
    setNote('');
    setPosition(null);
  }, [task?.id]);

  const evidence = task?.evidenceType ?? 'PHOTO';

  const locate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Este navegador no comparte la ubicación.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? 'No diste permiso para usar tu ubicación. Actívalo en el navegador e inténtalo de nuevo.'
            : 'No se pudo obtener tu ubicación. Inténtalo de nuevo al aire libre.',
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      toast.error('El archivo pesa más de 10 MB.');
      return;
    }
    setFile(picked);
  };

  const ready =
    (evidence === 'PHOTO' || evidence === 'DOCUMENT' ? !!file : true) &&
    (evidence === 'LINK' ? link.trim().length > 0 : true) &&
    (evidence === 'LOCATION' ? !!position : true) &&
    (evidence === 'NOTE' ? note.trim().length > 0 : true);

  const send = async () => {
    if (!task || !ready) return;
    setSending(true);
    try {
      await GamificationService.submitFieldEvidence(task.id, {
        file: file ?? undefined,
        link: evidence === 'LINK' ? link.trim() : undefined,
        note: note.trim() || undefined,
        ...(evidence === 'LOCATION' && position ? position : {}),
      });
      toast.success('Evidencia enviada. Queda pendiente de revisión.');
      onSent();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudo enviar la evidencia.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && !sending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task?.title}</DialogTitle>
          <DialogDescription>
            Esta tarea pide: {EVIDENCE_LABEL[evidence].toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {task?.description && (
            <p className="whitespace-pre-line rounded-lg bg-muted p-3 text-sm">{task.description}</p>
          )}

          {(evidence === 'PHOTO' || evidence === 'DOCUMENT') && (
            <div className="space-y-2">
              <Label htmlFor={`field-evidence-file-${task?.id}`}>
                {evidence === 'PHOTO' ? 'Foto' : 'Documento (PDF o imagen)'}
              </Label>
              <label
                htmlFor={`field-evidence-file-${task?.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 text-sm hover:bg-muted"
              >
                {evidence === 'PHOTO' ? <Camera className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}
                <span className="truncate">
                  {file ? file.name : evidence === 'PHOTO' ? 'Tomar o elegir una foto' : 'Elegir el documento'}
                </span>
              </label>
              <input
                id={`field-evidence-file-${task?.id}`}
                type="file"
                className="sr-only"
                accept={evidence === 'PHOTO' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/jpeg,image/png,image/webp'}
                // En el celular abre la cámara directamente.
                capture={evidence === 'PHOTO' ? 'environment' : undefined}
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>
          )}

          {evidence === 'LOCATION' && (
            <div className="space-y-2">
              <Button type="button" variant="outline" onClick={locate} disabled={locating} className="w-full">
                {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                {position ? 'Volver a tomar mi ubicación' : 'Compartir mi ubicación'}
              </Button>
              {position && (
                <p className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  Ubicación lista (precisión de unos {Math.round(position.accuracyMeters)} m).
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Se envía una sola vez con esta evidencia y solo la ve quien revisa la tarea. No se sigue tu ubicación.
              </p>
            </div>
          )}

          {evidence === 'LINK' && (
            <div className="space-y-2">
              <Label htmlFor={`field-evidence-link-${task?.id}`}>Enlace</Label>
              <Input
                id={`field-evidence-link-${task?.id}`}
                type="url"
                inputMode="url"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`field-evidence-note-${task?.id}`}>
              {evidence === 'NOTE' ? 'Nota' : 'Nota (opcional)'}
            </Label>
            <Textarea
              id={`field-evidence-note-${task?.id}`}
              rows={3}
              maxLength={1000}
              placeholder="Qué hiciste, dónde y cualquier detalle que sirva para revisarla."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={send} disabled={!ready || sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar evidencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
