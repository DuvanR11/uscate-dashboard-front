"use client";

import { Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";

/**
 * Fase 3 del plan de finanzas (2026-10-29, control 3.4): la persona marca si
 * el texto se escribió con ayuda de IA; queda en el registro de la difusión
 * (Circular SIC 002 de 2026). Lo que sale del Copiloto de Zyron el servidor
 * lo reconoce aunque no se marque.
 */
export function AiAssistedField({
  id = "aiAssisted",
  checked,
  onChange,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mt-1 rounded-full border border-slate-100 bg-white p-2 shadow-sm">
        <Sparkles className={`h-5 w-5 ${checked ? "text-secondary" : "text-slate-400"}`} aria-hidden />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={id} className="cursor-pointer font-bold text-slate-700">
            Usé IA para escribir este texto
          </Label>
          <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 cursor-pointer accent-secondary"
          />
        </div>
        <p className="text-xs leading-snug text-slate-500">
          Queda en el registro de la difusión que puede pedir la SIC. Si el texto salió del Copiloto de Zyron, se reconoce aunque no lo marques.
        </p>
      </div>
    </div>
  );
}
