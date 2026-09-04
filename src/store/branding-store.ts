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
}

export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: null,
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return;
    try {
      const branding = await brandingApi.getEffective();
      set({ branding, isLoaded: true });
    } catch (error) {
      // Estrategia de fallback (§7 del informe): si el backend no responde,
      // la app nunca debe quedar sin tema — se usan los mismos valores por
      // defecto que ya están escritos en `globals.css`.
      console.error('No se pudo cargar el branding, usando el default de plataforma', error);
      set({ branding: DEFAULT_BRANDING, isLoaded: true });
    }
  },
}));
