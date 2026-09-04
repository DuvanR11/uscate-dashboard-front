'use client';

import { DocumentVersion } from '@/types/document';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { getDownloadUrl } from '@/lib/api/documents';

interface VersionHistoryProps {
  versions: DocumentVersion[];
  currentVersionId: string | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VersionHistory({ versions, currentVersionId }: VersionHistoryProps) {
  const handleDownload = async (documentId: string, versionId: string, fileName: string) => {
    try {
      const { url } = await getDownloadUrl(documentId, versionId);
      window.open(url, '_blank');
    } catch (error: any) {
      toast.error('Error al descargar', {
        description: error?.response?.data?.message || `No se pudo descargar "${fileName}".`,
      });
    }
  };

  if (versions.length === 0) {
    return <p className="text-sm text-slate-500 italic">Sin versiones todavía.</p>;
  }

  return (
    <div className="space-y-2">
      {versions.map((version) => (
        <div
          key={version.id}
          className="flex items-center justify-between gap-4 rounded-lg border p-3 bg-white"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">
              v{version.versionNumber}
            </span>

            {version.id === currentVersionId && (
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-700 border-emerald-300"
              >
                Actual
              </Badge>
            )}

            <div>
              <p className="text-sm font-medium text-slate-700">
                {version.uploadedBy?.fullName || 'Usuario desconocido'}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(version.createdAt).toLocaleString('es-CO')} ·{' '}
                {formatSize(version.sizeBytes)}
                {version.changeNote ? ` · ${version.changeNote}` : ''}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(version.documentId, version.id, version.originalFileName)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
