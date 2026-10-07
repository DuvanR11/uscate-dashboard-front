'use client';
import LegacyPlatformPanel from '@/components/platform/legacy-platform-panel';
import { usePlatformAccess } from '@/components/platform/access-context';

export default function PlatformSettingsPage() {
  const access = usePlatformAccess();
  if (access?.enabled && !access.principal) return <p className="p-6">La configuración general corresponde al administrador principal. Gestiona tus organizaciones desde sus fichas.</p>;
  return <LegacyPlatformPanel />;
}
