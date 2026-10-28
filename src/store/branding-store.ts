import { create } from 'zustand';
import { brandingApi, DEFAULT_BRANDING, type EffectiveBranding } from '@/lib/api/branding';

// A propósito SIN `persist` (a diferencia de auth-store.ts): el branding
// efectivo se vuelve a pedir una vez por carga de página (decisión #13 de
// Fase 1 — sin caché dedicada, el payload es de pocos KB) en vez de
// guardarse en localStorage, para no arrastrar el branding de una
// organización a la sesión de otra en el mismo navegador.
interface BrandingState {
  branding: EffectiveBranding | null;
  isLoaded: boolean;
  load: () => Promise<void>;
  /** Vuelve a pedir la marca aunque ya estuviera cargada (cambio de organización sin recargar). */
  reload: () => Promise<void>;
}

// Fase 4 del análisis de punta a punta (2026-10-28, TRV-13): al entrar o salir
// de «Ver como» la página no se recarga y `load()` salía temprano, así que se
// quedaba la marca de la organización anterior. `reload()` la vuelve a pedir
// sin quitar la actual mientras llega (el layout no vuelve a mostrar el
// cargador) y solo la respuesta más reciente se aplica.
let latestRequest = 0;

// Fase 5 del análisis de punta a punta (2026-10-28, TRV-25): el layout no
// muestra el panel hasta tener marca. Si la API no contesta en este plazo, el
// panel abre con la marca por defecto; si la respuesta llega después (la
// petición sigue hasta el plazo general de `lib/api.ts`), se aplica.
const BRANDING_WAIT_MS = 8_000;

export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: null,
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return;
    await get().reload();
  },

  reload: async () => {
    const request = ++latestRequest;
    // Solo en la primera carga: un `reload()` conserva la marca actual
    // mientras espera.
    const fallback = setTimeout(() => {
      if (request === latestRequest && !get().isLoaded) {
        set({ branding: DEFAULT_BRANDING, isLoaded: true });
      }
    }, BRANDING_WAIT_MS);
    try {
      const branding = await brandingApi.getEffective();
      if (request !== latestRequest) return;
      set({ branding, isLoaded: true });
    } catch (error) {
      if (request !== latestRequest) return;
      // Estrategia de fallback (§7 del informe): si el backend no responde,
      // la app nunca debe quedar sin tema — se usan los mismos valores por
      // defecto que ya están escritos en `globals.css`.
      console.error('No se pudo cargar el branding, usando el default de plataforma', error);
      set({ branding: DEFAULT_BRANDING, isLoaded: true });
    } finally {
      clearTimeout(fallback);
    }
  },
}));
