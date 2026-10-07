'use client';

// Fase 4 "Líderes y celular" (2026-10-06): instalar la plataforma en el
// celular como aplicación (acceso directo en la pantalla de inicio, sin la
// barra del navegador). Android y escritorio ofrecen la instalación con un
// aviso del propio navegador; en iPhone no existe ese aviso y hay que
// hacerlo desde el menú Compartir, así que ahí se muestran los pasos.
import { useState, useSyncExternalStore } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Evento que Chrome/Edge disparan cuando la página se puede instalar. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// El navegador lo dispara una sola vez, a veces antes de que este componente
// exista: se guarda a nivel de módulo para no perderlo.
let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

type Mode = 'hidden' | 'prompt' | 'ios';

function detectMode(): Mode {
  if (typeof window === 'undefined') return 'hidden';
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return 'hidden'; // ya está instalada y abierta como aplicación
  if (deferredPrompt) return 'prompt';
  const isIos =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS se presenta como Mac, pero con pantalla táctil.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIos ? 'ios' : 'hidden';
}

export function InstallAppButton({ className }: { className?: string }) {
  // En el servidor (y en el primer render) no se sabe nada del dispositivo.
  const mode = useSyncExternalStore<Mode>(subscribe, detectMode, () => 'hidden');
  const [helpOpen, setHelpOpen] = useState(false);

  if (mode === 'hidden') return null;

  const install = async () => {
    if (mode === 'ios' || !deferredPrompt) {
      setHelpOpen(true);
      return;
    }
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // El aviso solo se puede usar una vez.
    deferredPrompt = null;
    notify();
  };

  return (
    <>
      <Button type="button" variant="outline" className={className} onClick={install}>
        <Download className="mr-2 h-4 w-4" /> Instalar la aplicación
      </Button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar en iPhone o iPad</DialogTitle>
            <DialogDescription>Se hace desde Safari, en tres pasos.</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-700">
            <li>
              Toca el botón <strong>Compartir</strong>{' '}
              <Share className="inline h-4 w-4 align-text-bottom" aria-hidden /> en la barra de Safari.
            </li>
            <li>
              Elige <strong>Agregar a inicio</strong>.
            </li>
            <li>
              Toca <strong>Agregar</strong>. El ícono queda en tu pantalla de inicio.
            </li>
          </ol>
          <DialogFooter>
            <Button onClick={() => setHelpOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
