'use client';

import { useId, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Fase 3 del análisis (2026-10-12): reemplaza a `window.prompt()` (la ventana
// gris del navegador) donde el panel pide un dato corto antes de una acción.
// Mismo mecanismo que `confirmDialog`:
//
//   const reason = await promptDialog({ title: 'Anular el pago', label: 'Motivo', minLength: 5 });
//   if (reason === null) return; // la persona canceló
//
// `<PromptDialogHost />` se monta una sola vez en `(dashboard)/layout.tsx`.

export interface PromptOptions {
  title: string;
  description?: string;
  /** Nombre del dato que se pide (etiqueta del campo). */
  label: string;
  placeholder?: string;
  /** Mínimo de caracteres, sin contar espacios a los lados. Por defecto 1. */
  minLength?: number;
  maxLength?: number;
  /** Varias líneas (motivos, notas) en vez de un renglón. */
  multiline?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botón de confirmar en rojo (acciones que anulan o borran). */
  destructive?: boolean;
}

interface Pending extends PromptOptions {
  /** Cambia en cada pregunta: el campo arranca vacío sin un efecto que lo limpie. */
  key: number;
  resolve: (value: string | null) => void;
}

let pending: Pending | null = null;
let sequence = 0;
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

/** Pide un texto. Resuelve el texto (sin espacios a los lados) o `null` si la persona cancela. */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  // Si ya hay una pregunta abierta, la anterior queda como cancelada.
  pending?.resolve(null);
  return new Promise<string | null>((resolve) => {
    sequence += 1;
    pending = { ...options, key: sequence, resolve };
    emit();
  });
}

function settle(value: string | null) {
  const current = pending;
  if (!current) return;
  pending = null;
  emit();
  current.resolve(value);
}

export function PromptDialogHost() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Dialog open={current !== null} onOpenChange={(open) => !open && settle(null)}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {current && <PromptForm key={current.key} options={current} />}
      </DialogContent>
    </Dialog>
  );
}

function PromptForm({ options }: { options: Pending }) {
  const [value, setValue] = useState('');
  const fieldId = useId();
  const hintId = useId();
  const minLength = options.minLength ?? 1;
  const trimmed = value.trim();
  const valid = trimmed.length >= minLength;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (valid) settle(trimmed);
  };

  const fieldProps = {
    id: fieldId,
    value,
    autoFocus: true,
    placeholder: options.placeholder,
    maxLength: options.maxLength,
    'aria-describedby': minLength > 1 ? hintId : undefined,
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{options.title}</DialogTitle>
        {options.description ? (
          <DialogDescription>{options.description}</DialogDescription>
        ) : (
          <DialogDescription className="sr-only">Escribe el dato y confirma, o cancela.</DialogDescription>
        )}
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor={fieldId}>{options.label}</Label>
        {options.multiline ? (
          <Textarea {...fieldProps} rows={3} onChange={(event) => setValue(event.target.value)} />
        ) : (
          <Input {...fieldProps} onChange={(event) => setValue(event.target.value)} />
        )}
        {minLength > 1 && (
          <p id={hintId} className="text-xs text-muted-foreground">
            Mínimo {minLength} caracteres.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => settle(null)}>
          {options.cancelLabel ?? 'Cancelar'}
        </Button>
        <Button type="submit" disabled={!valid} variant={options.destructive ? 'destructive' : 'default'}>
          {options.confirmLabel ?? 'Confirmar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
