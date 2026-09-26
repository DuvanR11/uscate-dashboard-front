import { redirect } from 'next/navigation';

// Deuda 2 de la Fase 3 "Limpieza" (2026-09-27): la búsqueda ad-hoc legada
// ("Búsquedas") se retiró a favor del sistema de Casos OSINT, que tiene
// evidencia con hash, cadena de custodia y auditoría. Esta ruta se conserva
// solo para que un favorito o enlace antiguo no dé 404.
export default function ExpedientesRedirect() {
  redirect('/osint/casos');
}
