'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Circle, PartyPopper, Sparkles, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getOnboardingChecklist, type OnboardingChecklist } from '@/lib/api/organizations';
import { ONBOARDING_GUIDES } from '@/lib/help-guides';

const DISMISS_KEY = 'welcome-checklist-dismissed';

/**
 * Checklist de bienvenida para una organización nueva — cada ítem se basa
 * en una señal real de la base de datos (`GET /organization/onboarding`),
 * nunca un estado inventado. Se muestra en `/dashboard`; se oculta sola
 * cuando todo está listo, o si el usuario la cierra a mano (recordado por
 * navegador vía localStorage — es una conveniencia por-viewer, no un
 * estado que necesite sincronizarse entre dispositivos).
 */
export function WelcomeChecklist() {
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [dismissed, setDismissed] = useState(true); // arranca oculto hasta confirmar que no fue descartado

  useEffect(() => {
    // Mismo patrón "isMounted" ya aceptado en (dashboard)/layout.tsx — es
    // una inicialización de una sola vez al montar, no un loop de renders
    // en cascada (localStorage no existe durante el render de servidor).
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
    getOnboardingChecklist()
      .then(setChecklist)
      .catch(() => setChecklist(null));
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // localStorage puede fallar (modo privado, cuotas) — la card simplemente
      // reaparecerá la próxima carga, no es un caso que deba romper nada.
    }
  };

  if (!checklist || dismissed || checklist.items.length === 0) return null;

  const doneCount = checklist.items.filter((i) => i.done).length;

  return (
    <Card className="border-0 shadow-md ring-1 ring-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
        onClick={handleDismiss}
        aria-label="Ocultar"
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          {checklist.allDone ? (
            <PartyPopper className="h-5 w-5 text-secondary" />
          ) : (
            <Sparkles className="h-5 w-5 text-secondary" />
          )}
          <h3 className="font-black text-foreground">
            {checklist.allDone ? '¡Ya diste tus primeros pasos!' : 'Primeros pasos'}
          </h3>
          <span className="text-xs text-slate-400 ml-auto mr-8">
            {doneCount}/{checklist.items.length}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          {checklist.items.map((item) => {
            const guide = ONBOARDING_GUIDES[item.key];
            return (
              // La guía va aparte del enlace del paso: un enlace no puede ir
              // dentro de otro.
              <div
                key={item.key}
                className={`flex flex-col rounded-lg border transition-colors ${
                  item.done
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-slate-200 bg-white hover:border-secondary/60 hover:bg-secondary/5'
                }`}
              >
                <Link href={item.href} className="flex flex-1 items-start gap-2 p-3">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${item.done ? 'text-green-700 line-through' : 'text-slate-700'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                </Link>
                {guide && !item.done && (
                  <Link
                    href={`/ayuda/${guide}`}
                    className="mx-3 mb-2 inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
                  >
                    <BookOpen className="h-3 w-3" aria-hidden="true" /> Ver la guía paso a paso
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
