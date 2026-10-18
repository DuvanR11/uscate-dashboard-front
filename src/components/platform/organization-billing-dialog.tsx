'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Ban, CreditCard, Download, KeyRound, Loader2, PackagePlus, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlatformAccess, usePlatformCapability } from './access-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { extractErrorMessage, type PlatformOrganization, type PlatformPlan } from '@/lib/api/platform';
import { CATEGORY_LABEL } from '@/components/billing/territory-picker';
import {
  ADDON_IS_MONTHLY,
  ADDON_LABEL,
  COMMISSION_ORIGIN_LABEL,
  PAYMENT_METHOD_LABEL,
  SUBSCRIPTION_STATE_LABEL,
  cancelSubscription,
  createPasswordResetLink,
  downloadOrganizationExport,
  listPayments,
  listSalesReps,
  quoteAddon,
  reactivateSubscription,
  registerAddon,
  setSubscriptionPeriod,
  voidPayment,
  type AddonQuote,
  type AddonType,
  type CommissionOrigin,
  type PaymentMethod,
  type PaymentSummary,
  type SalesRep,
} from '@/lib/api/billing';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { promptDialog } from '@/components/ui/prompt-dialog';

export const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const STATE_BADGE_CLASS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  GRACE: 'bg-amber-100 text-amber-800',
  READ_ONLY: 'bg-orange-100 text-orange-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
};

const TERMS = [3, 6, 12] as const;

const formatNumber = (value: number) => new Intl.NumberFormat('es-CO').format(value);

// Complementos: qué cupo amplía cada uno, en palabras del operador.
const ADDON_EFFECT: Record<AddonType, (quantity: number) => string> = {
  SMS_PACK: (q) => `+${formatNumber(q * 1000)} SMS durante 30 días`,
  EXTRA_USER: (q) => `+${q} usuario${q === 1 ? '' : 's'} del equipo`,
  EXTRA_STORAGE: (q) => `+${q * 10} GB de almacenamiento`,
  SUPPORT_HOURS: (q) => `${q} hora${q === 1 ? '' : 's'} de acompañamiento`,
  GOVERNMENT_PLAN: () => 'Activa el Plan de gobierno para el equipo',
};

/**
 * Cobros de UNA organización (Fase 1 "Poder cobrar"; catálogo territorial
 * 2026-09-29): registrar pago con cotización previa según la categoría del
 * territorio, complementos, vigencia sin pago (cortesía), cancelar/reactivar,
 * anular pagos, exportar los datos del cliente y generar un enlace de
 * recuperación de contraseña. Todo el cálculo (IVA, cupón, comisión) lo
 * hace el backend; acá solo se captura y se muestra la cotización.
 */
export function OrganizationBillingDialog({
  organization,
  onUpdated,
}: {
  organization: PlatformOrganization;
  /** Ya no se usa aquí (el pago del plan va por la orden de cobro); se conserva por compatibilidad. */
  plans?: PlatformPlan[];
  onUpdated: () => void;
}) {
  const access = usePlatformAccess();
  const canPay = usePlatformCapability('PAYMENT_CONFIRM');
  const canVoid = usePlatformCapability('PAYMENT_VOID');
  const canCancel = usePlatformCapability('SUBSCRIPTION_CANCEL');
  const canReset = usePlatformCapability('PLATFORM_CONFIG');
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const [salesRepId, setSalesRepId] = useState('__none__');
  const [commissionOrigin, setCommissionOrigin] = useState<CommissionOrigin>('SALES_REP');
  const [method, setMethod] = useState<PaymentMethod>('TRANSFER');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Complementos (recarga de SMS, usuario extra, 10 GB, horas).
  const [addonType, setAddonType] = useState<AddonType>('SMS_PACK');
  const [addonQuantity, setAddonQuantity] = useState('1');
  const [addonReference, setAddonReference] = useState('');
  const [addonQuote, setAddonQuote] = useState<AddonQuote | null>(null);
  const [addonQuoteError, setAddonQuoteError] = useState<string | null>(null);

  const [courtesyTerm, setCourtesyTerm] = useState<3 | 6 | 12>(3);
  const [courtesyReason, setCourtesyReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLink, setResetLink] = useState<string | null>(null);

  const lifecycle = organization.lifecycle;

  const loadData = useCallback(async () => {
    try {
      const [paymentList, reps] = await Promise.all([listPayments(500), listSalesReps()]);
      setPayments(paymentList.filter((p) => p.organization?.id === organization.id));
      setSalesReps(reps.filter((r) => r.isActive));
    } catch {
      toast.error('No se pudo cargar el historial de cobros');
    }
  }, [organization.id]);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  // Cotización del complemento.
  useEffect(() => {
    const quantity = Number(addonQuantity);
    if (!open || !organization.commercialPlan || !Number.isInteger(quantity) || quantity < 1) {
      setAddonQuote(null);
      setAddonQuoteError(null);
      return;
    }
    const timer = setTimeout(() => {
      quoteAddon(organization.id, {
        type: addonType,
        quantity,
        salesRepId: salesRepId !== '__none__' ? salesRepId : undefined,
        commissionOrigin,
      })
        .then((q) => {
          setAddonQuote(q);
          setAddonQuoteError(null);
        })
        .catch((error) => {
          setAddonQuote(null);
          setAddonQuoteError(extractErrorMessage(error) ?? 'No se pudo cotizar');
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [open, organization.id, organization.commercialPlan, addonType, addonQuantity, salesRepId, commissionOrigin]);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      await loadData();
      onUpdated();
    } catch (error) {
      toast.error('No se pudo completar la acción', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handleRegisterAddon = () =>
    run(
      'addon',
      () =>
        registerAddon(organization.id, {
          type: addonType,
          quantity: Number(addonQuantity),
          salesRepId: salesRepId !== '__none__' ? salesRepId : undefined,
          commissionOrigin,
          method,
          reference: addonReference.trim() || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
        }),
      'Complemento registrado: el cupo ya está ampliado',
    ).then(() => setAddonReference(''));

  const handleVoid = async (payment: PaymentSummary) => {
    const reason = await promptDialog({
      title: `Anular el pago de ${formatCop(payment.totalAmount)}`,
      description: 'El motivo queda en el registro de auditoría. Anular un pago no se puede deshacer.',
      label: 'Motivo de la anulación',
      minLength: 5,
      maxLength: 300,
      multiline: true,
      destructive: true,
      confirmLabel: 'Anular pago',
      cancelLabel: 'No, volver',
    });
    if (reason === null) return;
    run(`void-${payment.id}`, () => voidPayment(payment.id, reason), 'Pago anulado');
  };

  const handleExport = async () => {
    setBusy('export');
    try {
      await downloadOrganizationExport(organization.id, organization.name);
      toast.success('Exportación descargada');
    } catch (error) {
      toast.error('No se pudo exportar', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handleResetLink = async () => {
    setBusy('reset');
    try {
      const result = await createPasswordResetLink(organization.id, resetEmail.trim());
      setResetLink(result.link);
    } catch (error) {
      toast.error('No se pudo generar el enlace', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const cancelled = lifecycle?.state === 'CANCELLED';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Cobros
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobros — {organization.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {access?.enabled && <p className="rounded-lg border p-3 text-muted-foreground">Las cortesías, la reactivación y las exportaciones completas requieren sus flujos autorizados. Las excepciones se solicitan desde la ficha y su autorización no ejecuta beneficios.</p>}
          {/* Estado */}
          <section className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
            {lifecycle ? (
              <>
                <Badge className={STATE_BADGE_CLASS[lifecycle.state]}>{SUBSCRIPTION_STATE_LABEL[lifecycle.state]}</Badge>
                <span>
                  {lifecycle.expiresAt
                    ? `Vence el ${formatDate(lifecycle.expiresAt)}${
                        lifecycle.daysToExpiry !== null
                          ? ` (${lifecycle.daysToExpiry >= 0 ? `en ${lifecycle.daysToExpiry} días` : `hace ${-lifecycle.daysToExpiry} días`})`
                          : ''
                      }`
                    : 'Sin vencimiento (cuenta interna / anterior a la facturación)'}
                </span>
                {lifecycle.termMonths && <span className="text-slate-500">· término {lifecycle.termMonths} meses</span>}
              </>
            ) : (
              <span className="text-slate-500">Sin suscripción</span>
            )}
          </section>

          {/* Recorrido de alta, Fase 1B (decisión del usuario, 2026-10-18): el
              único camino de cobro es cotización → orden de cobro → pago. El
              "Registrar pago" suelto se retiró: no conocía la orden, proponía
              12 meses y permitía cobrar dos veces. */}
          <section className="space-y-3">
            <h3 className="font-semibold text-slate-800">Pagos del plan</h3>
            <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              El pago del plan se registra en la <strong>orden de cobro</strong> de la cotización aceptada: en la ficha de la
              organización, pestaña <strong>Cobros</strong> → «Órdenes de cobro y transferencias» → «Registrar transferencia
              recibida» (si el cliente envió el comprobante por fuera) y luego «Aplicar al plan».
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/platform/organizations/${organization.id}`}>Ir a la ficha de la organización</Link>
            </Button>
            <p className="text-xs text-slate-500">Datos del cobro para los complementos:</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="bill-7">Comercial</Label>
                <Select value={salesRepId} onValueChange={setSalesRepId}>
                  <SelectTrigger id="bill-7"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin comercial</SelectItem>
                    {salesReps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="bill-8">Origen de la venta</Label>
                <Select
                  value={commissionOrigin}
                  onValueChange={(v) => setCommissionOrigin(v as CommissionOrigin)}
                  disabled={salesRepId === '__none__'}
                >
                  <SelectTrigger id="bill-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMMISSION_ORIGIN_LABEL).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bill-9">Método</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger id="bill-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABEL).filter(([k]) => k !== 'ORDER_APPLICATION').map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bill-11">Nº de factura (DIAN)</Label>
                <Input id="bill-11" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Emitida fuera del sistema" />
              </div>
            </div>
          </section>

          {/* Complementos */}
          <section className="space-y-3">
            <h3 className="font-semibold text-slate-800">Complementos</h3>
            {!organization.commercialPlan ? (
              <p className="text-xs text-slate-500">
                Registra primero el pago del plan: los complementos amplían los cupos de ese plan.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  Amplían recursos o personal de este cliente sin cambiarle el plan. Sin cupones. Usa el método, la
                  factura y el comercial de arriba.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="bill-14">Complemento</Label>
                    <Select
                      value={addonType}
                      onValueChange={(v) => {
                        setAddonType(v as AddonType);
                        // Un complemento de módulo se vende de a uno.
                        if (v === 'GOVERNMENT_PLAN') setAddonQuantity('1');
                      }}
                    >
                      <SelectTrigger id="bill-14"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ADDON_LABEL).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bill-15">{addonType === 'SUPPORT_HOURS' ? 'Horas' : 'Cantidad'}</Label>
                    <Input id="bill-15" type="number" min={1} max={1000} value={addonQuantity} onChange={(e) => setAddonQuantity(e.target.value)} disabled={addonType === 'GOVERNMENT_PLAN'} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="bill-16">Nº de comprobante</Label>
                    <Input id="bill-16" value={addonReference} onChange={(e) => setAddonReference(e.target.value)} placeholder={method === 'TRANSFER' ? 'Referencia bancaria verificada (obligatoria)' : 'Transferencia / transacción'} />
                  </div>
                </div>
                {addonQuoteError && <p className="text-xs font-medium text-red-600">{addonQuoteError}</p>}
                {addonQuote && (
                  <p className="rounded-lg border bg-white p-3 text-xs">
                    {ADDON_EFFECT[addonQuote.type](addonQuote.quantity)}
                    {ADDON_IS_MONTHLY[addonQuote.type] ? ` por ${addonQuote.months} mes${addonQuote.months === 1 ? '' : 'es'}` : ''} ·{' '}
                    base {formatCop(addonQuote.amounts.netAmount)} + IVA {formatCop(addonQuote.amounts.vatAmount)} ={' '}
                    <strong>{formatCop(addonQuote.amounts.totalAmount)}</strong>
                    {addonQuote.commission
                      ? ` · comisión ${addonQuote.commission.ratePercent}% = ${formatCop(addonQuote.commission.totalAmount)}`
                      : ''}
                  </p>
                )}
                <Button variant="outline" onClick={handleRegisterAddon} disabled={!canPay || !addonQuote || busy === 'addon' || (method === 'TRANSFER' && !addonReference.trim())}>
                  {busy === 'addon' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                  Registrar complemento
                </Button>
              </>
            )}
          </section>

          {/* Historial */}
          <section className="space-y-2">
            <h3 className="font-semibold text-slate-800">Pagos de esta organización</h3>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-400">Sin pagos registrados.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id} className={p.status === 'VOIDED' ? 'opacity-50' : ''}>
                        <TableCell>{formatDate(p.paidAt)}</TableCell>
                        <TableCell>
                          {p.kind === 'ADDON' && p.addonType
                            ? `${ADDON_LABEL[p.addonType].replace(/ \(.*\)$/, '')} ×${p.addonQuantity}`
                            : `${p.termMonths} m${p.territoryCategory ? ` · ${CATEGORY_LABEL(p.territoryCategory)}` : ''}${p.couponCode ? ` · ${p.couponCode}` : ''}`}
                        </TableCell>
                        <TableCell>{formatCop(p.totalAmount)}</TableCell>
                        <TableCell>{PAYMENT_METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''}</TableCell>
                        <TableCell>{formatDate(p.periodStart)} → {formatDate(p.periodEnd)}</TableCell>
                        <TableCell>
                          {p.status === 'VOIDED' ? (
                            <Badge variant="outline">Anulado</Badge>
                          ) : (
                            <Button size="sm" variant="ghost" disabled={!canVoid || p.method === 'ORDER_APPLICATION' || busy === `void-${p.id}`} onClick={() => handleVoid(p)}>
                              Anular
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Vigencia sin pago */}
          <section className="space-y-2">
            <h3 className="font-semibold text-slate-800">Dar vigencia sin pago (cortesía, cuenta interna)</h3>
            <div className="flex flex-wrap items-end gap-2">
              <Select value={String(courtesyTerm)} onValueChange={(v) => setCourtesyTerm(Number(v) as 3 | 6 | 12)}>
                <SelectTrigger className="w-[120px]" aria-label="Meses de vigencia de cortesía"><SelectValue /></SelectTrigger>
                <SelectContent>{TERMS.map((t) => <SelectItem key={t} value={String(t)}>{t} meses</SelectItem>)}</SelectContent>
              </Select>
              <Input className="min-w-[220px] flex-1" aria-label="Motivo de la cortesía" value={courtesyReason} onChange={(e) => setCourtesyReason(e.target.value)} placeholder="Motivo (obligatorio, queda auditado)" />
              <Button
                variant="outline"
                disabled={access?.enabled || courtesyReason.trim().length < 5 || busy === 'period'}
                onClick={() =>
                  run('period', () => setSubscriptionPeriod(organization.id, { termMonths: courtesyTerm, reason: courtesyReason.trim() }), 'Vigencia actualizada').then(() => setCourtesyReason(''))
                }
              >
                Aplicar
              </Button>
            </div>
          </section>

          {/* Cancelar / reactivar */}
          <section className="space-y-2">
            <h3 className="font-semibold text-slate-800">{cancelled ? 'Reactivar suscripción' : 'Cancelar suscripción'}</h3>
            {cancelled ? (
              <Button variant="outline" disabled={access?.enabled || busy === 'reactivate'} onClick={() => run('reactivate', () => reactivateSubscription(organization.id), 'Suscripción reactivada')}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reactivar
              </Button>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <Input className="min-w-[220px] flex-1" aria-label="Motivo de la cancelación" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motivo de la cancelación" />
                <Button
                  variant="destructive"
                  disabled={!canCancel || cancelReason.trim().length < 5 || busy === 'cancel'}
                  onClick={async () => {
                    if (!await confirmDialog(`¿Cancelar la suscripción de ${organization.name}? Perderán el acceso de inmediato y se cancelan las comisiones pendientes.`)) return;
                    run('cancel', () => cancelSubscription(organization.id, cancelReason.trim()), 'Suscripción cancelada').then(() => setCancelReason(''));
                  }}
                >
                  <Ban className="mr-2 h-4 w-4" /> Cancelar
                </Button>
              </div>
            )}
          </section>

          {/* Datos y acceso */}
          <section className="space-y-3">
            <h3 className="font-semibold text-slate-800">Datos y acceso del cliente</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={access?.enabled || busy === 'export'} onClick={handleExport}>
                {busy === 'export' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Exportar todos sus datos (ZIP)
              </Button>
              <span className="text-xs text-slate-400">Un archivo .jsonl por tabla. Queda auditado.</span>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Input className="min-w-[220px] flex-1" type="email" aria-label="Correo de quien olvidó su contraseña" value={resetEmail} onChange={(e) => { setResetEmail(e.target.value); setResetLink(null); }} placeholder="Correo del usuario que olvidó su contraseña" />
              <Button variant="outline" disabled={!canReset || !resetEmail.includes('@') || busy === 'reset'} onClick={handleResetLink}>
                <KeyRound className="mr-2 h-4 w-4" /> Generar enlace
              </Button>
            </div>
            {resetLink && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs">
                <p className="mb-1 font-medium text-amber-900">Enlace de un solo uso (vale 1 hora). Entrégalo solo a esa persona:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all">{resetLink}</code>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(resetLink); toast.success('Enlace copiado'); }}>
                    Copiar
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
