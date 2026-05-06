import {
  ExternalLink,
  FileText,
  FileWarning,
  Scale,
  ShieldAlert,
} from 'lucide-react';

type DocumentItem = {
  id?: string;
  url: string;
  name?: string;
  docType?: string;
  score?: number;
  aiPriority?: number;
};

export function DocumentsList({
  documents = [],
}: {
  documents?: DocumentItem[];
}) {
  const sortedDocuments = [...documents].sort(
    (a, b) => (b.aiPriority || b.score || 0) - (a.aiPriority || a.score || 0),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div className="rounded-lg bg-[#1B2541]/10 p-2 text-[#1B2541]">
          <FileText className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-base font-bold uppercase tracking-wide text-[#1B2541]">
            Documentos Legislativos
          </h2>

          <p className="text-xs text-slate-500">
            Fuentes usadas para análisis jurídico y recomendación IA
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {sortedDocuments.length ? (
          <div className="space-y-4">
            {sortedDocuments.map((doc, index) => {
              const badge = getDocumentBadge(doc.docType);

              return (
                <a
                  key={`${doc.id || doc.url}-${index}`}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block rounded-2xl border border-slate-100 bg-slate-50 p-5 transition-all hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Tipo */}
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${badge.className}`}
                        >
                          {badge.label}
                        </span>

                        {typeof doc.score === 'number' && (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700">
                            Score IA {doc.score}
                          </span>
                        )}

                        {typeof doc.aiPriority === 'number' && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-800">
                            Prioridad {doc.aiPriority}
                          </span>
                        )}
                      </div>

                      {/* Nombre */}
                      <h3 className="line-clamp-2 text-sm font-bold leading-6 text-[#1B2541] transition-colors group-hover:text-blue-800 md:text-base">
                        {doc.name || 'Documento legislativo'}
                      </h3>

                      {/* URL */}
                      <p className="mt-2 line-clamp-1 text-xs text-slate-500">
                        {doc.url}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-700" />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
            <FileWarning className="mb-3 h-8 w-8 text-slate-400" />

            <p className="font-medium text-slate-600">
              No hay documentos legislativos asociados
            </p>

            <p className="mt-1 text-sm text-slate-500">
              El proyecto aún no tiene documentos procesados por IA
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getDocumentBadge(type?: string) {
  switch ((type || '').toUpperCase()) {
    case 'PONENCIA':
      return {
        label: 'Ponencia',
        icon: Scale,
        className:
          'bg-blue-100 text-blue-800 border border-blue-200',
      };

    case 'TEXTO_DEFINITIVO':
      return {
        label: 'Texto definitivo',
        icon: ShieldAlert,
        className:
          'bg-emerald-100 text-emerald-800 border border-emerald-200',
      };

    case 'PROYECTO_LEY':
      return {
        label: 'Proyecto de ley',
        icon: FileText,
        className:
          'bg-indigo-100 text-indigo-800 border border-indigo-200',
      };

    case 'GACETA':
      return {
        label: 'Gaceta',
        icon: FileText,
        className:
          'bg-amber-100 text-amber-800 border border-amber-200',
      };

    default:
      return {
        label: type || 'Documento',
        icon: FileText,
        className:
          'bg-slate-200 text-slate-700 border border-slate-300',
      };
  }
}