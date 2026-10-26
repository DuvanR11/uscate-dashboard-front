import api from "@/lib/api";
export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "WON" | "LOST";
export const leadLabels: Record<LeadStatus, string> = {
  NEW: "Nueva",
  CONTACTED: "Contactada",
  QUALIFIED: "Calificada",
  WON: "Ganada",
  LOST: "Perdida",
};
export interface CommercialContext {
  name: string;
  email: string;
  salesRepId: string;
  department: { code: string; name: string };
  territories: { code: string; name: string; level: string }[];
  capabilities: string[];
}
export interface CommercialLead {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  territory: string;
  territoryCode: string;
  status: LeadStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CommercialCommission {
  id: string;
  origin: string;
  ratePercent: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  payment: {
    territoryCode: string;
    currency: string;
    paidAt: string;
    commercialPlanCode: string | null;
  };
  installments: {
    sequence: number;
    amount: string;
    dueDate: string;
    status: string;
    paidAt: string | null;
  }[];
}
export interface CommercialPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface CommercialLeadInput {
  requestKey: string;
  fullName: string;
  email: string;
  phone?: string;
  territoryCode: string;
  notes?: string;
  dataTreatmentConfirmed: true;
}
export const commercialContext = () =>
  api.get<CommercialContext>("/commercial/context").then((r) => r.data);
export const commercialLeads = (page: number, status: string) =>
  api
    .get<
      CommercialPage<CommercialLead>
    >("/commercial/leads", { params: { page, ...(status ? { status } : {}) } })
    .then((r) => r.data);
export const commercialCommissions = (page: number) =>
  api
    .get<
      CommercialPage<CommercialCommission>
    >("/commercial/commissions", { params: { page } })
    .then((r) => r.data);
export const createCommercialLead = (input: CommercialLeadInput) =>
  api
    .post<{
      lead: CommercialLead;
      replayed: boolean;
    }>("/commercial/leads", input)
    .then((r) => r.data);
export const updateCommercialLead = (
  id: string,
  input: { status: LeadStatus; notes: string },
) =>
  api
    .patch<CommercialLead>("/commercial/leads/" + encodeURIComponent(id), input)
    .then((r) => r.data);
