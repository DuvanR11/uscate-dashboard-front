import { apiGet } from '@/lib/api';

export type ComparisonCell = { observed: number | null; expected: number | null; delta: number | null; state: 'MATCH' | 'DIFFERENCE' | 'INCOMPLETE' };
export type CandidateComparison = ComparisonCell & { partyCode: string; candidateCode: string; observedName: string | null; expectedName: string | null; observedPartyName: string | null; expectedPartyName: string | null; presence: string; nameDifferences: string[] };
export type ComparisonLocation = { zone: string; station: string; mesa: string; commune: string; communeName: string; stationName: string };
export type ComparisonTable = { key: string; observedLocation: ComparisonLocation | null; expectedLocation: ComparisonLocation | null; presence: string; locationDifferences: string[]; candidates: CandidateComparison[]; categories: Record<string, ComparisonCell> };
export type ReconciliationExample = {
  id: string; title: string; description: string;
  result: {
    mode: 'SYNTHETIC_ONLY'; datasetCode: string; status: string;
    differences: number; incompleteComparisons: number;
    candidates: CandidateComparison[]; categories: Record<string, ComparisonCell>;
    tables: ComparisonTable[]; validVotes: ComparisonCell; totalVotes: ComparisonCell;
    tableCoverage: { observed: number; expected: number; sameIdentities: boolean };
    sourceCsvSha256: string; draftSha256: string; referenceFileSha256: string;
    published: false; publishable: false; independentReconciliationVerified: false;
    pending: string[];
  };
};
export type ReconciliationExamples = { schemaVersion: number; mode: 'SYNTHETIC_ONLY'; datasetCode: string; fixtureOnly: true; reviewsPersisted: false; officialResultsAvailable: false; items: ReconciliationExample[] };
export const listReconciliationExamples = () => apiGet<ReconciliationExamples>('/platform/territorial-data/reconciliation-examples');
