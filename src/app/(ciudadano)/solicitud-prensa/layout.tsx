import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solicitud de Zyron Prensa — Zyron',
  description:
    'Radar Legislativo, monitoreo de medios, investigaciones OSINT y derechos de petición para periodistas y salas de redacción.',
};

export default function SolicitudPrensaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
