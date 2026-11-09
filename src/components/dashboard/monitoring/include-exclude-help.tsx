import { Check, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Qué hacen «Incluir» y «Excluir», con un ejemplo (Monitoreo de medios,
 * Fase 4, 2026-11-08). Va en el asistente y en la ventana de alias: es lo
 * que más se preguntaba al montar un monitoreo.
 */
export function IncludeExcludeHelp({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600', className)}>
      <p>
        El nombre de la etiqueta ya se busca solo. <strong className="text-slate-800">Incluir</strong> agrega otras
        formas de decir lo mismo; <strong className="text-slate-800">Excluir</strong> descarta una noticia aunque
        coincida, y siempre gana.
      </p>
      <p className="mt-2 font-medium text-slate-700">Ejemplo con la etiqueta «Ana Gómez»:</p>
      <ul className="mt-1 space-y-1">
        <li className="flex gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          <span>
            Incluir <em>«la concejal Gómez»</em>: llega «La concejal Gómez pidió un debate de control», que no dice
            el nombre completo.
          </span>
        </li>
        <li className="flex gap-2">
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden />
          <span>
            Excluir <em>«actriz»</em>: no llega «La actriz Ana Gómez estrena serie», aunque diga el mismo nombre.
          </span>
        </li>
      </ul>
      <p className="mt-2 flex gap-2">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden />
        <span>
          <strong className="text-slate-800">Lugar</strong> es para un tema en una ciudad: con «Seguridad en Bogotá»,
          Incluir <em>«hurto»</em> y Lugar <em>«Engativá»</em>, llega «Hurto de motos disminuyó en Engativá», pero no un
          hurto en Neiva.
        </span>
      </p>
    </div>
  );
}
