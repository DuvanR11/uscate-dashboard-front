import { apiGet, apiPost } from '@/lib/api';

const root = '/platform/territorial-data/geography/review-workflow';
export type ReviewAction = 'ASSIGN' | 'ATTACH_EVIDENCE' | 'WITHDRAW_EVIDENCE' | 'ACCEPT_REVIEW' | 'REQUEST_CHANGES' | 'REVOKE';
export interface ReviewEvidence { title: string; url: string; sha256: string; issuer: string; documentDate: string; scope: string; limitations: string }
export interface ReviewEvent {
  id: string; revision: number; targetKey: string; action: ReviewAction; reportHash: string;
  actorEmail: string; reason: string; createdAt: string;
  payload: { assignee?: { id: string; email: string }; evidence?: ReviewEvidence; evidenceId?: string; evidenceIds?: string[] };
}
export interface ReviewWorkflow {
  pilot: string; revision: number; reportHash: string;
  geographicValidationClosed: boolean; submunicipalPublicationReady: boolean;
  reviewedCount: number; publicationBlockers: string[];
  operators: { id: string; email: string; fullName: string }[];
  targets: { key: string; title: string; requiredEvidence: string; assignee: { id: string; email: string } | null; status: string; decision: ReviewEvent | null; eventCount: number; evidence: (ReviewEvidence & { id: string; revision: number; current: boolean; withdrawn: boolean })[] }[];
  history: ReviewEvent[]; nextBeforeRevision: number | null;
}
export interface ReviewCommand {
  requestKey: string; expectedRevision: number; reportHash: string; targetKey: string;
  action: ReviewAction; reason: string; assigneeId?: string; evidence?: ReviewEvidence;
  evidenceId?: string; evidenceIds?: string[]; acknowledgeDocumentaryOnly?: boolean;
}
function verified(data: ReviewWorkflow) {
  if (data?.pilot !== 'NEIVA_CONCEJO_2023' || !Number.isInteger(data.revision) || data.revision < 0 || !/^[a-f0-9]{64}$/.test(data.reportHash ?? '') || data.geographicValidationClosed !== false || data.submunicipalPublicationReady !== false || data.targets?.length !== 10 || !Array.isArray(data.operators) || !Array.isArray(data.history) || !Array.isArray(data.publicationBlockers)) throw new Error('No se pudo verificar el estado de la revisión interna.');
  return data;
}
export async function getGeographicReview() { return verified(await apiGet<ReviewWorkflow>(root)); }
export async function commandGeographicReview(command: ReviewCommand) {
  const result = await apiPost<{ receipt: { eventId: string; revision: number; replayed: boolean }; state: ReviewWorkflow }>(root, command);
  return { ...result, state: verified(result.state) };
}
export const getGeographicReviewHistory = (before: number) => apiGet<{ history: ReviewEvent[]; nextBeforeRevision: number | null }>(`${root}/history?beforeRevision=${before}`);
