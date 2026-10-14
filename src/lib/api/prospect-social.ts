import api from '@/lib/api';

export const SOCIAL_PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'X', 'LINKEDIN', 'YOUTUBE'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialSource = 'CONTACT_DECLARED' | 'TEAM_PROVIDED';
export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', X: 'X', LINKEDIN: 'LinkedIn', YOUTUBE: 'YouTube',
};
export interface SocialContact {
  platform: SocialPlatform;
  url: string | null;
  source: SocialSource | null;
  version: number;
  updatedAt: string;
}
export interface SocialContactHistory {
  id: string;
  platform: SocialPlatform;
  version: number;
  action: 'CREATED' | 'UPDATED' | 'REMOVED' | 'PRIVACY_CLEARED';
  actorId: string | null;
  createdAt: string;
}
export interface SocialContactsView {
  contacts: SocialContact[];
  history: SocialContactHistory[];
  historyLimit: number;
}
export const getProspectSocialContacts = async (id: string) =>
  (await api.get<SocialContactsView>(`/prospects/${id}/social-contacts`)).data;
export const saveProspectSocialContact = async (id: string, platform: SocialPlatform, input: { url: string | null; source?: SocialSource; expectedVersion: number }) =>
  (await api.put(`/prospects/${id}/social-contacts/${platform}`, input)).data;
