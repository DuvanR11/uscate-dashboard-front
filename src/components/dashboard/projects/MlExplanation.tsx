import { Cpu } from 'lucide-react';

export function MlExplanation({ reasoning }: { reasoning?: string }) {
  if (!reasoning) return null;

  let parsed: any = null;

  try {
    parsed = JSON.parse(reasoning);
  } catch {
    // Estado de fallback: Si el JSON no se puede parsear, mostramos el texto plano
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
           <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
             <Cpu className="w-5 h-5" />
           </div>
           <h2 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
             Explicación de la IA
           </h2>
        </div>
        <div className="p-6">
          <p className="text-slate-700 leading-relaxed text-sm md:text-base">
            {reasoning}
          </p>
        </div>
      </div>
    );
  }

  const explanation = parsed.mlExplanation;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
         <div className="bg-[#1B2541]/10 p-2 rounded-lg text-[#1B2541]">
           <Cpu className="w-5 h-5" />
         </div>
         <h2 className="text-base font-bold text-[#1B2541] uppercase tracking-wide">
           Por qué el modelo decidió esto
         </h2>
      </div>

      <div className="p-6">
        <p className="text-slate-700 leading-relaxed text-sm md:text-base mb-8">
          {parsed.text}
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Columna: Factores a Favor */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Factores a favor
            </h3>

            <div className="space-y-3">
              {explanation?.topPositive?.map((item: any) => (
                <div
                  key={item.feature}
                  className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 transition-colors hover:bg-emerald-50"
                >
                  <p className="font-semibold text-emerald-900">{item.feature}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-700">
                    <span className="bg-emerald-100/80 border border-emerald-200 px-2 py-1 rounded-md">
                      Peso: {item.weight.toFixed(2)}
                    </span>
                    <span className="bg-emerald-100/80 border border-emerald-200 px-2 py-1 rounded-md">
                      Contribución: {item.contribution.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              {(!explanation?.topPositive || explanation.topPositive.length === 0) && (
                 <p className="text-sm text-slate-400 italic">No se registraron factores de impacto positivo.</p>
              )}
            </div>
          </div>

          {/* Columna: Factores en Contra */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Factores en contra
            </h3>

            <div className="space-y-3">
              {explanation?.topNegative?.map((item: any) => (
                <div
                  key={item.feature}
                  className="rounded-lg border border-rose-100 bg-rose-50/50 p-4 transition-colors hover:bg-rose-50"
                >
                  <p className="font-semibold text-rose-900">{item.feature}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-rose-700">
                    <span className="bg-rose-100/80 border border-rose-200 px-2 py-1 rounded-md">
                      Peso: {item.weight.toFixed(2)}
                    </span>
                    <span className="bg-rose-100/80 border border-rose-200 px-2 py-1 rounded-md">
                      Contribución: {item.contribution.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              {(!explanation?.topNegative || explanation.topNegative.length === 0) && (
                 <p className="text-sm text-slate-400 italic">No se registraron factores de impacto negativo.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}