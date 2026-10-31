'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  extractErrorMessage,
  ORGANIZATION_USAGE_LABEL,
  updateOrganizationUsage,
  type OrganizationUsage,
  type PlatformOrganization,
} from '@/lib/api/platform';

// Fase 3 del plan de finanzas (2026-10-30, control 3.8): si la organización es
// despacho o campaña y quién es su titular. Entre organizaciones del mismo
// titular con usos distintos no pasan contactos por archivo.
export function OrganizationUsagePanel({ org, canWrite, refresh }: { org: PlatformOrganization; canWrite: boolean; refresh: () => void }) {
  const [usage, setUsage] = useState<string>(org.usage ?? '__none__');
  const [holder, setHolder] = useState(org.holderDocument ?? '');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dirty = usage !== (org.usage ?? '__none__') || holder.trim() !== (org.holderDocument ?? '');

  async function save() {
    setBusy(true); setError('');
    try {
      await updateOrganizationUsage(org.id, {
        usage: usage === '__none__' ? null : (usage as OrganizationUsage),
        holderDocument: holder.trim() || null,
      });
      refresh();
    } catch (e) {
      setError(extractErrorMessage(e) || 'No se pudo guardar el uso de la organización.');
      setBusy(false);
    }
  }

  return <section className="space-y-3 rounded-xl border p-5" aria-labelledby="org-usage-title">
    <h2 id="org-usage-title" className="font-semibold">Uso y titular</h2>
    <p className="text-sm text-muted-foreground">Entre el despacho y la campaña de un mismo titular no pasan contactos por archivo, ni al importar ni al difundir. Quien también es contacto de la organización que sube el archivo sí entra.</p>
    {!org.usage && org.effectiveUsage === 'CAMPAIGN' && <p className="text-sm">Sin marcar, cuenta como campaña porque su perfil es aspirante.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="org-usage">Uso</Label>
        <Select value={usage} onValueChange={setUsage} disabled={!canWrite || busy}>
          <SelectTrigger id="org-usage" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin marcar</SelectItem>
            {(Object.keys(ORGANIZATION_USAGE_LABEL) as OrganizationUsage[]).map((key) => <SelectItem key={key} value={key}>{ORGANIZATION_USAGE_LABEL[key]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="org-holder">Cédula o NIT del titular</Label>
        <Input id="org-holder" inputMode="numeric" value={holder} onChange={(e) => setHolder(e.target.value)} disabled={!canWrite || busy} placeholder="79111222" />
      </div>
    </div>
    {org.separatedFrom && org.separatedFrom.length > 0
      ? <p className="text-sm">Separada de: {org.separatedFrom.map((other) => other.name).join(', ')}.</p>
      : org.holderDocument && <p className="text-sm text-muted-foreground">Ninguna otra organización de este titular tiene el otro uso.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {canWrite && <Button size="sm" disabled={!dirty || busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</Button>}
  </section>;
}
