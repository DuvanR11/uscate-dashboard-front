import { BookOpen } from 'lucide-react';

export function LegislativeSheet({ sheet }: { sheet?: any }) {
  if (!sheet) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Cabecera Empty State */}
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
           <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
             <BookOpen className="w-5 h-5" />
           </div>
           <h2 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
             Ficha Legislativa
           </h2>
        </div>
        <div className="p-6">
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
            <p className="text-slate-500 font-medium">No hay ficha generada.</p>
          </div>
        </div>
      </div>
    );
  }

  const items = [
    ['Resumen ejecutivo', sheet.executiveSummary],
    ['Objeto', sheet.objective],
    ['Problema', sheet.problem],
    ['Cambios propuestos', sheet.proposedChanges],
    ['Impacto fiscal', sheet.fiscalImpact],
    ['Impacto jurídico', sheet.legalImpact],
    ['Impacto social', sheet.socialImpact],
    ['Riesgos', sheet.risks],
    ['Actores afectados', sheet.affectedActors],
    ['Argumentos a favor', sheet.argumentsFor],
    ['Argumentos en contra', sheet.argumentsAgainst],
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
             <BookOpen className="w-5 h-5" />
           </div>
           <h2 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
             Ficha Legislativa Completa
           </h2>
        </div>
        
        {/* Badge de Confianza */}
        {sheet.confidence !== undefined && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Confianza: {(sheet.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Contenido (Textos de la IA) */}
      <div className="p-6 space-y-6">
        {items.map(([title, value], index) => (
          <section 
            key={title as string} 
            // Agregamos una línea divisoria a todos menos al último
            className={index !== items.length - 1 ? "border-b border-slate-100 pb-6" : ""}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              {title}
            </h3>
            <p className="text-sm md:text-base leading-relaxed text-[#1B2541]">
              {value || <span className="text-slate-400 italic font-medium">No identificado</span>}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}