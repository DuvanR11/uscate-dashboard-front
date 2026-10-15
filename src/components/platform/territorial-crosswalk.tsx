'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { QuerySection } from './query-section';
import { getTerritorialCrosswalk, type TerritorialCrosswalk } from '@/lib/api/territorial-crosswalk';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-CO');
function CrosswalkInventory({ data }: { data: TerritorialCrosswalk }) {
  const [filter, setFilter] = useState('');
  const stations = data.stations.filter(s => fold([s.zoneCode, s.stationCode, ...s.sourceNames, ...s.sourceUnitCodes, ...s.sourceUnitCodes.map(c => data.units.find(u => u.electoralCode === c)?.electoralLabels.join(' ') ?? c)].join(' ')).includes(fold(filter.trim())));
  return <div className="space-y-4">
    <p><strong>Borrador para revisión.</strong> Neiva · Concejo 2023. {data.summary.stations} puestos y {data.summary.tables} mesas identificados en el MMV. Correspondencias aprobadas: {data.summary.approvedCorrespondences}.</p>
    <p>{data.summary.communeCandidates} comunas con coincidencia de código en DANE 2018; {data.summary.corregimientosWithoutGeometry} corregimientos sin geometría incorporada; una categoría especial por aclarar. Una coincidencia de código requiere revisar su significado y vigencia antes de aprobarla.</p>
    <p>Las zonas electorales pueden contener puestos de varias comunas. La comuna declarada para un puesto no identifica la residencia de sus votantes.</p>
    <details><summary className="cursor-pointer font-medium">Revisar comunas y corregimientos</summary><ul className="mt-3 grid gap-3 md:grid-cols-2">{data.units.map(u => <li className="min-w-0 rounded-md border p-3 text-sm" key={u.electoralCode}><strong>{u.electoralCode} · {u.electoralLabels.join(' / ')}</strong><p>{u.stationCount} puestos · {u.tableCount} mesas</p><p>{u.candidate ? `Candidata: DANE ${u.candidate.geographicCode}, ${u.candidate.geographicLabel} (${u.candidate.referenceYear}). Vigencia 2023 pendiente.` : u.kind === 'SPECIAL' ? 'Categoría especial: requiere interpretación; no se asigna a un polígono.' : 'Geometría pendiente de obtener y verificar.'}</p></li>)}</ul></details>
    <label className="block space-y-1"><span>Buscar puesto, zona o comuna</span><Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Nombre o código del puesto" /></label>
    <p className="text-sm" aria-live="polite">{stations.length} de {data.stations.length} puestos. Todos pendientes de coordenadas oficiales verificadas.</p>
    <ul className="max-h-96 space-y-2 overflow-y-auto" aria-label="Puestos del MMV para revisión">{stations.map(s => <li key={s.key} className="min-w-0 rounded-md border p-3 text-sm"><strong>{s.sourceNames.join(' / ')}</strong><p>Zona {s.zoneCode} · Puesto {s.stationCode} · {s.tableCount} mesas</p><p>{s.sourceUnitCodes.map(c => `${c} · ${data.units.find(u => u.electoralCode === c)?.electoralLabels.join(' / ') ?? 'Por revisar'}`).join('; ')}</p><p>{s.status === 'SOURCE_CONFLICT' ? 'Conflicto de identidad: revisar el original.' : 'Ubicación pendiente.'}</p></li>)}</ul>
    {!stations.length && <p>No hay puestos que coincidan con la búsqueda.</p>}
    <details><summary className="cursor-pointer font-medium">Fuentes y pendientes</summary><div className="mt-2 space-y-2 text-sm"><p>Geometría de referencia: <a className="underline" href="https://geoportal.dane.gov.co/mparcgis/rest/services/Comuna_Localidad/Serv_Comuna_Localidad_2018/FeatureServer/0" target="_blank" rel="noopener noreferrer">DANE, comunas 2018</a>. El año no acredita límites electorales de 2023.</p><p><a className="underline" href="https://www.registraduria.gov.co/IMG/pdf/20231006_puestos-de-votacion-georreferenciacion_territoriales.pdf" target="_blank" rel="noopener noreferrer">Listado oficial de puestos georreferenciados de 2023</a>: pendiente de incorporar y contrastar con zona y código de puesto. No se asignan coordenadas por nombre, dirección o centroide.</p><p>Este inventario no publica resultados electorales desagregados ni modifica el acceso contratado. Los conteos de registros CSV no son votos ni personas.</p><p className="break-all">Versión del inventario: {data.contentHash}</p></div></details>
  </div>;
}
export function TerritorialCrosswalkPanel() {
  return <QuerySection title="Inventario de correspondencias de Neiva" load={getTerritorialCrosswalk}>{data => <CrosswalkInventory data={data} />}</QuerySection>;
}
