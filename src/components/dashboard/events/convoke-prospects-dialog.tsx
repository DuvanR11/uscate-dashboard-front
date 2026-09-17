'use client';

// Revisión de punta a punta del módulo de eventos (2026-09-17) —
// `EventsService#convokeProspects()` existía completo en el backend pero
// nunca tuvo ruta HTTP ni botón real: el embudo del evento ya mostraba
// "Convocados" sin que nada real lo alimentara. Reusa `AdvancedFilters`
// (el mismo picker de filtros ya construido para el dashboard de
// analítica) en vez de reinventar un selector de catálogos nuevo.
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
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from '@/components/dashboard/reports/advanced-filters';
import { Megaphone, Loader2 } from 'lucide-react';

interface ConvokeProspectsDialogProps {
  eventId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

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
  const [loading, setLoading] = useState(false);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleConvoke = async () => {
    // Sin ningún filtro, esto convoca a TODOS los prospectos de la
    // organización — un solo clic con consecuencia real (marca Attendance
    // como INVITED para toda la base), así que pide confirmación explícita
    // en vez de dispararlo en silencio.
    if (
      activeFilterCount === 0 &&
      !window.confirm(
        'No seleccionaste ningún filtro: esto convocará a TODOS los prospectos de tu organización a este evento. ¿Continuar?',
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post(`/events/${eventId}/convoke`, filters);
      toast.success(data.message || `Se convocaron ${data.count} prospectos.`);
      setFilters({});
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
      <DialogContent className="sm:max-w-md">
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
            Convocar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
