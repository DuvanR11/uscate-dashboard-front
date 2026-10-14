'use client';

import { useAuthStore } from '@/store/auth-store';
import { Can } from '@/components/shared/can';
import { MunicipalExplorer } from '@/components/territorial/municipal-explorer';

export default function TerritorialResultsPage() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const impersonation = useAuthStore(s => s.impersonation);
  return <Can module="DASHBOARD" fallback={<p role="alert">No tienes permiso para consultar resultados electorales.</p>}>
    {!user?.organizationId || !token || impersonation?.active
      ? <p role="alert">Consulta los resultados desde una sesión propia de la organización.</p>
      : <MunicipalExplorer key={`${user.id}:${user.organizationId}:${token}`} />}
  </Can>;
}
