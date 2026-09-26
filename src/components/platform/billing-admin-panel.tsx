'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { extractErrorMessage } from '@/lib/api/platform';
import {
  LEGAL_TYPE_LABEL,
  createCoupon,
  createLegalDraft,
  createSalesRep,
  deleteLegalDraft,
  listCommissions,
  listCoupons,
  listLegalDocuments,
  listSalesReps,
  payCommissionInstallment,
  publishLegalDocument,
  updateCoupon,
  updateSalesRep,
  type CommissionInstallmentRow,
  type Coupon,
  type LegalDocumentAdmin,
  type LegalDocumentType,
  type SalesRep,
} from '@/lib/api/billing';
import { formatCop } from './organization-billing-dialog';
import { CommercialPlansTab, LeadsTab } from './commercial-tabs';

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const INSTALLMENT_LABEL: Record<string, string> = {
  PENDING: 'Pendiente (90 días)',
  PAYABLE: 'Por pagar',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
};

/**
 * Administración transversal de cobros (Fase 1 "Poder cobrar"): cupones,
 * comerciales, liquidación de comisiones y documentos legales. Los cobros de
 * cada organización viven en el diálogo "Cobros" de su fila.
 */
export function BillingAdminPanel() {
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100">
      <CardContent className="p-4">
        <Tabs defaultValue="leads">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="leads">Interesados</TabsTrigger>
            <TabsTrigger value="catalog">Planes comerciales</TabsTrigger>
            <TabsTrigger value="commissions">Comisiones</TabsTrigger>
            <TabsTrigger value="coupons">Cupones</TabsTrigger>
            <TabsTrigger value="reps">Comerciales</TabsTrigger>
            <TabsTrigger value="legal">Documentos legales</TabsTrigger>
          </TabsList>
          <TabsContent value="leads"><LeadsTab /></TabsContent>
          <TabsContent value="catalog"><CommercialPlansTab /></TabsContent>
          <TabsContent value="commissions"><CommissionsTab /></TabsContent>
          <TabsContent value="coupons"><CouponsTab /></TabsContent>
          <TabsContent value="reps"><SalesRepsTab /></TabsContent>
          <TabsContent value="legal"><LegalTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ---- Comisiones ------------------------------------------------------------

function CommissionsTab() {
  const [rows, setRows] = useState<CommissionInstallmentRow[] | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(() => {
    listCommissions()
      .then(setRows)
      .catch(() => toast.error('No se pudieron cargar las comisiones'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handlePay = async (row: CommissionInstallmentRow) => {
    const reference = window.prompt(`Comprobante del pago de ${formatCop(row.amount)} a ${row.salesRep.name}:`);
    if (!reference || reference.trim().length < 2) return;
    setPaying(row.installmentId);
    try {
      await payCommissionInstallment(row.installmentId, reference.trim());
      toast.success('Cuota marcada como pagada');
      load();
    } catch (error) {
      toast.error('No se pudo registrar el pago', { description: extractErrorMessage(error) });
    } finally {
      setPaying(null);
    }
  };

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty text="Aún no hay comisiones. Se generan al registrar un pago con comercial." />;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Cada venta genera 2 cuotas (50/50). La 2ª pasa a &quot;Por pagar&quot; a los 90 días solo si el cliente sigue activo.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comercial</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Cuota</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.installmentId}>
                <TableCell className="font-medium">{r.salesRep.name}</TableCell>
                <TableCell>{r.organizationName}<span className="block text-xs text-slate-400">{r.termMonths} m · {r.ratePercent}%</span></TableCell>
                <TableCell>{r.sequence} de 2</TableCell>
                <TableCell>{formatCop(r.amount)}</TableCell>
                <TableCell>{formatDate(r.dueDate)}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'PAYABLE' ? 'default' : 'outline'}>{INSTALLMENT_LABEL[r.status] ?? r.status}</Badge>
                  {r.paidReference && <span className="block text-xs text-slate-400">{r.paidReference}</span>}
                </TableCell>
                <TableCell>
                  {r.status === 'PAYABLE' && (
                    <Button size="sm" disabled={paying === r.installmentId} onClick={() => handlePay(r)}>
                      Marcar pagada
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---- Cupones ---------------------------------------------------------------

function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', discountPercent: '10', maxRedemptions: '', validUntil: '' });

  const load = useCallback(() => {
    listCoupons().then(setCoupons).catch(() => toast.error('No se pudieron cargar los cupones'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createCoupon({
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        discountPercent: Number(form.discountPercent),
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        validUntil: form.validUntil || undefined,
      });
      toast.success('Cupón creado');
      setOpen(false);
      setForm({ code: '', description: '', discountPercent: '10', maxRedemptions: '', validUntil: '' });
      load();
    } catch (error) {
      toast.error('No se pudo crear el cupón', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (coupon: Coupon, isActive: boolean) => {
    try {
      await updateCoupon(coupon.id, { isActive });
      load();
    } catch (error) {
      toast.error('No se pudo actualizar', { description: extractErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Máximo 50% de descuento. Un cupón por pago; no aplican al Precio Fundador.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo cupón</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo cupón</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LANZAMIENTO10" /></div>
              <div className="space-y-1"><Label>Descripción</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Descuento (%)</Label><Input type="number" min={1} max={50} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} /></div>
                <div className="space-y-1"><Label>Usos máximos</Label><Input type="number" min={1} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="Sin límite" /></div>
              </div>
              <div className="space-y-1"><Label>Vigente hasta</Label><Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button disabled={saving || form.code.trim().length < 3} onClick={handleCreate}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {!coupons ? <Loading /> : coupons.length === 0 ? <Empty text="Sin cupones todavía." /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead><TableHead>Descuento</TableHead><TableHead>Usos</TableHead><TableHead>Vigencia</TableHead><TableHead>Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><span className="font-mono font-semibold">{c.code}</span>{c.description && <span className="block text-xs text-slate-400">{c.description}</span>}</TableCell>
                  <TableCell>{c.discountPercent}%</TableCell>
                  <TableCell>{c.redemptions}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}</TableCell>
                  <TableCell>{c.validUntil ? `hasta ${formatDate(c.validUntil)}` : 'Sin fecha límite'}</TableCell>
                  <TableCell><Switch checked={c.isActive} onCheckedChange={(v) => toggle(c, v)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---- Comerciales -----------------------------------------------------------

function SalesRepsTab() {
  const [reps, setReps] = useState<SalesRep[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '' });

  const load = useCallback(() => {
    listSalesReps().then(setReps).catch(() => toast.error('No se pudieron cargar los comerciales'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createSalesRep({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        document: form.document.trim() || undefined,
      });
      toast.success('Comercial creado');
      setOpen(false);
      setForm({ name: '', email: '', phone: '', document: '' });
      load();
    } catch (error) {
      toast.error('No se pudo crear', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rep: SalesRep, isActive: boolean) => {
    try {
      await updateSalesRep(rep.id, { isActive });
      load();
    } catch (error) {
      toast.error('No se pudo actualizar', { description: extractErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Terceros a quienes se les liquida comisión (10% a 3 meses · 12% a 6 · 15% a 12). No tienen acceso al sistema.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo comercial</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo comercial</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Correo</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label>Documento</Label><Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={saving || form.name.trim().length < 2} onClick={handleCreate}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {!reps ? <Loading /> : reps.length === 0 ? <Empty text="Sin comerciales todavía." /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nombre</TableHead><TableHead>Contacto</TableHead><TableHead>Documento</TableHead><TableHead>Activo</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {reps.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.email ?? '—'}<span className="block text-xs text-slate-400">{r.phone ?? ''}</span></TableCell>
                  <TableCell>{r.document ?? '—'}</TableCell>
                  <TableCell><Switch checked={r.isActive} onCheckedChange={(v) => toggle(r, v)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---- Documentos legales ----------------------------------------------------

function LegalTab() {
  const [docs, setDocs] = useState<LegalDocumentAdmin[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<{ type: LegalDocumentType; version: string; title: string; content: string }>({
    type: 'TERMS', version: '', title: '', content: '',
  });

  const load = useCallback(() => {
    listLegalDocuments().then(setDocs).catch(() => toast.error('No se pudieron cargar los documentos'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createLegalDraft({ ...form, version: form.version.trim(), title: form.title.trim() });
      toast.success('Borrador creado');
      setOpen(false);
      load();
    } catch (error) {
      toast.error('No se pudo crear', { description: extractErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (doc: LegalDocumentAdmin) => {
    if (!window.confirm(`Publicar "${doc.title}" v${doc.version}? Será la versión vigente y todos los administradores deberán aceptarla. Un documento publicado ya no se puede editar.`)) return;
    setBusy(doc.id);
    try {
      await publishLegalDocument(doc.id);
      toast.success('Documento publicado');
      load();
    } catch (error) {
      toast.error('No se pudo publicar', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (doc: LegalDocumentAdmin) => {
    if (!window.confirm(`¿Eliminar el borrador "${doc.title}" v${doc.version}?`)) return;
    setBusy(doc.id);
    try {
      await deleteLegalDraft(doc.id);
      load();
    } catch (error) {
      toast.error('No se pudo eliminar', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Cada versión es inmutable una vez publicada. Los borradores iniciales llevan la marca &quot;BORRADOR — REVISAR CON ABOGADO&quot;:
          no los publiques sin revisión jurídica.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo borrador</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>Nuevo documento legal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LegalDocumentType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEGAL_TYPE_LABEL).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Versión</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0" /></div>
              </div>
              <div className="space-y-1"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1"><Label>Texto</Label><Textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button disabled={saving || !form.version.trim() || form.title.trim().length < 3 || form.content.length < 20} onClick={handleCreate}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar borrador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {!docs ? <Loading /> : docs.length === 0 ? (
        <Empty text="Sin documentos. Carga los borradores iniciales con scripts/seed-legal-drafts.ts o crea uno nuevo." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Documento</TableHead><TableHead>Versión</TableHead><TableHead>Estado</TableHead><TableHead>Aceptaciones</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.title}<span className="block text-xs text-slate-400">{LEGAL_TYPE_LABEL[d.type]}</span></TableCell>
                  <TableCell>{d.version}</TableCell>
                  <TableCell>
                    {d.isCurrent ? <Badge className="bg-emerald-100 text-emerald-800">Vigente</Badge>
                      : d.publishedAt ? <Badge variant="outline">Anterior</Badge>
                      : <Badge variant="secondary">Borrador</Badge>}
                  </TableCell>
                  <TableCell>{d.acceptanceCount}</TableCell>
                  <TableCell>
                    {!d.publishedAt && (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy === d.id} onClick={() => handlePublish(d)}>Publicar</Button>
                        <Button size="sm" variant="ghost" disabled={busy === d.id} onClick={() => handleDelete(d)}>Eliminar</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Loading() {
  return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{text}</p>;
}
