import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planes y precios — Zyron',
  description:
    'Planes de despacho para quien ya tiene el cargo y planes de campaña para quien aspira — de edil a Senado — con precio fijo publicado.',
};

export default function PlanesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
