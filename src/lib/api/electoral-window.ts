// Fase 3 del plan de finanzas (2026-10-30, control 3.7): fechas de la
// propaganda electoral para el aviso de los editores de difusiones. El
// servidor decide si la organización es de campaña y en qué punto está.
import api from '@/lib/api';

export type ElectoralWindow =
  | { applies: false }
  | {
      applies: true;
      phase: 'BEFORE' | 'OPEN' | 'AFTER';
      source: string;
      electionDay: string;
      publicSpaceFrom: string;
      mediaFrom: string;
    };

export async function getElectoralWindow(): Promise<ElectoralWindow> {
  const { data } = await api.get<ElectoralWindow>('/campaigns/electoral-window');
  return data;
}
