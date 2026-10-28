'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { getCurrentSession } from '@/lib/api/auth';

// Fase 0 del análisis de punta a punta (2026-10-28, TRV-02): los permisos del
// panel salían solo del login y quedaban congelados hasta 8 h. Dar un módulo o
// subir el plan no se veía sin volver a entrar, y quitarlo dejaba el enlace en
// el menú con rechazos. Ahora el marco del panel pide `GET /auth/session` al
// montarse y al volver a la pestaña, a lo sumo una vez por minuto (entre todas
// las pantallas: el contador es del módulo, no de cada montaje).
const MIN_INTERVAL_MS = 60_000;
let lastCheckAt = 0;
let inFlight = false;

/** El login acaba de traer los permisos: la próxima revisión espera un minuto. */
export function markSessionFresh() {
  lastCheckAt = Date.now();
}

async function refreshSessionNow() {
  if (inFlight || Date.now() - lastCheckAt < MIN_INTERVAL_MS) return;
  if (document.visibilityState === 'hidden') return;
  if (!useAuthStore.getState().user) return;
  inFlight = true;
  lastCheckAt = Date.now();
  try {
    const session = await getCurrentSession();
    // Un "ver como" que se abrió en otra pestaña: su aviso (quién es el
    // operador, qué organización) quedó en el almacenamiento compartido.
    if (session.impersonating && !useAuthStore.getState().impersonation) {
      await useAuthStore.persist.rehydrate();
    }
    useAuthStore.getState().refreshSession(session.user, {
      expiresAt: session.expiresAt,
      impersonating: session.impersonating,
    });
  } catch {
    // 401 (rol cambiado, sesión revocada o vencida): `lib/api.ts` ya cerró la
    // sesión. Un fallo de red o un 403 no cambian nada: sigue la que había.
  } finally {
    inFlight = false;
  }
}

/** Mantiene `user.permissions` del store al día con el servidor. */
export function useSessionRefresh(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void refreshSessionNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshSessionNow();
    };
    const onFocus = () => void refreshSessionNow();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled]);
}
