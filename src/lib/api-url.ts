// Fase 5 del análisis de punta a punta (2026-10-28): una sola dirección de la
// API para las pantallas que llaman con `axios`/`fetch` directo (las públicas,
// sin la instancia de `lib/api.ts`). Cinco de ellas caían a un dominio que no
// existe (`usca.jurytechsolution.com`) y el registro público al puerto del
// propio panel. El build de producción recibe `NEXT_PUBLIC_API_URL` (ver
// `Dockerfile`); el respaldo es solo para el entorno local.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';
