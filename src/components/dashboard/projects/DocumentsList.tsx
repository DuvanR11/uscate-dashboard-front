import { FileText, ExternalLink } from 'lucide-react';

export function DocumentsList({ documents = [] }: { documents?: any[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Cabecera del panel */}
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
         <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
           <FileText className="w-5 h-5" />
         </div>
         <h2 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
           Documentos Fuente
         </h2>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {documents.length ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4 transition-all hover:border-blue-200 hover:bg-blue-50"
              >
                <div>
                    <p className="text-sm font-bold text-[#1B2541] transition-colors group-hover:text-blue-800">
                      {doc.name || 'Documento legislativo'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Tipo: <span className="text-slate-700">{doc.docType || 'OTRO'}</span> &middot; Score: <span className="text-slate-700">{doc.score || 0}</span>
                    </p>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600" />
              </a>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
             <p className="text-slate-500 font-medium">Sin documentos asociados.</p>
          </div>
        )}
      </div>
    </div>
  );
}