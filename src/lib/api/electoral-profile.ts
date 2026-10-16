import { apiGet, apiPost } from '@/lib/api';
import type { RegistryContext } from './territorial-registry';
export type TeamFunction = 'CANDIDATE' | 'COORDINATOR' | 'MEMBER';
export interface ElectoralUser { id: string; fullName: string; email: string; isActive: boolean; role: { code: string; name: string } }
export interface ElectoralTeamEntry { userId: string; function: TeamFunction; user: ElectoralUser }
export interface ElectoralProfileState {
  organization: { id: string; name: string; territoryCode: string | null; officeType: string | null };
  profile: { aspirantName: string; datasetCode: string; revision: number; updatedAt: string; dataset: RegistryContext['definition']; team: ElectoralTeamEntry[] } | null;
  history: { id: string; revision: number; actorEmail: string; reason: string; createdAt: string }[];
  registrationGrantsAccess: false; officialCandidacyVerified: false;
}
export interface ElectoralOptions { datasets: RegistryContext['definition'][]; users: ElectoralUser[]; truncated: { datasets: boolean; users: boolean } }
export interface ElectoralProfileCommand { requestKey: string; expectedRevision: number; aspirantName: string; datasetCode: string; reason: string; team: { userId: string; function: TeamFunction }[] }
const base = (id: string) => '/platform/organizations/' + encodeURIComponent(id) + '/electoral-profile';
export const getElectoralProfile = (id: string) => apiGet<ElectoralProfileState>(base(id));
export const getElectoralOptions = (id: string, search = '') => apiGet<ElectoralOptions>(base(id) + '/options?search=' + encodeURIComponent(search));
export const saveElectoralProfile = (id: string, command: ElectoralProfileCommand) => apiPost<{ revision: number; replayed: boolean }>(base(id) + '/commands', command);
