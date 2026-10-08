import type { MetadataRoute } from 'next';

// Fase 4 "Líderes y celular" (2026-10-06): manifiesto de la aplicación web
// (Next lo sirve en `/manifest.webmanifest`). Con esto el navegador ofrece
// "Instalar" y la plataforma abre en el celular como una aplicación: con su
// ícono en la pantalla de inicio y sin la barra del navegador.
//
// Es uno solo para toda la plataforma (se resuelve sin sesión, antes de
// saber de qué organización es quien visita): nombre e ícono son los de
// JuryTech, igual que el título de la pestaña en `layout.tsx`.
//
// No hay modo sin conexión: la aplicación instalada necesita internet, igual
// que en el navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zyron',
    short_name: 'Zyron',
    description: 'Gestión de campaña: votantes, líderes, eventos y Día D.',
    lang: 'es-CO',
    // `/start` lleva a cada persona a su pantalla (el líder, a su panel).
    start_url: '/start',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B1728',
    theme_color: '#0B1728',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
