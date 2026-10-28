'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Wallet,
  Loader2,
  Settings2,
  Plus,
  Download,
  AlertTriangle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getCampaignFinanceSettings,
  updateCampaignFinanceSettings,
  listCampaignContributions,
  createCampaignContribution,
  updateCampaignContribution,
  deleteCampaignContribution,
  listCampaignExpenses,
  createCampaignExpense,
  updateCampaignExpense,
  deleteCampaignExpense,
  getCampaignFinanceSummary,
  downloadCampaignContributionsCsv,
  extractErrorMessage,
  type CampaignFinanceSettings,
  type CampaignContribution,
  type CampaignExpense,
  type CampaignFinanceSummary,
  type CampaignContributionSourceType,
} from '@/lib/api/campaign-finance';
import { usePermission } from '@/hooks/use-permission';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { calendarDayISO, formatCalendarDay, todayISO } from '@/lib/dates';

/**
 * `/campaigns/finance` — rastreador interno de aportantes/gastos (Ley
 * 1475 de 2011). NUNCA reemplaza Cuentas Claras (el canal oficial del
 * CNE, verificado real contra su cartilla oficial: 100% diligenciamiento
 * manual, sin API/Excel/CSV para los registros) — mismos campos que ese
 * aplicativo pide, para que el tesorero solo copie de acá.
 */
const SOURCE_TYPE_LABEL: Record<CampaignContributionSourceType, string> = {
  RECURSOS_PROPIOS: 'Recursos propios (exento)',
  CONYUGE_PARIENTE: 'Cónyuge/pariente (exento)',
  TERCERO: 'Tercero',
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

export default function CampaignFinancePage() {
  const [settings, setSettings] = useState<CampaignFinanceSettings | null>(null);
  const [summary, setSummary] = useState<CampaignFinanceSummary | null>(null);
  const [contributions, setContributions] = useState<CampaignContribution[]>([]);
  const [expenses, setExpenses] = useState<CampaignExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [settingsData, summaryData, contributionsData, expensesData] = await Promise.all([
        getCampaignFinanceSettings(),
        getCampaignFinanceSummary(),
        listCampaignContributions(),
        listCampaignExpenses(),
      ]);
      setSettings(settingsData);
      setSummary(summaryData);
      setContributions(contributionsData);
      setExpenses(expensesData);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Quien solo puede leer no ve los botones de registrar, corregir ni eliminar.
  const canWrite = usePermission('FINANZAS_CAMPANA', 'canWrite');
  const canDelete = usePermission('FINANZAS_CAMPANA', 'canDelete');

  const handleDeleteContribution = async (c: CampaignContribution) => {
    if (!(await confirmDialog(`¿Eliminar el aporte de ${c.contributorName} por ${formatCOP(Number(c.amount))}? Esta acción no se puede deshacer.`))) return;
    try {
      await deleteCampaignContribution(c.id);
      toast.success('Aporte eliminado');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo eliminar el aporte');
    }
  };

  const handleDeleteExpense = async (e: CampaignExpense) => {
    if (!(await confirmDialog(`¿Eliminar el gasto de ${e.providerName} por ${formatCOP(Number(e.amount))}? Esta acción no se puede deshacer.`))) return;
    try {
      await deleteCampaignExpense(e.id);
      toast.success('Gasto eliminado');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo eliminar el gasto');
    }
  };

  const handleExport = async () => {
    try {
      await downloadCampaignContributionsCsv();
    } catch {
      toast.error('No se pudo descargar el archivo.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !settings || !summary) {
    return (
      <div className="p-10 text-center">
        <Wallet className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No se pudo cargar Finanzas de Campaña</h2>
        <p className="text-slate-500">Verifica que tu cuenta tenga el permiso de Finanzas de Campaña.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-6">
      {/* Fase 4 del análisis de punta a punta (2026-10-28): en el celular el
      título se partía palabra por palabra y "Configurar tope" quedaba afuera;
      ahora el botón baja debajo del título. */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Finanzas de Campaña</h1>
            <p className="text-slate-500 text-sm">
              Rastreo interno de aportantes y gastos — Ley 1475 de 2011. No reemplaza Cuentas Claras.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <SettingsDialog settings={settings} onUpdated={load} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Recaudado" value={formatCOP(summary.totalRaised)} />
        <SummaryCard label="Gastado" value={formatCOP(summary.totalSpent)} />
        <SummaryCard
          label="Tope de campaña"
          value={summary.campaignSpendingCap != null ? formatCOP(summary.campaignSpendingCap) : 'Sin configurar'}
          sub={summary.campaignSpendingCapReference ?? undefined}
        />
        <SummaryCard
          label="% del tope usado"
          value={summary.capUsagePercentage != null ? `${summary.capUsagePercentage}%` : '—'}
          alert={summary.capUsagePercentage != null && summary.capUsagePercentage >= 80}
        />
      </div>

      {summary.exceedingContributionsCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">
            {summary.exceedingContributionsCount} aporte{summary.exceedingContributionsCount !== 1 ? 's' : ''} de tercero
            {summary.exceedingContributionsCount !== 1 ? 's' : ''} supera{summary.exceedingContributionsCount === 1 ? '' : 'n'} el 10% del tope (Ley 1475, Art. 25).
          </p>
        </div>
      )}

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aportantes</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar CSV
              </Button>
              {canWrite && <ContributionDialog onSaved={load} />}
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aportante</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Fecha</TableHead>
                  {(canWrite || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">Sin aportantes todavía.</TableCell>
                  </TableRow>
                ) : (
                  contributions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{c.contributorName}</p>
                        <p className="text-xs text-slate-400">{c.contributorDocument}</p>
                      </TableCell>
                      <TableCell className="text-sm">{c.incomeName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{SOURCE_TYPE_LABEL[c.sourceType]}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium tabular-nums">{formatCOP(Number(c.amount))}</span>
                        {c.exceedsIndividualLimit && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">Excede 10%</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">{formatCalendarDay(c.registeredAt)}</TableCell>
                      {(canWrite || canDelete) && (
                        <TableCell className="text-right whitespace-nowrap">
                          {canWrite && <ContributionDialog onSaved={load} editing={c} />}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-600"
                              aria-label={`Eliminar el aporte de ${c.contributorName}`}
                              title="Eliminar aporte"
                              onClick={() => handleDeleteContribution(c)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gastos</p>
            {canWrite && <ExpenseDialog onSaved={load} />}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Fecha</TableHead>
                  {(canWrite || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">Sin gastos todavía.</TableCell>
                  </TableRow>
                ) : (
                  expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{e.providerName}</p>
                        <p className="text-xs text-slate-400">{e.description}</p>
                      </TableCell>
                      <TableCell className="text-sm">{e.category}</TableCell>
                      <TableCell className="font-medium tabular-nums">{formatCOP(Number(e.amount))}</TableCell>
                      <TableCell className="text-xs text-slate-400">{formatCalendarDay(e.expenseDate)}</TableCell>
                      {(canWrite || canDelete) && (
                        <TableCell className="text-right whitespace-nowrap">
                          {canWrite && <ExpenseDialog onSaved={load} editing={e} />}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-600"
                              aria-label={`Eliminar el gasto de ${e.providerName}`}
                              title="Eliminar gasto"
                              onClick={() => handleDeleteExpense(e)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <Card className={`border-0 shadow-md ring-1 ${alert ? 'ring-red-200 bg-red-50/50' : 'ring-slate-100'}`}>
      <CardContent className="p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-xl font-black tabular-nums ${alert ? 'text-red-600' : 'text-primary'}`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SettingsDialog({ settings, onUpdated }: { settings: CampaignFinanceSettings; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [cap, setCap] = useState(String(settings.campaignSpendingCap ?? ''));
  const [reference, setReference] = useState(settings.campaignSpendingCapReference ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const capValue = Number(cap);
    if (!Number.isFinite(capValue) || capValue < 0) {
      toast.error('El tope debe ser un número real, cero o más.');
      return;
    }
    if (!reference.trim()) {
      toast.error('Indica de dónde sale este tope (ej. "Resolución CNE 1234 de 2027").');
      return;
    }
    setSaving(true);
    try {
      await updateCampaignFinanceSettings({ campaignSpendingCap: capValue, campaignSpendingCapReference: reference.trim() });
      toast.success('Tope de campaña actualizado');
      setOpen(false);
      onUpdated();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo actualizar el tope');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Configurar tope
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tope de gasto de campaña</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-400">
          El CNE fija este valor cada enero por resolución — nunca lo inventamos por ti. Ingresa el
          valor real vigente para tu elección.
        </p>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fin-1">Tope real (COP)</Label>
            <Input id="fin-1" type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-2">Fuente (obligatorio)</Label>
            <Input id="fin-2"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder='Ej: "Resolución CNE 1234 de 2027"'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Un solo diálogo para registrar un aporte y para corregir uno existente
// (`editing`). Antes un aporte mal digitado no se podía corregir ni eliminar.
function ContributionDialog({ onSaved, editing }: { onSaved: () => void; editing?: CampaignContribution }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialForm = () => ({
    contributorName: editing?.contributorName ?? '',
    contributorDocument: editing?.contributorDocument ?? '',
    address: editing?.address ?? '',
    phone: editing?.phone ?? '',
    incomeName: editing?.incomeName ?? '',
    description: editing?.description ?? '',
    amount: editing ? String(Number(editing.amount)) : '',
    sourceType: (editing?.sourceType ?? 'TERCERO') as CampaignContributionSourceType,
    registeredAt: editing ? calendarDayISO(editing.registeredAt) : todayISO(),
  });
  const [form, setForm] = useState(initialForm);

  const resetForm = () => setForm(initialForm());

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!form.contributorName.trim() || !form.incomeName.trim() || !form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Completa nombre del aportante, nombre del ingreso, descripción y un valor real.');
      return;
    }
    if (form.registeredAt > todayISO()) {
      toast.error('La fecha del aporte no puede ser futura.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        contributorName: form.contributorName.trim(),
        contributorDocument: form.contributorDocument.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        incomeName: form.incomeName.trim(),
        description: form.description.trim(),
        amount,
        sourceType: form.sourceType,
        registeredAt: form.registeredAt,
      };
      if (editing) await updateCampaignContribution(editing.id, input);
      else await createCampaignContribution(input);
      toast.success(editing ? 'Aporte corregido' : 'Aporte registrado');
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo guardar el aporte');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); resetForm(); }}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" aria-label={`Corregir el aporte de ${editing.contributorName}`} title="Corregir aporte">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar aporte</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Corregir aporte' : 'Registrar aporte'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fin-3">Nombre del aportante</Label>
              <Input id="fin-3" value={form.contributorName} onChange={(e) => setForm((f) => ({ ...f, contributorName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin-4">Documento</Label>
              <Input id="fin-4" value={form.contributorDocument} onChange={(e) => setForm((f) => ({ ...f, contributorDocument: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fin-5">Dirección</Label>
              <Input id="fin-5" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin-6">Teléfono</Label>
              <Input id="fin-6" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-7">Nombre del ingreso</Label>
            <Input id="fin-7" value={form.incomeName} onChange={(e) => setForm((f) => ({ ...f, incomeName: e.target.value }))} placeholder="Ej: Donación en efectivo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-8">Descripción</Label>
            <Textarea id="fin-8" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fin-9">Valor (COP)</Label>
              <Input id="fin-9" type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin-10">Fecha del registro</Label>
              <Input id="fin-10" type="date" max={todayISO()} value={form.registeredAt} onChange={(e) => setForm((f) => ({ ...f, registeredAt: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-11">Fuente</Label>
            <Select value={form.sourceType} onValueChange={(v) => setForm((f) => ({ ...f, sourceType: v as CampaignContributionSourceType }))}>
              <SelectTrigger id="fin-11" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SOURCE_TYPE_LABEL) as CampaignContributionSourceType[]).map((v) => (
                  <SelectItem key={v} value={v}>{SOURCE_TYPE_LABEL[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({ onSaved, editing }: { onSaved: () => void; editing?: CampaignExpense }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialForm = () => ({
    category: editing?.category ?? '',
    providerName: editing?.providerName ?? '',
    providerDocument: editing?.providerDocument ?? '',
    description: editing?.description ?? '',
    amount: editing ? String(Number(editing.amount)) : '',
    expenseDate: editing ? calendarDayISO(editing.expenseDate) : todayISO(),
  });
  const [form, setForm] = useState(initialForm);

  const resetForm = () => setForm(initialForm());

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!form.category.trim() || !form.providerName.trim() || !form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Completa categoría, proveedor, descripción y un valor real.');
      return;
    }
    if (form.expenseDate > todayISO()) {
      toast.error('La fecha del gasto no puede ser futura.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        category: form.category.trim(),
        providerName: form.providerName.trim(),
        providerDocument: form.providerDocument.trim() || undefined,
        description: form.description.trim(),
        amount,
        expenseDate: form.expenseDate,
      };
      if (editing) await updateCampaignExpense(editing.id, input);
      else await createCampaignExpense(input);
      toast.success(editing ? 'Gasto corregido' : 'Gasto registrado');
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo guardar el gasto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); resetForm(); }}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" aria-label={`Corregir el gasto de ${editing.providerName}`} title="Corregir gasto">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar gasto</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Corregir gasto' : 'Registrar gasto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fin-12">Categoría</Label>
              <Input id="fin-12" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ej: Publicidad" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin-13">Proveedor</Label>
              <Input id="fin-13" value={form.providerName} onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-14">Documento del proveedor</Label>
            <Input id="fin-14" value={form.providerDocument} onChange={(e) => setForm((f) => ({ ...f, providerDocument: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-15">Descripción</Label>
            <Textarea id="fin-15" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fin-16">Valor (COP)</Label>
              <Input id="fin-16" type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin-17">Fecha del gasto</Label>
              <Input id="fin-17" type="date" max={todayISO()} value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
