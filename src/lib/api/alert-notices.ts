import { apiGet, apiPatch } from '@/lib/api';
export interface AlertNotice {
  id: string; title: string; organizationName: string; nextAction: string; href: string;
  readAt: string | null; createdAt: string; active: boolean; resource: string; threshold: number | null; severity: string;
  usage?: { used: number | null; limit: number | null; remaining: number | null; periodStart: string | null; resetAt: string | null };
}
export interface AlertInbox { unread: number; audience: string; items: AlertNotice[] }
export const getAlertNotices = () => apiGet<AlertInbox>('/organization/billing/alert-notices');
export const readAlertNotice = (id: string) => apiPatch(`/organization/billing/alert-notices/${encodeURIComponent(id)}/read`);
