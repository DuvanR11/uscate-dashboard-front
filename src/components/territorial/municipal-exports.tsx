'use client';

import { useAuthStore } from '@/store/auth-store';
import { usePermission } from '@/hooks/use-permission';
import type { MunicipalResults } from '@/lib/api/territorial-results';
import { ReportHistory } from './report-history';

export function MunicipalExports({ version, onInvalidation }: { version: MunicipalResults['version']; onInvalidation: () => void }) {
  const role = useAuthStore(s => s.user?.role?.code);
  const impersonation = useAuthStore(s => s.impersonation);
  const read = usePermission('DASHBOARD');
  if (!read || impersonation || !['ADMIN', 'SUPER_ADMIN'].includes(role ?? '')) return null;
  return <ReportHistory key={version.id + version.contentHash} version={version} onInvalidation={onInvalidation} />;
}
