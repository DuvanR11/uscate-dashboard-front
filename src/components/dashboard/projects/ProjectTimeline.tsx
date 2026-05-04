import { Milestone } from 'lucide-react';

const stages = [
  'Radicado',
  'Primer debate',
  'Segundo debate',
  'Conciliación',
  'Sanción presidencial',
];

export function ProjectTimeline({ currentStage }: { currentStage?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
         <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
           <Milestone className="w-5 h-5" />
         </div>
         <h2 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
           Trazabilidad Legislativa
         </h2>
      </div>

      {/* Línea de tiempo */}
      <div className="p-6">
        <div className="space-y-0">
          {stages.map((stage, index) => {
            const active = currentStage
              ?.toLowerCase()
              .includes(stage.toLowerCase());
              
            const isLast = index === stages.length - 1;

            return (
              <div key={stage} className="flex gap-4">
                {/* Columna del indicador (Punto y Línea) */}
                <div className="flex flex-col items-center">
                  <div
                    className={`h-4 w-4 shrink-0 rounded-full border-2 border-white shadow-sm z-10 transition-all duration-300 ${
                      active
                        ? 'bg-blue-600 ring-4 ring-blue-100 scale-110'
                        : 'bg-slate-200'
                    }`}
                  />
                  {/* Dibuja la línea de conexión solo si NO es el último elemento */}
                  {!isLast && (
                    <div className="w-[2px] grow bg-slate-100 my-1 min-h-[2rem]" />
                  )}
                </div>

                {/* Columna del Texto */}
                <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                  <span
                    className={`text-sm tracking-tight transition-colors ${
                      active 
                        ? 'font-bold text-[#1B2541]' 
                        : 'font-medium text-slate-400'
                    }`}
                  >
                    {stage}
                  </span>
                  
                  {active && (
                    <span className="ml-3 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      Actual
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}