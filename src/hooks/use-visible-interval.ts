'use client';

import { useEffect, useRef } from 'react';

/**
 * Sondeo que solo corre con la pestaña visible.
 *
 * Fase 5 del análisis de punta a punta (2026-10-28, INT-20/TRV-06): el
 * Tablero (9 consultas cada 60 s), el Día D y la Sala de Guerra (cada 30 s)
 * seguían pidiendo datos con la pestaña oculta. Con este hook el sondeo se
 * detiene al ocultarla y, al volver, refresca una vez de inmediato si ya pasó
 * el intervalo desde el último refresco (si no, espera solo lo que falta) y
 * retoma el ritmo. Cambiar de pestaña varias veces seguidas no dispara
 * ráfagas de consultas.
 *
 * La carga inicial la sigue haciendo cada pantalla: el reloj arranca al
 * montar, como si esa carga fuera el primer refresco.
 *
 * @param callback Lo que se refresca (siempre la versión más reciente).
 * @param delayMs  Intervalo en ms; `null` apaga el sondeo.
 */
export function useVisibleInterval(callback: () => void, delayMs: number | null) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;

    let lastRunAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stop = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };
    const run = () => {
      lastRunAt = Date.now();
      callbackRef.current();
    };
    const schedule = (waitMs: number) => {
      stop();
      timer = setTimeout(() => {
        run();
        schedule(delayMs);
      }, waitMs);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stop();
        return;
      }
      const elapsed = Date.now() - lastRunAt;
      if (elapsed >= delayMs) {
        run();
        schedule(delayMs);
      } else {
        schedule(delayMs - elapsed);
      }
    };

    if (document.visibilityState !== 'hidden') schedule(delayMs);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [delayMs]);
}
