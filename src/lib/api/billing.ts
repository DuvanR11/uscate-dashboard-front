import api, { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api';

/**
 * Cliente de cobros, vigencia y documentos legales (Fase 1 "Poder cobrar").
 * Toda la lógica (IVA, comisiones, vigencia) vive en el backend — acá solo
 * se tipan y se llaman los endpoints.
 */

// ---- Estado de la suscripción --------------------------------------------

export type SubscriptionState = 'ACTIVE' | 'GRACE' | 'READ_ONLY' | 'SUSPENDED' | 'CANCELLED';

export interface OrganizationLifecycle {
  state: SubscriptionState;
  access: 'FULL' | 'READ_ONLY' | 'BLOCKED';
  termMonths: number | null;
  expiresAt: string | null;
  daysToExpiry: number | null;
  cancelledAt: string | null;
}

export const SUBSCRIPTION_STATE_LABEL: Record<SubscriptionState, string> = {
  ACTIVE: 'Activa',
  GRACE: 'En gracia',
  READ_ONLY: 'Solo lectura',
  SUSPENDED: 'Suspendida',
  CANCELLED: 'Cancelada',
};

// ---- Vista del cliente (`GET /organization/billing`) ---------------------

export interface PaymentSummary {
  id: string;
  organization?: { id: string; name: string };
  planCode: string | null;
  commercialPlanCode: string | null;
  candidacy: Candidacy | null;
  termMonths: number;
  // Catálogo territorial: suscripción o complemento, y con qué categoría se cotizó.
  kind: 'SUBSCRIPTION' | 'ADDON';
  addonType: AddonType | null;
  addonQuantity: number | null;
  addonActive: boolean;
  territoryCode: string | null;
  territoryCategory: string | null;
  monthlyPrice: number | null;
  listAmount: number;
  discountAmount: number;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  method: PaymentMethod;
  reference: string | null;
  invoiceNumber: string | null;
  status: 'CONFIRMED' | 'VOIDED';
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  couponCode: string | null;
  salesRep: { id: string; name: string } | null;
  registeredByEmail: string | null;
  voidReason: string | null;
  notes: string | null;
}

export type OrganizationBilling =
  | { hasSubscription: false }
  | {
      hasSubscription: true;
      state: SubscriptionState;
      access: 'FULL' | 'READ_ONLY' | 'BLOCKED';
      plan: { code: string; name: string } | null;
      termMonths: number | null;
      expiresAt: string | null;
      daysToExpiry: number | null;
      graceEndsAt: string | null;
      readOnlyEndsAt: string | null;
      nextQuotaReset: string | null;
      cancellationReason: string | null;
      // Uso vs. límites de usuarios/prospectos del plan comercial (null sin plan).
      usage: {
        users: { used: number; limit: number | null };
        prospects: { used: number; limit: number | null };
      } | null;
      commercialPlanCode: string | null;
      candidacy: Candidacy | null;
      territoryCategory: string | null;
      // Límites EFECTIVOS de la organización (plan × categoría × perfil + complementos).
      limits: {
        users: number | null;
        prospects: number | null;
        storageGb: number | null;
        sms: number;
        email: number;
        whatsapp: number;
      };
      activeAddons: { id: string; type: AddonType; quantity: number; endsAt: string }[];
      payments?: PaymentSummary[];
    };

export const getOrganizationBilling = () => apiGet<OrganizationBilling>('/organization/billing');

// ---- Administración (PLATFORM_OPERATOR) ----------------------------------

export type PaymentMethod = 'TRANSFER' | 'PSE' | 'CARD' | 'CASH' | 'OTHER' | 'ORDER_APPLICATION';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  ORDER_APPLICATION: 'Transferencia conciliada aplicada al plan',
  TRANSFER: 'Transferencia',
  PSE: 'PSE',
  CARD: 'Tarjeta',
  CASH: 'Efectivo',
  OTHER: 'Otro',
};

export interface PaymentAmounts {
  listAmount: number;
  discountAmount: number;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface SubscriptionQuotas {
  usersLimit: number;
  prospectsLimit: number;
  storageGbLimit: number;
  whatsappLimit: number;
  smsLimit: number;
  emailLimit: number;
  aiBudgetCop: number;
  supportHours: number;
}

export interface PaymentQuote {
  vatRate: number;
  termMonths: number;
  commercialPlan: { code: string; name: string } | null;
  candidacy: Candidacy | null;
  // Catálogo territorial: territorio, categoría CGN, factor y cupos resultantes.
  territory: { code: string; name: string; level: TerritorialLevel; category: string } | null;
  category: string | null;
  capacityFactor: number | null;
  monthlyPrice: number | null;
  quotas: SubscriptionQuotas | null;
  coupon: { code: string; discountPercent: number } | null;
  amounts: PaymentAmounts;
  commission: {
    salesRep: { id: string; name: string };
    origin: CommissionOrigin;
    ratePercent: number;
    totalAmount: number;
    installments: { sequence: 1 | 2; amount: number; dueDate: string }[];
  } | null;
}

export type Candidacy = 'ACTIVO' | 'ASPIRANTE';
export type TerritorialLevel = 'MUNICIPAL' | 'DEPARTMENT';
export type TerritorialScope = 'NONE' | 'MUNICIPAL' | 'DEPARTMENT' | 'CHAMBER' | 'NATIONAL';

// A quién se atribuye la venta: fija el % de comisión.
export type CommissionOrigin = 'RENEWAL' | 'COMPANY' | 'SALES_REP';
export const COMMISSION_ORIGIN_LABEL: Record<CommissionOrigin, string> = {
  SALES_REP: 'Prospección y cierre del comercial (15 %)',
  COMPANY: 'Oportunidad de la empresa (12 %)',
  RENEWAL: 'Renovación gestionada (10 %)',
};

// Qué territorio pide cada plan para fijar su tarifa.
export const SCOPE_TERRITORY_LABEL: Record<TerritorialScope, string | null> = {
  NONE: null,
  MUNICIPAL: 'Municipio o distrito',
  DEPARTMENT: 'Departamento',
  CHAMBER: 'Departamento (o Bogotá D.C.)',
  NATIONAL: null,
};

export interface QuoteInput {
  termMonths: 3 | 6 | 12;
  // Con plan comercial el valor lo calcula el servidor desde la tarifa de la
  // categoría territorial; `listAmount` solo para ventas fuera de catálogo.
  commercialPlanCode?: string;
  candidacy?: Candidacy;
  // Código DIVIPOLA; si no viene, el servidor usa el de la organización.
  territoryCode?: string;
  listAmount?: number;
  couponCode?: string;
  salesRepId?: string;
  commissionOrigin?: CommissionOrigin;
}

export interface RegisterPaymentInput extends QuoteInput {
  planCode?: string;
  method: PaymentMethod;
  reference?: string;
  invoiceNumber?: string;
  paidAt?: string;
  notes?: string;
}

export const quotePayment = (organizationId: string, input: QuoteInput) =>
  apiPost<PaymentQuote>(`/platform/billing/organizations/${organizationId}/quote`, input);

// ---- Complementos (recarga de SMS, usuario extra, 10 GB, horas) ----------

export type AddonType = 'SMS_PACK' | 'EXTRA_USER' | 'EXTRA_STORAGE' | 'SUPPORT_HOURS';

export const ADDON_LABEL: Record<AddonType, string> = {
  SMS_PACK: 'Recarga de 1.000 SMS (30 días)',
  EXTRA_USER: 'Usuario adicional (por mes)',
  EXTRA_STORAGE: '10 GB adicionales (por mes)',
  SUPPORT_HOURS: 'Horas de acompañamiento',
};

// Los mensuales se cobran por los meses que le quedan al contrato.
export const ADDON_IS_MONTHLY: Record<AddonType, boolean> = {
  SMS_PACK: false,
  EXTRA_USER: true,
  EXTRA_STORAGE: true,
  SUPPORT_HOURS: false,
};

export interface AddonInput {
  type: AddonType;
  quantity: number;
  months?: number;
  salesRepId?: string;
  commissionOrigin?: CommissionOrigin;
}

export interface AddonQuote {
  type: AddonType;
  label: string;
  quantity: number;
  months: number;
  unitPrice: number;
  amounts: PaymentAmounts;
  commission: PaymentQuote['commission'];
}

export const quoteAddon = (organizationId: string, input: AddonInput) =>
  apiPost<AddonQuote>(`/platform/billing/organizations/${organizationId}/addons/quote`, input);

export const registerAddon = (
  organizationId: string,
  input: AddonInput & {
    method: PaymentMethod;
    reference?: string;
    invoiceNumber?: string;
    paidAt?: string;
    notes?: string;
  },
) => apiPost<unknown>(`/platform/billing/organizations/${organizationId}/addons`, input);

// ---- Territorios (categoría CGN por código DIVIPOLA) ----------------------

export interface TerritoryOption {
  code: string;
  name: string;
  level: TerritorialLevel;
  departmentName: string | null;
  category: string | null;
  quotable: boolean;
  issue: string | null;
}

export const searchTerritories = (level: TerritorialLevel | undefined, q: string) =>
  apiGet<TerritoryOption[]>(
    `/platform/billing/territories?${new URLSearchParams({ ...(level ? { level } : {}), q }).toString()}`,
  );

export const registerPayment = (organizationId: string, input: RegisterPaymentInput) =>
  apiPost<unknown>(`/platform/billing/organizations/${organizationId}/payments`, input);

export const listOrganizationPayments = (organizationId: string) =>
  apiGet<PaymentSummary[]>(`/platform/billing/organizations/${encodeURIComponent(organizationId)}/payments`);

export const listPayments = (take = 100) =>
  apiGet<PaymentSummary[]>(`/platform/billing/payments?take=${take}`);

export const voidPayment = (paymentId: string, reason: string) =>
  apiPost<unknown>(`/platform/billing/payments/${paymentId}/void`, { reason });

export const setSubscriptionPeriod = (
  organizationId: string,
  input: { termMonths?: 3 | 6 | 12; periodEnd?: string; reason: string },
) => apiPost<unknown>(`/platform/billing/organizations/${organizationId}/period`, input);

export const cancelSubscription = (organizationId: string, reason: string) =>
  apiPost<unknown>(`/platform/billing/organizations/${organizationId}/cancel`, { reason });

export const reactivateSubscription = (organizationId: string, periodEnd?: string) =>
  apiPost<unknown>(`/platform/billing/organizations/${organizationId}/reactivate`, { periodEnd });

export type CouponRule = 'ANY' | 'FIRST_SUBSCRIPTION' | 'EARLY_RENEWAL';

export const COUPON_RULE_LABEL: Record<CouponRule, string> = {
  ANY: 'Cualquier contrato de 3 meses',
  FIRST_SUBSCRIPTION: 'Solo la primera suscripción',
  EARLY_RENEWAL: 'Solo renovación antes de vencer',
};

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number;
  rule: CouponRule;
  maxRedemptions: number | null;
  redemptionCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
}

export const listCoupons = () => apiGet<Coupon[]>('/platform/billing/coupons');
export const createCoupon = (input: {
  code: string;
  description?: string;
  discountPercent: number;
  rule?: CouponRule;
  maxRedemptions?: number;
  validUntil?: string;
}) => apiPost<Coupon>('/platform/billing/coupons', input);
export const updateCoupon = (id: string, input: { isActive?: boolean }) =>
  apiPatch<Coupon>(`/platform/billing/coupons/${id}`, input);

export interface SalesRep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  isActive: boolean;
}

export const listSalesReps = () => apiGet<SalesRep[]>('/platform/billing/sales-reps');
export const createSalesRep = (input: { name: string; email?: string; phone?: string; document?: string }) =>
  apiPost<SalesRep>('/platform/billing/sales-reps', input);
export const updateSalesRep = (id: string, input: { isActive?: boolean }) =>
  apiPatch<SalesRep>(`/platform/billing/sales-reps/${id}`, input);

export type InstallmentStatus = 'PENDING' | 'PAYABLE' | 'PAID' | 'CANCELLED';

export interface CommissionInstallmentRow {
  installmentId: string;
  sequence: number;
  amount: number;
  dueDate: string;
  status: InstallmentStatus;
  paidAt: string | null;
  paidReference: string | null;
  salesRep: { id: string; name: string };
  origin: CommissionOrigin;
  ratePercent: number;
  organizationName: string;
  paymentId: string;
  termMonths: number;
  netAmount: number;
}

export const listCommissions = (status?: InstallmentStatus) =>
  apiGet<CommissionInstallmentRow[]>(
    `/platform/billing/commissions${status ? `?status=${status}` : ''}`,
  );
export const payCommissionInstallment = (id: string, reference: string) =>
  apiPost<unknown>(`/platform/billing/commission-installments/${id}/pay`, { reference });

/** Descarga el ZIP de datos de una organización (el token viaja por el interceptor de axios). */
export async function downloadOrganizationExport(organizationId: string, organizationName: string) {
  const response = await api.get(`/platform/billing/organizations/${organizationId}/export`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `exportacion-${organizationName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface PasswordResetLink {
  email: string;
  link: string;
  expiresAt: string;
}

export const createPasswordResetLink = (organizationId: string, email: string) =>
  apiPost<PasswordResetLink>(`/platform/organizations/${organizationId}/password-reset-link`, { email });

// ---- Documentos legales --------------------------------------------------

export type LegalDocumentType = 'TERMS' | 'DATA_PROCESSING' | 'PLATFORM_PRIVACY';

export const LEGAL_TYPE_LABEL: Record<LegalDocumentType, string> = {
  TERMS: 'Términos y condiciones',
  DATA_PROCESSING: 'Acuerdo de encargado del tratamiento',
  PLATFORM_PRIVACY: 'Política de privacidad',
};

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  publishedAt: string | null;
}

export interface LegalDocumentAdmin extends LegalDocument {
  isCurrent: boolean;
  createdAt: string;
  acceptanceCount: number;
}

export const listPendingLegal = () => apiGet<LegalDocument[]>('/legal/pending');
export const listCurrentLegal = () => apiGet<LegalDocument[]>('/legal/current');
export const acceptLegal = (documentIds: string[]) =>
  apiPost<{ accepted: number; pending: LegalDocument[] }>('/legal/accept', { documentIds });

export const listLegalDocuments = () => apiGet<LegalDocumentAdmin[]>('/platform/legal/documents');
export const createLegalDraft = (input: {
  type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
}) => apiPost<LegalDocumentAdmin>('/platform/legal/documents', input);
export const updateLegalDraft = (id: string, input: { title: string; content: string }) =>
  apiPatch<LegalDocumentAdmin>(`/platform/legal/documents/${id}`, input);
export const deleteLegalDraft = (id: string) => apiDelete<unknown>(`/platform/legal/documents/${id}`);
export const publishLegalDocument = (id: string) =>
  apiPost<LegalDocumentAdmin>(`/platform/legal/documents/${id}/publish`);

// ---- Recuperación de contraseña (públicas) --------------------------------

export const forgotPassword = (email: string) =>
  apiPost<{ message: string }>('/auth/forgot-password', { email });
export const resetPassword = (token: string, password: string) =>
  apiPost<{ message: string }>('/auth/reset-password', { token, password });
export const logoutAllSessions = () => apiPost<{ message: string }>('/auth/logout-all');

// ---- Catálogo comercial por cargo (Fase 4) ---------------------------------

export interface CommercialPlanRate {
  id: string;
  category: string;
  monthlyPrice: number;
  capacityFactor: number;
}

// Catálogo territorial (docs/comercial): cupos BASE (factor 1, activo) y
// tarifa mensual por categoría territorial.
export interface CommercialPlanAdmin {
  code: string;
  name: string;
  description: string | null;
  officeType: string | null;
  scope: TerritorialScope;
  order: number;
  basePlanCode: string;
  usersLimit: number;
  prospectsLimit: number;
  storageGb: number;
  whatsappLimit: number;
  smsLimit: number;
  emailLimit: number;
  aiBudgetCop: number;
  supportHours: number;
  isActive: boolean;
  isPublic: boolean;
  rates: CommercialPlanRate[];
}

export type CommercialPlanUpdate = Partial<
  Pick<
    CommercialPlanAdmin,
    | 'name'
    | 'description'
    | 'usersLimit'
    | 'prospectsLimit'
    | 'storageGb'
    | 'smsLimit'
    | 'emailLimit'
    | 'aiBudgetCop'
    | 'supportHours'
    | 'isActive'
    | 'isPublic'
  >
>;

export const listCommercialPlans = () =>
  apiGet<CommercialPlanAdmin[]>('/platform/billing/commercial-plans');
export const updateCommercialPlan = (code: string, input: CommercialPlanUpdate) =>
  apiPatch<CommercialPlanAdmin>(`/platform/billing/commercial-plans/${code}`, input);
export const updateCommercialPlanRate = (
  code: string,
  category: string,
  input: { monthlyPrice?: number; capacityFactor?: number },
) =>
  apiPatch<CommercialPlanRate>(
    `/platform/billing/commercial-plans/${code}/rates/${encodeURIComponent(category)}`,
    input,
  );

// ---- Interesados (Fase 4) ---------------------------------------------------

export type SalesLeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';

export const LEAD_STATUS_LABEL: Record<SalesLeadStatus, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  QUALIFIED: 'Calificado',
  WON: 'Ganado',
  LOST: 'Perdido',
};

export interface SalesLead {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  officeType: string | null;
  candidacy: Candidacy | null;
  territory: string | null;
  message: string | null;
  status: SalesLeadStatus;
  notes: string | null;
  source: string | null;
  createdAt: string;
  commercialPlan: { code: string; name: string } | null;
  salesRep: { id: string; name: string } | null;
}

export const listLeads = (status?: SalesLeadStatus) =>
  apiGet<SalesLead[]>(`/platform/billing/leads${status ? `?status=${status}` : ''}`);
export const updateLead = (
  id: string,
  input: { status?: SalesLeadStatus; salesRepId?: string | null; notes?: string },
) => apiPatch<SalesLead>(`/platform/billing/leads/${id}`, input);
