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
  listCampaignExpenses,
  createCampaignExpense,
  getCampaignFinanceSummary,
  downloadCampaignContributionsCsv,
  extractErrorMessage,
  type CampaignFinanceSettings,
  type CampaignContribution,
  type CampaignExpense,
  type CampaignFinanceSummary,
  type CampaignContributionSourceType,
} from '@/lib/api/campaign-finance';

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
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary tracking-tight">Finanzas de Campaña</h1>
            <p className="text-slate-500 text-sm">
              Rastreo interno de aportantes y gastos — Ley 1475 de 2011. No reemplaza Cuentas Claras.
            </p>
          </div>
        </div>
        <SettingsDialog settings={settings} onUpdated={load} />
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
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aportantes</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar CSV
              </Button>
              <NewContributionDialog onCreated={load} />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">Sin aportantes todavía.</TableCell>
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
                      <TableCell className="text-xs text-slate-400">{new Date(c.registeredAt).toLocaleDateString('es-CO')}</TableCell>
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
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gastos</p>
            <NewExpenseDialog onCreated={load} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">Sin gastos todavía.</TableCell>
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
                      <TableCell className="text-xs text-slate-400">{new Date(e.expenseDate).toLocaleDateString('es-CO')}</TableCell>
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
            <Label>Tope real (COP)</Label>
            <Input type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fuente (obligatorio)</Label>
            <Input
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

function NewContributionDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contributorName: '', contributorDocument: '', address: '', phone: '',
    incomeName: '', description: '', amount: '', sourceType: 'TERCERO' as CampaignContributionSourceType,
    registeredAt: new Date().toISOString().slice(0, 10),
  });

  const resetForm = () => setForm({
    contributorName: '', contributorDocument: '', address: '', phone: '',
    incomeName: '', description: '', amount: '', sourceType: 'TERCERO',
    registeredAt: new Date().toISOString().slice(0, 10),
  });

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!form.contributorName.trim() || !form.incomeName.trim() || !form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Completa nombre del aportante, nombre del ingreso, descripción y un valor real.');
      return;
    }
    setSaving(true);
    try {
      await createCampaignContribution({
        contributorName: form.contributorName.trim(),
        contributorDocument: form.contributorDocument.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        incomeName: form.incomeName.trim(),
        description: form.description.trim(),
        amount,
        sourceType: form.sourceType,
        registeredAt: form.registeredAt,
      });
      toast.success('Aporte registrado');
      resetForm();
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo registrar el aporte');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar aporte</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar aporte</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre del aportante</Label>
              <Input value={form.contributorName} onChange={(e) => setForm((f) => ({ ...f, contributorName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Documento</Label>
              <Input value={form.contributorDocument} onChange={(e) => setForm((f) => ({ ...f, contributorDocument: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre del ingreso</Label>
            <Input value={form.incomeName} onChange={(e) => setForm((f) => ({ ...f, incomeName: e.target.value }))} placeholder="Ej: Donación en efectivo" />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (COP)</Label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha del registro</Label>
              <Input type="date" value={form.registeredAt} onChange={(e) => setForm((f) => ({ ...f, registeredAt: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <Select value={form.sourceType} onValueChange={(v) => setForm((f) => ({ ...f, sourceType: v as CampaignContributionSourceType }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewExpenseDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: '', providerName: '', providerDocument: '', description: '', amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  const resetForm = () => setForm({
    category: '', providerName: '', providerDocument: '', description: '', amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!form.category.trim() || !form.providerName.trim() || !form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Completa categoría, proveedor, descripción y un valor real.');
      return;
    }
    setSaving(true);
    try {
      await createCampaignExpense({
        category: form.category.trim(),
        providerName: form.providerName.trim(),
        providerDocument: form.providerDocument.trim() || undefined,
        description: form.description.trim(),
        amount,
        expenseDate: form.expenseDate,
      });
      toast.success('Gasto registrado');
      resetForm();
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo registrar el gasto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar gasto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ej: Publicidad" />
            </div>
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Input value={form.providerName} onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Documento del proveedor</Label>
            <Input value={form.providerDocument} onChange={(e) => setForm((f) => ({ ...f, providerDocument: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (COP)</Label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha del gasto</Label>
              <Input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
