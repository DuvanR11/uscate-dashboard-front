'use client';
import { createContext, useContext } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { QuerySection } from './query-section';
import { getPlatformAccess, type PlatformAccess } from '@/lib/api/platform-access';
const Access = createContext<PlatformAccess | null>(null);
export const usePlatformAccess = () => useContext(Access);
export function usePlatformCapability(capability: string) {
  const access = usePlatformAccess();
  const legacyWrite = useAuthStore((state) => state.user?.permissions?.some((p) => p.module === 'PLATAFORMA' && p.canWrite));
  return Boolean(access?.capabilities.includes(capability) && (['ORGANIZATIONS_READ', 'BILLING_READ', 'COMMISSIONS_READ', 'SUPPORT_READ'].includes(capability) || legacyWrite));
}
export function PlatformAccessProvider({ children }: { children: React.ReactNode }) {
  return <QuerySection title="Acceso del equipo de plataforma" load={getPlatformAccess}>{(access) => <Access.Provider value={access}>{children}</Access.Provider>}</QuerySection>;
}
