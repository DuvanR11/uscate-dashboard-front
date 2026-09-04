'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UploadCloud, History } from 'lucide-react';
import { toast } from 'sonner';
import { addDocumentVersion } from '@/lib/api/documents';

interface NewVersionDialogProps {
  documentId: string;
  onUploaded: () => void;
}

export function NewVersionDialog({ documentId, onUploaded }: NewVersionDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Selecciona un archivo primero.');
      return;
    }

    setUploading(true);

    try {
      await addDocumentVersion(documentId, {
        file,
        changeNote: changeNote.trim() || undefined,
      });

      toast.success('Nueva versión subida — la anterior queda en el historial.');
      setFile(null);
      setChangeNote('');
      setOpen(false);
      onUploaded();
    } catch (error: any) {
      toast.error('Error al subir la versión', {
        description: error?.response?.data?.message || 'Intenta de nuevo.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setFile(null);
          setChangeNote('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 h-4 w-4" /> Subir nueva versión
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir nueva versión</DialogTitle>
          <DialogDescription>
            La versión anterior se conserva en el historial — no se sobrescribe nada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <UploadCloud className="h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-500">
              {file ? file.name : 'Haz clic para seleccionar un archivo'}
            </p>
            <Input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-note">Nota de cambio (opcional)</Label>
            <Textarea
              id="change-note"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              rows={2}
              placeholder="Ej: Corrige cláusula 4"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="bg-primary hover:bg-primary/90"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...
              </>
            ) : (
              'Subir versión'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
