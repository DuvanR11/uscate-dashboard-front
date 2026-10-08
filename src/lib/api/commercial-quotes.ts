import { apiGet, apiPost } from "@/lib/api";
import type { PaymentQuote, QuoteInput } from "./billing";

export interface CommercialQuote {
  id: string;
  seriesId: string;
  version: number;
  effectiveState: "ISSUED" | "ACCEPTED" | "SUPERSEDED" | "EXPIRED";
  snapshot: Omit<PaymentQuote, "commission"> & {
    currency: string;
    coverage: { basePlanCode: string; modules: string[] } | null;
  };
  designatedUserId: string;
  designatedName: string;
  designatedEmail: string;
  issuedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedByName: string | null;
}
export interface QuoteRecipient {
  id: string;
  fullName: string;
  email: string;
  role: { code: string };
}
export type IssueQuoteInput = QuoteInput & {
  expectedConditions: string;
  requestKey: string;
  designatedUserId: string;
  acceptanceAuthority: "PRINCIPAL_ADMIN" | "COMMERCIAL_CONTACT";
  designationReason: string;
};
const root = (org: string) =>
  `/platform/billing/organizations/${encodeURIComponent(org)}/quotes`;
export const listCommercialQuotes = (org: string) =>
  apiGet<CommercialQuote[]>(root(org));
export const listQuoteRecipients = (org: string) =>
  apiGet<QuoteRecipient[]>(`${root(org)}/recipients`);
export const issueCommercialQuote = (
  org: string,
  input: IssueQuoteInput,
  previousId?: string,
) =>
  apiPost<CommercialQuote>(
    previousId
      ? `${root(org)}/${encodeURIComponent(previousId)}/revisions`
      : root(org),
    input,
  );
export const listMyCommercialQuotes = () =>
  apiGet<CommercialQuote[]>("/organization/billing/quotes");
export const acceptCommercialQuote = (id: string) =>
  apiPost<CommercialQuote>(
    `/organization/billing/quotes/${encodeURIComponent(id)}/accept`,
    { confirm: true },
  );
