import { apiGet, apiPost } from '@/lib/api';
import type { ReconciliationExample } from './territorial-reconciliation-preview';
export interface ReconciliationEvent { id: string; revision: number; action: string; actorEmail: string; reason: string; createdAt: string; snapshot: { responsibleName: string; responsibleEmail: string; state: string } }
export interface SavedReconciliation { id: string; datasetCode: string; mode: string; exampleId: string; title: string; state: string; revision: number; createdById: string; createdAt: string; responsibleId: string; responsibleName: string; responsibleEmail: string; snapshotHash: string; comparisonStatus: string; differences: number; incompleteComparisons: number; history: ReconciliationEvent[]; historyTruncated: boolean; published: false; officialReconciliationVerified: false; snapshot?: { mode: string; officialSourceIds: []; comparison: ReconciliationExample['result'] } }
export interface CreateReconciliation { requestKey: string; exampleId: string; title: string; reason: string }
export interface ReconciliationCommand { requestKey: string; expectedRevision: number; action: string; reason: string; responsibleId?: string; checkedResult?: boolean }
export interface ReconciliationResponsible { id: string; fullName: string; email: string }
const root = '/platform/territorial-data/reconciliations';
export const listSavedReconciliations = () => apiGet<{ items: SavedReconciliation[]; truncated: boolean }>(root + '?datasetCode=MEDELLIN_ALCALDIA_2023');
export const listReconciliationResponsibles = () => apiGet<{ items: ReconciliationResponsible[]; truncated: boolean }>(root + '/responsibles');
export const createReconciliation = (input: CreateReconciliation) => apiPost<SavedReconciliation>(root, input);
export const commandReconciliation = (id: string, input: ReconciliationCommand) => apiPost<SavedReconciliation>(root + '/' + encodeURIComponent(id) + '/commands', input);
export const getReconciliation = (id: string) => apiGet<SavedReconciliation>(root + '/' + encodeURIComponent(id));
export const getReconciliationHistory = (id: string, beforeRevision?: number) => apiGet<{ items: ReconciliationEvent[]; nextBeforeRevision: number | null }>(root + '/' + encodeURIComponent(id) + '/history' + (beforeRevision ? '?beforeRevision=' + beforeRevision : ''));
