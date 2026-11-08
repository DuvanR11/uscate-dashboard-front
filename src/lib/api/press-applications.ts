import axios from 'axios';
import api from '@/lib/api';
import { API_URL } from '@/lib/api-url';

// Zyron Prensa, Fase 3 (2026-11-08): solicitud de membresía de prensa.
// La solicitud es pública (sin sesión, `axios` directo como /planes); la cola
// la revisa el operador en Plataforma → Solicitudes de prensa.

export type PressPlanCode = 'P1' | 'P2';
export type PressApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PressApplicationInput {
  fullName: string;
  document: string;
  email: string;
  phone?: string;
  outlet?: string;
  commercialPlanCode: PressPlanCode;
  workLinks: string[];
  proof?: File | null;
  website?: string;
}

export const getPressApplicationConsent = () =>
  axios
    .get<{ version: string; text: string }>(`${API_URL}/public/press-application-consent`)
    .then((r) => r.data);

export const submitPressApplication = (input: PressApplicationInput) => {
  const form = new FormData();
  form.append('fullName', input.fullName);
  form.append('document', input.document);
  form.append('email', input.email);
  if (input.phone) form.append('phone', input.phone);
  if (input.outlet) form.append('outlet', input.outlet);
  form.append('commercialPlanCode', input.commercialPlanCode);
  form.append('workLinks', JSON.stringify(input.workLinks));
  form.append('dataTreatment', 'true');
  if (input.website) form.append('website', input.website);
  if (input.proof) form.append('proof', input.proof);
  return axios
    .post<{ received: boolean }>(`${API_URL}/public/press-applications`, form)
    .then((r) => r.data);
};

export interface PressApplication {
  id: string;
  fullName: string;
  document: string;
  email: string;
  phone: string | null;
  outlet: string | null;
  commercialPlanCode: PressPlanCode;
  workLinks: string[];
  proofName: string | null;
  termsVersion: string;
  status: PressApplicationStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  organization: { id: string; name: string; slug: string; pressVerifiedAt: string | null } | null;
}

export interface PressOrganization {
  id: string;
  name: string;
  pressVerifiedAt: string | null;
  createdAt: string;
  /** Cumplió el año sin verificar (lo decide el servidor, como la alerta). */
  reverificationDue: boolean;
}

export const listPressApplications = (status?: PressApplicationStatus) =>
  api
    .get<PressApplication[]>('/platform/press-applications', { params: status ? { status } : {} })
    .then((r) => r.data);

export const listPressOrganizations = () =>
  api.get<PressOrganization[]>('/platform/press-applications/organizations').then((r) => r.data);

export const pressApplicationProofUrl = (id: string) =>
  api.get<{ url: string }>(`/platform/press-applications/${id}/proof`).then((r) => r.data.url);

export const approvePressApplication = (
  id: string,
  input: { slug: string; adminPassword: string; commercialPlanCode?: PressPlanCode },
) => api.post(`/platform/press-applications/${id}/approve`, input).then((r) => r.data);

export const rejectPressApplication = (id: string, reason: string) =>
  api.post(`/platform/press-applications/${id}/reject`, { reason }).then((r) => r.data);

export const reverifyPressOrganization = (organizationId: string) =>
  api
    .post<{ pressVerifiedAt: string }>(`/platform/press-applications/organizations/${organizationId}/reverify`)
    .then((r) => r.data);
