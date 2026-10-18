'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { getMunicipalMap, municipalOutline, type MunicipalMapData } from '@/lib/api/territorial-map';
import { votePercentage, type MunicipalResults } from '@/lib/api/territorial-results';

const sourceUrl = 'https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2024/FeatureServer/317';
export function MunicipalMap({ datasetCode,result, onInvalidation }: { datasetCode:string;result: MunicipalResults; onInvalidation: () => void }) {
  const token = useAuthStore(s => s.sessionId), userId = useAuthStore(s => s.user?.id), orgId = useAuthStore(s => s.user?.organizationId), impersonation = useAuthStore(s => s.impersonation);
  const identity = `${datasetCode}:${token}:${userId}:${orgId}:${Boolean(impersonation)}`, titleId = useId(), descriptionId = useId();
  const [view, setView] = useState<{ owner: string; data: MunicipalMapData } | null>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(''), [zoom, setZoom] = useState(1), [center, setCenter] = useState([350, 250]);
  const invalidation = useRef(onInvalidation), drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  useEffect(() => { invalidation.current = onInvalidation; }, [onInvalidation]);
  useEffect(() => {
    if (!token || impersonation) return;
    const controller = new AbortController(), before = useAuthStore.getState();
    // Clear the previous request before synchronizing with the authorized publication.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(''); setView(null); setZoom(1); setCenter([350,250]);
    void getMunicipalMap(datasetCode,result.version, controller.signal).then(data => {
      const now = useAuthStore.getState();
      if (!controller.signal.aborted && now.sessionId === before.sessionId && now.user?.id === before.user?.id && now.user?.organizationId === before.user?.organizationId && !now.impersonation) setView({ owner: identity, data });
    }).catch(failure => {
      if (controller.signal.aborted) return;
      const status = axios.isAxiosError(failure) ? failure.response?.status : undefined;
      setError('No pudimos comprobar el mapa de referencia. Los resultados tabulares siguen disponibles.');
      if (status === 403 || status === 409) invalidation.current();
    });
    return () => controller.abort();
  }, [identity, token, impersonation, result.version, revision,datasetCode]);
  const map = view?.owner === identity ? view.data : null;
  const path = useMemo(() => map ? municipalOutline(map.boundary.features[0].geometry.coordinates[0]) : '', [map]);
  const group = result.data.groups.find(g => g.mmvCode === selected);
  const share = group ? votePercentage(group.votes, result.data.groupPercentageDenominator.votes) : null;
  const width = 700 / zoom, height = 500 / zoom;
  const constrain = (x: number, y: number) => [Math.max(width / 2, Math.min(700 - width / 2, x)), Math.max(height / 2, Math.min(500 - height / 2, y))];
  const pan = (x: number, y: number) => setCenter(c => constrain(c[0] + x * width / 5, c[1] + y * height / 5));
  return <section aria-label="Mapa municipal de referencia" className="space-y-4 rounded-lg border p-4">
    <h2 className="text-lg font-semibold">Mapa de referencia de Neiva</h2>
    <p className="text-sm">Contorno municipal DANE MGN 2024. Resultados electorales de 2023, versión {result.version.number}. La cartografía sirve de referencia y no certifica los límites electorales de 2023.</p>
    {error ? <div className="space-y-2"><p role="alert">{error}</p><Button variant="outline" onClick={() => setRevision(n => n + 1)}>Reintentar mapa</Button></div> : !map ? <p role="status">Comprobando cartografía y acceso territorial…</p> : <>
      <label className="block space-y-1 text-sm"><span>Consultar resultado municipal</span><select className="block w-full min-w-0 rounded-md border bg-background p-2" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Resumen del municipio</option>{result.data.groups.map(g => <option key={g.mmvCode} value={g.mmvCode}>{g.name ?? `Código ${g.documentCode}`}</option>)}</select></label>
      <p aria-live="polite" className="text-sm">{group ? <><strong>{group.name ?? `Código ${group.documentCode}`}</strong>: {group.votes.toLocaleString('es-CO')} votos · {share === null ? 'Sin denominador' : `${share.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`} de los {result.data.groupPercentageDenominator.votes.toLocaleString('es-CO')} votos válidos, incluido blanco, del municipio.</> : <>Neiva, Huila · DIVIPOLA 41001 · {result.data.categoryTotal.toLocaleString('es-CO')} total de categorías · {result.data.coverage.observedTables} mesas contrastadas en el total municipal.</>}</p>
      <div className="flex flex-wrap gap-2" aria-label="Controles del mapa"><Button variant="outline" disabled={zoom >= 4} onClick={() => setZoom(z => Math.min(4, z * 2))}>Acercar</Button><Button variant="outline" disabled={zoom <= 1} onClick={() => { setZoom(z => Math.max(1,z / 2)); setCenter([350,250]); }}>Alejar</Button><Button variant="ghost" onClick={() => { setZoom(1); setCenter([350,250]); }}>Ver municipio completo</Button></div>
      <div className="overflow-hidden rounded-md border bg-muted/20">
        <svg role="img" aria-labelledby={`${titleId} ${descriptionId}`} viewBox={`${center[0]-width/2} ${center[1]-height/2} ${width} ${height}`} className="block w-full touch-none" style={{ aspectRatio: '7 / 5', cursor: zoom > 1 ? 'grab' : 'default' }}
          onPointerDown={e => { if (zoom > 1) { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, cx: center[0], cy: center[1] }; } }}
          onPointerMove={e => { if (drag.current) { const rect = e.currentTarget.getBoundingClientRect(); setCenter(constrain(drag.current.cx-(e.clientX-drag.current.x)*width/rect.width, drag.current.cy-(e.clientY-drag.current.y)*height/rect.height)); } }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          <title id={titleId}>Contorno municipal de Neiva, Huila, referencia DANE 2024</title><desc id={descriptionId}>Una sola unidad municipal, norte arriba. El color identifica el territorio y no representa diferencias de voto dentro de él.</desc>
          <path d={path} fill="#d8eceb" stroke="#176b75" strokeWidth="2" vectorEffect="non-scaling-stroke" fillRule="evenodd" />
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm"><span>Norte arriba · Ampliación {zoom}×</span>{[['←','oeste',-1,0],['↑','norte',0,-1],['↓','sur',0,1],['→','este',1,0]].map(([label, direction, x, y]) => <Button key={direction} variant="ghost" disabled={zoom === 1} aria-label={`Desplazar al ${direction}`} onClick={() => pan(Number(x), Number(y))}>{label}</Button>)}</div>
      <p className="text-sm"><span className="mr-2 inline-block h-3 w-3 border border-teal-800 bg-teal-100" aria-hidden="true" />Una unidad municipal; el relleno no representa diferencias internas de voto.</p>
      <p className="text-sm">Resultados por comuna, puesto o mesa, mapas de calor, participación y edades: pendientes de fuentes y conciliación compatibles. Este mapa no ubica personas del CRM ni atribuye votos individuales.</p>
      <details className="text-sm"><summary className="cursor-pointer font-medium">Fuente y alcance cartográfico</summary><div className="mt-2 space-y-2"><p><a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">DANE · DIVIPOLA MGN 2024 · Capa Municipio</a>. Consulta de Neiva (41001), obtenida el 15 de octubre de 2026. Coordenadas longitud/latitud WGS 84; representación visual Mercator, sin medición de distancias.</p><p>Contorno completo, sin simplificación: {map.vertexCount.toLocaleString('es-CO')} vértices. Se utiliza una copia verificada; la consulta no envía datos a proveedores de mapas.</p><p className="break-all">SHA-256 del original: {map.source.sourceSha256}</p></div></details>
    </>}
  </section>;
}
