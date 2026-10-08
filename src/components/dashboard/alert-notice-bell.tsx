'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { getAlertNotices, readAlertNotice, type AlertInbox } from '@/lib/api/alert-notices';

function Inbox() {
  const [report, setReport] = useState<AlertInbox | null>(null), [open, setOpen] = useState(false), [denied, setDenied] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState<string | null>(null);
  const sequence = useRef(0), mounted = useRef(true);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const data = await getAlertNotices();
      if (!mounted.current || request !== sequence.current) return;
      setReport(data); setDenied(false); setError('');
    } catch (error) {
      if (!mounted.current || request !== sequence.current) return;
      setReport(null);
      const status = (error as { response?: { status?: number } }).response?.status;
      setDenied(status === 401 || status === 403); setError('Los avisos no están disponibles. Puedes volver a consultar.');
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const interval = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { mounted.current = false; clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [load]);
  async function read(id: string) {
    setBusy(id); setError('');
    try { await readAlertNotice(id); await load(); }
    catch { setError('No se pudo marcar el aviso. Vuelve a consultar para comprobar tu acceso.'); setReport(null); }
    finally { if (mounted.current) setBusy(null); }
  }
  if (denied) return null;
  return <div className="relative">
    <Button variant="ghost" size="sm" aria-label={`Avisos${report ? `: ${report.unread} sin leer` : ''}`} aria-expanded={open} aria-controls="alert-inbox" onClick={() => { setOpen(!open); if (!open) void load(); }}><Bell size={18} aria-hidden="true" />{Boolean(report?.unread) && <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">{report!.unread > 99 ? '99+' : report!.unread}</span>}</Button>
    {open && <section id="alert-inbox" aria-label="Bandeja de avisos" className="absolute right-0 top-11 z-50 max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] overflow-auto rounded-lg border bg-background p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Tus avisos</h2><Button size="sm" variant="ghost" onClick={() => void load()}>Actualizar</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!report && !error && <p className="text-sm">Consultando avisos…</p>}
      {report && <><p className="mb-3 text-xs text-muted-foreground">{report.unread} sin leer. Se muestran hasta 25 avisos, primero los pendientes de lectura.</p><ul className="space-y-3">{report.items.map(notice => <li key={notice.id} className={`space-y-2 rounded border p-3 text-sm ${notice.readAt ? '' : 'border-primary'}`}>
        <p className="font-medium">{notice.title}</p><p>{notice.organizationName} · {notice.active ? 'Condición activa' : 'Condición resuelta'}</p><p>{notice.nextAction}</p>
        {notice.usage && <><p>Uso / capacidad / saldo al observar: {notice.usage.used ?? 'Pendiente'} / {notice.usage.limit ?? 'Pendiente'} / {notice.usage.remaining ?? 'Pendiente'}</p><p className="text-xs">{notice.usage.periodStart ? `Inicio del período: ${new Date(notice.usage.periodStart).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}` : 'Contador histórico sin reinicio confirmado.'} {notice.usage.resetAt ? `Reinicio: ${new Date(notice.usage.resetAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}` : 'Consulta la vigencia de tu contrato.'}</p></>}
        <div className="flex flex-wrap items-center gap-3"><Link href={notice.href} className="underline" onClick={() => setOpen(false)}>Revisar</Link>{!notice.readAt && <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void read(notice.id)}>{busy === notice.id ? 'Guardando…' : 'Marcar leído'}</Button>}</div>
      </li>)}</ul>{!report.items.length && <p className="text-sm">Sin avisos registrados. {report.audience === 'CLIENT' ? 'Revisa también el consumo y la vigencia de tu plan.' : 'Revisa también la cobertura del centro de alertas.'}</p>}<p className="mt-3 text-xs text-muted-foreground">Leer un aviso no resuelve la condición ni cambia tus cupos.</p></>}
    </section>}
  </div>;
}
export function AlertNoticeBell() {
  const user = useAuthStore(state => state.user), impersonation = useAuthStore(state => state.impersonation);
  if (!user || impersonation || !['ADMIN', 'SUPER_ADMIN', 'PLATFORM_OPERATOR'].includes(user.role?.code ?? '')) return null;
  return <Inbox key={`${user.id}:${user.organizationId}:${user.role?.code}`} />;
}
