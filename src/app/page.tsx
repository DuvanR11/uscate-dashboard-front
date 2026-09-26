import { redirect } from 'next/navigation';

// Hallazgo de la auditoría pre-comercialización (2026-09-26): esta página
// era la plantilla de `create-next-app` ("To get started, edit the page.tsx
// file", logos de Vercel) y cualquier visitante sin sesión la veía al abrir
// el dominio raíz. Un usuario CON sesión nunca llega acá: `middleware.ts`
// lo redirige a `/profile` antes de renderizar.
export default function Home() {
  redirect('/login');
}
