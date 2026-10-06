'use client';

import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Fase 2 "Menú y nombres" (2026-10-06): reemplaza a `window.confirm()` (la
// ventana gris del navegador) en todo el panel. Se usa igual de simple:
//
//   if (!(await confirmDialog('¿Eliminar "X"? Esta acción no se puede deshacer.'))) return;
//
// `<ConfirmDialogHost />` se monta una sola vez en `(dashboard)/layout.tsx`.

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botón de confirmar en rojo (acciones que borran o desconectan). */
  destructive?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => pending;
const getServerSnapshot = () => null;

const CANCEL_VERB = /^¿?\s*cancelar\b/i;
const DESTRUCTIVE_VERB = /^¿?\s*(eliminar|borrar|quitar|desconectar|reiniciar)\b/i;

/**
 * Un texto como '¿Eliminar "X"? No se puede deshacer.' se parte en título
 * (la pregunta) y detalle (el resto); si empieza por un verbo que borra, el
 * botón sale en rojo y con ese verbo.
 */
export function toConfirmOptions(input: string | ConfirmOptions): ConfirmOptions {
  if (typeof input !== 'string') return input;
  const text = input.trim();
  const cut = text.indexOf('?');
  const title = cut >= 0 ? text.slice(0, cut + 1) : text;
  const description = cut >= 0 ? text.slice(cut + 1).trim() : '';
  // "¿Cancelar la suscripción?" con un botón "Cancelar" al lado se presta a
  // confusión: ahí los botones dicen explícitamente qué hace cada uno.
  if (CANCEL_VERB.test(title)) {
    return {
      title,
      description: description || undefined,
      destructive: true,
      confirmLabel: 'Sí, cancelar',
      cancelLabel: 'No, volver',
    };
  }
  const verb = DESTRUCTIVE_VERB.exec(title)?.[1];
  return {
    title,
    description: description || undefined,
    destructive: Boolean(verb),
    confirmLabel: verb ? verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase() : undefined,
  };
}

/** Pide confirmación. Resuelve `true` solo si la persona confirma. */
export function confirmDialog(input: string | ConfirmOptions): Promise<boolean> {
  // Si ya hay una pregunta abierta, la anterior queda como "no".
  pending?.resolve(false);
  return new Promise<boolean>((resolve) => {
    pending = { ...toConfirmOptions(input), resolve };
    emit();
  });
}

function settle(confirmed: boolean) {
  const current = pending;
  if (!current) return;
  pending = null;
  emit();
  current.resolve(confirmed);
}

export function ConfirmDialogHost() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Dialog open={current !== null} onOpenChange={(open) => !open && settle(false)}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{current?.title ?? ''}</DialogTitle>
          {current?.description ? (
            <DialogDescription>{current.description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">Confirma o cancela esta acción.</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => settle(false)}>
            {current?.cancelLabel ?? 'Cancelar'}
          </Button>
          <Button
            autoFocus
            variant={current?.destructive ? 'destructive' : 'default'}
            onClick={() => settle(true)}
          >
            {current?.confirmLabel ?? 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
