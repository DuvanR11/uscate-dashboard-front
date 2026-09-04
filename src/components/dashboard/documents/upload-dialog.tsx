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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UploadCloud, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createDocument } from '@/lib/api/documents';
import { DocumentFolderItem } from '@/types/document';

interface UploadDocumentDialogProps {
  folders: DocumentFolderItem[];
  defaultFolderId?: string;
  onUploaded: () => void;
}

export function UploadDocumentDialog({
  folders,
  defaultFolderId,
  onUploaded,
}: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string>(defaultFolderId || 'ROOT');
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setFile(null);
    setName('');
    setDescription('');
    setFolderId(defaultFolderId || 'ROOT');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    if (!name) setName(selected.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Selecciona un archivo primero.');
      return;
    }

    if (!name.trim()) {
      toast.error('El documento necesita un nombre.');
      return;
    }

    setUploading(true);

    try {
      await createDocument({
        file,
        name: name.trim(),
        description: description.trim() || undefined,
        folderId: folderId !== 'ROOT' ? folderId : undefined,
      });

      toast.success('Documento subido correctamente.');
      resetForm();
      setOpen(false);
      onUploaded();
    } catch (error: any) {
      toast.error('Error al subir el documento', {
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
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Subir archivo
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>
            PDF, Word, Excel o imágenes (JPG/PNG/WEBP). El archivo queda privado — solo lo
            ve quien tenga permiso sobre Gestión Documental.
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
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-name">Nombre</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Contrato de arrendamiento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-description">Descripción (opcional)</Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Carpeta</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Raíz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROOT">Raíz (sin carpeta)</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              'Subir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
