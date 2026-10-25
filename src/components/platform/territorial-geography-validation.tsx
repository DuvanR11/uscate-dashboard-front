'use client';
import { Button } from '@/components/ui/button';
import { QuerySection } from './query-section';
import { TerritorialGeographicReviewPanel } from './territorial-geographic-review';
import { getGeographyValidation, type GeographyValidation } from '@/lib/api/territorial-geography-validation';

function ValidationReport({ data }: { data: GeographyValidation }) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `neiva-validacion-geografica-${data.reviewDate}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="space-y-4">
    <p><strong>Validación pendiente de evidencia.</strong> Corte técnico: {data.reviewDate}. {data.summary.matchedPdfCandidates} puestos contrastados; {data.summary.unresolvedStationCases} casos sin resolver y {data.summary.pendingRequirements} requisitos pendientes.</p>
    <p>Las fuentes adicionales permiten contrastar nombres, direcciones y coordenadas. Su coincidencia no confirma el sistema de coordenadas ni la vigencia de los límites; esas validaciones siguen pendientes.</p>
    <Button type="button" variant="outline" className="h-auto max-w-full whitespace-normal" onClick={download}>Descargar informe de validación (JSON)</Button>
    <ul className="space-y-2" aria-label="Comprobaciones geográficas">{data.checks.map(c => <li key={c.code} className="text-sm">{c.detail}</li>)}</ul>
    {!!data.geographicEvidence?.length && <details aria-label="Evidencias geográficas incorporadas"><summary className="cursor-pointer font-medium">Evidencias geográficas incorporadas ({data.geographicEvidence.length})</summary><ul className="mt-3 space-y-3" aria-label="Evidencias geográficas incorporadas">{data.geographicEvidence.map(f => <li key={f.code} className="rounded-md border p-3 text-sm break-words"><strong>{f.title}</strong><p>{f.conclusion}</p>{f.sourceIds.map(id => {
      const source = data.evidenceSources.find(s => s.id === id);
      return source && <div key={id} className="mt-2 space-y-1"><a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><p>Fecha del documento: {source.documentDate ?? 'Sin acreditar'}</p><p>{source.limitations}</p>{source.sha256 && <p className="break-all text-xs">SHA-256: {source.sha256}</p>}</div>;
    })}</li>)}</ul></details>}
    <details aria-label="Casos geográficos por resolver"><summary className="cursor-pointer font-medium">Casos por resolver ({data.cases.length})</summary><ul className="mt-3 space-y-3">{data.cases.map(c => <li key={c.stationKey} className="rounded-md border p-3 text-sm break-words"><strong>{c.names.join(' / ')}</strong><p>Pendiente · PDF página {c.pdfPage} · {c.stationKey}</p><p>Unidad MMV: {c.mmvUnitCodes.join(', ')} · PDF: {c.pdfUnitCode ?? 'Sin declarar'} · Polígono de referencia: {c.referenceContainingCodes.join(', ') || 'Sin correspondencia'}</p>{c.documentaryEvidence.map(e => {
      const source = data.evidenceSources.find(s => s.id === e.sourceId);
      return <div key={e.sourceId} className="mt-2 space-y-1"><p>{e.conclusion}</p>{source && <><a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}{e.page ? ` · página ${e.page}` : ''}</a><p>{source.limitations}</p></>}</div>;
    })}</li>)}</ul></details>
    <details><summary className="cursor-pointer font-medium">Evidencia necesaria para cerrar T4</summary><ul className="mt-3 space-y-3">{data.requirements.map(r => <li key={r.code} className="rounded-md border p-3 text-sm"><strong>{r.title}</strong><p>{r.affectedCount} {r.affectedKind} · Pendiente</p><p>{r.requiredEvidence}</p></li>)}</ul></details>
    {data.limitations.map(l => <p key={l} className="text-sm">{l}</p>)}
    <p className="break-all text-xs">Huella del informe: {data.contentHash}</p>
  </div>;
}
export function TerritorialGeographyValidationPanel() {
  return <><QuerySection title="Validación geográfica de T4" load={getGeographyValidation}>{data => <ValidationReport data={data} />}</QuerySection><TerritorialGeographicReviewPanel /></>;
}
