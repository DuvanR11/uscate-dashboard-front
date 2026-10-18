'use client';

import { useAuthStore } from '@/store/auth-store';
import { Can } from '@/components/shared/can';
import { TerritorialExplorer } from '@/components/territorial/territorial-explorer';

export default function TerritorialResultsPage() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.sessionId);
  const impersonation = useAuthStore(s => s.impersonation);
  return <Can module="DASHBOARD" fallback={<p role="alert">No tienes permiso para consultar resultados electorales.</p>}>
    {!user?.organizationId || !token || impersonation?.active
      ? <p role="alert">Consulta los resultados desde una sesión propia de la organización.</p>
      : <TerritorialExplorer key={`${user.id}:${user.organizationId}:${token}`} />}
  </Can>;
}
