'use client';

// Revisión de punta a punta del módulo de eventos (2026-09-17) —
// `EventsService#convokeProspects()` existía completo en el backend pero
// nunca tuvo ruta HTTP ni botón real: el embudo del evento ya mostraba
// "Convocados" sin que nada real lo alimentara. Reusa `AdvancedFilters`
// (el mismo picker de filtros ya construido para el dashboard de
// analítica) en vez de reinventar un selector de catálogos nuevo.
//
// 2026-09-30: la convocatoria solo marcaba "Convocados" y nunca le escribía a
// nadie. Ahora puede enviar la invitación por correo (mismo envío que las
// difusiones: descuenta cupo y respeta la lista de exclusión).
import { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from '@/components/dashboard/reports/advanced-filters';
import { Megaphone, Loader2 } from 'lucide-react';
import { confirmDialog } from '@/components/ui/confirm-dialog';

interface ConvokeProspectsDialogProps {
  eventId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ConvokeResult {
  count: number;
  message?: string;
  email?: { queued: number; skipped: number; error?: string };
  sms?: { queued: number; skipped: number; error?: string };
}

/** Un SMS son 160 caracteres; más largo consume más de un cupo. */
const SMS_UNIT = 160;

function getErrorMessage(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'response' in error
    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
    : undefined;
}

export function ConvokeProspectsDialog({
  eventId,
  open,
  onOpenChange,
  onSuccess,
}: ConvokeProspectsDialogProps) {
  const [filters, setFilters] = useState<AdvancedFilterValues>({});
  const [sendEmail, setSendEmail] = useState(true);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  // Fase 5 (2026-10-07): invitación por SMS (apagada por defecto: consume cupo).
  const [sendSms, setSendSms] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleConvoke = async () => {
    // Sin ningún filtro, esto convoca a TODOS los prospectos de la
    // organización — un solo clic con consecuencia real (marca Attendance
    // como INVITED para toda la base), así que pide confirmación explícita
    // en vez de dispararlo en silencio.
    if (
      activeFilterCount === 0 &&
      !await confirmDialog(
        sendEmail || sendSms
          ? `No seleccionaste ningún filtro: esto convocará a TODOS los prospectos de tu organización y les enviará la invitación por ${[sendEmail && 'correo', sendSms && 'SMS'].filter(Boolean).join(' y ')}. ¿Continuar?`
          : 'No seleccionaste ningún filtro: esto convocará a TODOS los prospectos de tu organización a este evento. ¿Continuar?',
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post<ConvokeResult>(`/events/${eventId}/convoke`, {
        ...filters,
        sendEmail,
        emailSubject: sendEmail && emailSubject.trim() ? emailSubject.trim() : undefined,
        emailMessage: sendEmail && emailMessage.trim() ? emailMessage.trim() : undefined,
        sendSms,
        smsMessage: sendSms && smsMessage.trim() ? smsMessage.trim() : undefined,
      });
      const message = data.message || `Se convocaron ${data.count} prospectos.`;
      if (data.email?.error || data.sms?.error) toast.warning(message);
      else toast.success(message);
      setFilters({});
      setEmailSubject('');
      setEmailMessage('');
      setSmsMessage('');
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error) || 'No se pudo convocar a los prospectos.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Megaphone className="h-5 w-5 text-secondary" />
            Convocatoria masiva
          </DialogTitle>
          <DialogDescription>
            Filtra a quién quieres invitar a este evento. Los prospectos que
            coincidan quedarán marcados como &quot;Convocados&quot; en el
            embudo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <AdvancedFilters value={filters} onChange={setFilters} />
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="convoke-send-email" className="font-semibold">
              Enviar la invitación por correo
            </Label>
            <Switch
              id="convoke-send-email"
              checked={sendEmail}
              onCheckedChange={setSendEmail}
            />
          </div>
          {sendEmail && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="convoke-subject">Asunto (opcional)</Label>
                <Input
                  id="convoke-subject"
                  value={emailSubject}
                  maxLength={150}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Te invitamos: nombre del evento"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="convoke-message">Mensaje (opcional)</Label>
                <Textarea
                  id="convoke-message"
                  value={emailMessage}
                  maxLength={3000}
                  rows={3}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Si lo dejas vacío se usa la descripción del evento."
                />
              </div>
              <p className="text-xs text-slate-500">
                El correo lleva el saludo con el nombre, la fecha, el lugar y el
                enlace de inscripción. Solo se envía a quienes tienen correo y
                autorizaron el tratamiento de datos; descuenta del cupo de
                correos y respeta la lista de exclusión. Quien ya se inscribió
                no lo recibe.
              </p>
            </>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="convoke-send-sms" className="font-semibold">
              Enviar la invitación por SMS
            </Label>
            <Switch id="convoke-send-sms" checked={sendSms} onCheckedChange={setSendSms} />
          </div>
          {sendSms && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="convoke-sms-message">Texto del SMS (opcional)</Label>
                <Textarea
                  id="convoke-sms-message"
                  value={smsMessage}
                  maxLength={320}
                  rows={3}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Si lo dejas vacío se arma con el nombre, la fecha y el lugar del evento."
                  aria-describedby="convoke-sms-help"
                />
              </div>
              <p id="convoke-sms-help" className="text-xs text-slate-500">
                {smsMessage.trim().length > 0 && (
                  <span className={smsMessage.length > SMS_UNIT ? 'font-semibold text-amber-700' : undefined}>
                    {smsMessage.length} de {SMS_UNIT} caracteres
                    {smsMessage.length > SMS_UNIT ? ' (cuenta como 2 SMS por persona). ' : '. '}
                  </span>
                )}
                Puedes usar {'{{nombre}}'} para saludar a cada persona. Solo se envía a quienes tienen celular y
                autorizaron el tratamiento de datos; descuenta del cupo de SMS y respeta la lista de exclusión.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConvoke}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Megaphone className="mr-2 h-4 w-4" />
            )}
            {sendEmail || sendSms ? 'Convocar y enviar' : 'Convocar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
