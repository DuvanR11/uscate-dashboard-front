'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Loader2, Radar, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/shared/can';
import { usePermission } from '@/hooks/use-permission';
import { TerritoryActivity } from '@/lib/api/monitoring';
import { ActivityPanel } from '@/components/dashboard/monitoring/activity-panel';

// Leaflet necesita `window` — igual que el mapa de /inteligencia, se carga
// dinámico sin SSR.
const PredictiveMap = dynamic(() => import('@/components/dashboard/monitoring/predictive-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-slate-400" />
    </div>
  ),
});

/**
 * `/inteligencia/monitoreo` — panel del analista + mapa por territorios del
 * módulo "Monitoreo Predictivo" (Fase 10 del informe, backend Fases 1-9 ya
 * verificadas). Gateado por `MONITOREO_PREDICTIVO` `canRead` (LEGISLATIVE
 * incluido — es de solo lectura, no dispara nada).
 */
export default function MonitoringDashboardPage() {
  return (
    <Can
      module="MONITOREO_PREDICTIVO"
      action="canRead"
      fallback={
        <div className="p-12 text-center text-slate-500">
          No tienes permisos para ver el monitoreo de etiquetas.
        </div>
      }
    >
      <MonitoringDashboard />
    </Can>
  );
}

function MonitoringDashboard() {
  const canWrite = usePermission('MONITOREO_PREDICTIVO', 'canWrite');
  const [keywordId, setKeywordId] = useState<string | null>(null);
  const [hours, setHours] = useState(24);
  const [territories, setTerritories] = useState<TerritoryActivity[]>([]);
  const [keywordName, setKeywordName] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen flex flex-col h-screen overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight flex items-center gap-2">
            <Radar className="text-secondary" /> Monitoreo de Etiquetas
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Actividad por territorio a partir de RSS/Google News, clasificada y geolocalizada
            automáticamente.
          </p>
        </div>

        {canWrite && (
          <Link href="/inteligencia/monitoreo/configuracion">
            <Button variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-100">
              <Settings2 size={16} className="mr-2" /> Configurar etiquetas y fuentes
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        <div className="w-full lg:w-2/3 h-[50vh] lg:h-full relative rounded-xl shadow-lg bg-white">
          <PredictiveMap territories={territories} keywordName={keywordName} />
        </div>

        <div className="w-full lg:w-1/3 h-[50vh] lg:h-full">
          <ActivityPanel
            keywordId={keywordId}
            hours={hours}
            onSelectKeyword={setKeywordId}
            onHoursChange={setHours}
            onTerritoriesLoaded={setTerritories}
            onKeywordNameChange={setKeywordName}
          />
        </div>
      </div>
    </div>
  );
}