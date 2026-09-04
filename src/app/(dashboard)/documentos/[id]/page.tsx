'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ArrowLeft, Download, Eye, Trash2, RotateCcw, Save, Loader2 } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import {
  getDocument,
  updateDocument,
  deleteDocument,
  restoreDocument,
  getDocumentVersions,
  getDocumentFolders,
  getDownloadUrl,
  getPreviewUrl,
} from '@/lib/api/documents';
import { DocumentItem, DocumentVersion, DocumentFolderItem, PREVIEWABLE_EXTENSIONS } from '@/types/document';
import { NewVersionDialog } from '@/components/dashboard/documents/new-version-dialog';
import { VersionHistory } from '@/components/dashboard/documents/version-history';

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [folders, setFolders] = useState<DocumentFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('ROOT');

  const canWrite = usePermission('GESTION_DOCUMENTAL', 'canWrite');
  const canDelete = usePermission('GESTION_DOCUMENTAL', 'canDelete');

  const fetchAll = useCallback(async () => {
    setLoading(true);

    try {
      const [doc, versionsList, folderList] = await Promise.all([
        getDocument(id),
        getDocumentVersions(id),
        getDocumentFolders(),
      ]);

      setDocument(doc);
      setVersions(versionsList);
      setFolders(folderList);
      setName(doc.name);
      setDescription(doc.description || '');
      setFolderId(doc.folderId || 'ROOT');
    } catch (error: any) {
      toast.error('No se pudo cargar el documento', {
        description: error?.response?.data?.message,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async () => {
    if (!document) return;

    setSaving(true);

    try {
      const updated = await updateDocument(document.id, {
        name,
        description: description || undefined,
        folderId: folderId !== 'ROOT' ? folderId : null,
      });

      setDocument(updated);
      toast.success('Documento actualizado.');
    } catch (error: any) {
      toast.error('Error al guardar', { description: error?.response?.data?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    if (!confirm(`¿Eliminar "${document.name}"? Podrás restaurarlo después.`)) return;

    try {
      const updated = await deleteDocument(document.id);
      setDocument(updated);
      toast.success('Documento eliminado.');
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error?.response?.data?.message });
    }
  };

  const handleRestore = async () => {
    if (!document) return;

    try {
      const updated = await restoreDocument(document.id);
      setDocument(updated);
      toast.success('Documento restaurado.');
    } catch (error: any) {
      toast.error('Error al restaurar', { description: error?.response?.data?.message });
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const { url } = await getDownloadUrl(document.id);
      window.open(url, '_blank');
    } catch (error: any) {
      toast.error('Error al descargar', { description: error?.response?.data?.message });
    }
  };

  const handlePreview = async () => {
    if (!document) return;

    try {
      const { url } = await getPreviewUrl(document.id);
      window.open(url, '_blank');
    } catch (error: any) {
      toast.error('No se pudo generar la vista previa', {
        description: error?.response?.data?.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-slate-500 animate-pulse">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!document) {
    return <div className="p-12 text-center text-slate-500">Documento no encontrado.</div>;
  }

  const canPreview = PREVIEWABLE_EXTENSIONS.includes(document.currentVersion?.extension || '');
  const isDeleted = document.status === 'DELETED';

  return (
    <div className="space-y-6">
      <Link
        href="/documentos"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a Gestión Documental
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-primary">
              {document.name}
            </h2>
            {isDeleted && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Eliminado
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Versión actual: v{document.currentVersionNumber} · Creado por{' '}
            {document.createdBy?.fullName} ·{' '}
            {new Date(document.createdAt).toLocaleDateString('es-CO')}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {canPreview && (
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" /> Vista previa
            </Button>
          )}

          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Descargar
          </Button>

          {canWrite && !isDeleted && (
            <NewVersionDialog documentId={document.id} onUploaded={fetchAll} />
          )}

          {canDelete && !isDeleted && (
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          )}

          {canDelete && isDeleted && (
            <Button
              variant="outline"
              className="text-emerald-700 hover:bg-emerald-50"
              onClick={handleRestore}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 rounded-lg border bg-white p-4">
          <h3 className="font-bold text-primary">Detalles</h3>

          <div className="space-y-2">
            <Label htmlFor="doc-name">Nombre</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canWrite || isDeleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-description">Descripción</Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={!canWrite || isDeleted}
            />
          </div>

          <div className="space-y-2">
            <Label>Carpeta</Label>
            <Select value={folderId} onValueChange={setFolderId} disabled={!canWrite || isDeleted}>
              <SelectTrigger className="max-w-xs">
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

          {canWrite && !isDeleted && (
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Guardar cambios
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-2 rounded-lg border bg-white p-4">
          <h3 className="font-bold text-primary">Metadata</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Tipo</dt>
              <dd className="font-medium text-slate-700 text-right">
                {document.currentVersion?.mimeType || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 shrink-0">Nombre original</dt>
              <dd
                className="font-medium text-slate-700 truncate max-w-[150px]"
                title={document.currentVersion?.originalFileName}
              >
                {document.currentVersion?.originalFileName || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Última modificación</dt>
              <dd className="font-medium text-slate-700">
                {new Date(document.updatedAt).toLocaleDateString('es-CO')}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div id="historial" className="rounded-lg border bg-white p-4 space-y-4">
        <h3 className="font-bold text-primary">Historial de versiones</h3>
        <VersionHistory versions={versions} currentVersionId={document.currentVersionId} />
      </div>
    </div>
  );
}
