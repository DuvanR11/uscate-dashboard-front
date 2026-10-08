import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planes y precios — Zyron',
  description:
    'Planes por cargo político — Concejo, Asamblea, Alcaldía, Gobernación y Congreso — con precio publicado para funcionarios en ejercicio y aspirantes.',
};

export default function PlanesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
