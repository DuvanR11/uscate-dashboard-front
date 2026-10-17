'use client';
import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePlatformAccess, usePlatformCapability } from '@/components/platform/access-context';
import { QuerySection } from '@/components/platform/query-section';
import { TerritorialMonitoringPlan } from '@/components/platform/territorial-monitoring-plan';
import { getTerritorialRegistry } from '@/lib/api/territorial-registry';
import { getMonitoringConfiguration } from '@/lib/api/territorial-monitoring-plans';

function Configuration({code}:{code:string}){
  const load=useCallback(()=>getMonitoringConfiguration(code),[code]);
  return <QuerySection key={code} title="Configuración del monitoreo seleccionado" load={load}>{data=><TerritorialMonitoringPlan key={code} initial={data}/>}</QuerySection>;
}
function Monitoring({initialCode}:{initialCode:string}){
  const [selected,setSelected]=useState(initialCode);
  const load=useCallback(()=>getTerritorialRegistry(),[]);
  return <main className="min-w-0 space-y-5 p-4 md:p-6 break-words"><h1 className="text-2xl font-bold">Monitoreo por región</h1>
    <p>Selecciona un conjunto por elección, corporación y territorio. Cada configuración conserva sus fuentes y responsable.</p>
    <QuerySection title="Seleccionar conjunto territorial" load={load}>{data=><>
      <label>Conjunto<select aria-label="Conjunto del monitoreo" className="mt-2 block w-full min-w-0 rounded border p-2" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Selecciona un conjunto</option>{selected&&!data.datasets.some(d=>d.code===selected)&&<option value={selected}>{selected}</option>}{data.datasets.map(d=><option key={d.code} value={d.code}>{d.name} · {d.code}</option>)}</select></label>
      {data.truncated&&<p>El catálogo está truncado. Puedes abrir otro conjunto desde su tarjeta de Operación territorial.</p>}
    </>}</QuerySection>
    {selected?<Configuration key={selected} code={selected}/>:<p>La programación de Neiva se consulta en su conjunto. Los nuevos planes regionales se guardan desactivados.</p>}
  </main>;
}
function SelectedMonitoring(){const params=useSearchParams(),code=params.get('dataset')??'';return <Monitoring key={code} initialCode={/^[A-Z][A-Z0-9_]{2,79}$/.test(code)?code:''}/>;}
export default function TerritorialMonitoringPage(){const access=usePlatformAccess(),capable=usePlatformCapability('CATALOG_MANAGE');if(!capable||!access?.enabled||!access.allOrganizations)return <p className="p-6">Se requiere gestión de catálogo con alcance global para consultar el monitoreo regional.</p>;return <Suspense fallback={<p>Cargando selección territorial…</p>}><SelectedMonitoring/></Suspense>;}
