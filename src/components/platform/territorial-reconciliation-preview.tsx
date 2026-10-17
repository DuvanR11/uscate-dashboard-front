'use client';

import { useState } from 'react';
import { TerritorialReconciliationsPanel } from './territorial-reconciliations';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import { extractErrorMessage } from '@/lib/api/platform';
import { listReconciliationExamples, type CandidateComparison, type ComparisonCell, type ReconciliationExample, type ReconciliationExamples } from '@/lib/api/territorial-reconciliation-preview';

const categoryLabels: Record<string, string> = { CANDIDATE: 'Candidatos', BLANK: 'Blancos', NULL: 'Nulos', UNMARKED: 'No marcados', VALID: 'Votos válidos', TOTAL: 'Total de votos' };
const stateLabels: Record<string, string> = { MATCH: 'Coincide', DIFFERENCE: 'Diferencia', INCOMPLETE: 'Dato incompleto', SYNTHETIC_MATCH: 'Coincidencia de prueba', SYNTHETIC_DIFFERENCES: 'Diferencias de prueba', SYNTHETIC_INCOMPLETE: 'Prueba incompleta' };
const value = (n: number | null) => n === null ? 'Sin dato' : n.toLocaleString('es-CO');
const finding = (c: CandidateComparison) => c.state !== 'MATCH' || c.presence !== 'BOTH' || c.nameDifferences.length > 0;

function CandidateRows({ rows, onlyFindings }: { rows: CandidateComparison[]; onlyFindings: boolean }) {
  const shown = onlyFindings ? rows.filter(finding) : rows;
  return shown.length ? <ul className="space-y-2">{shown.map(c => <li key={c.partyCode + ':' + c.candidateCode} className="rounded border p-3 text-sm">
    <p className="font-medium">{c.observedName ?? c.expectedName} · {c.observedPartyName ?? c.expectedPartyName}</p>
    <p>Agrupación {c.partyCode} · Candidato {c.candidateCode}</p>
    <p>Observado: {value(c.observed)} · Referencia: {value(c.expected)} · Diferencia: {value(c.delta)}</p>
    <p>{stateLabels[c.state] ?? 'Por revisar'}{c.presence === 'MISSING_IN_SOURCE' ? ' · Falta en la fuente' : c.presence === 'MISSING_IN_REFERENCE' ? ' · Falta en la referencia' : ''}</p>
    {c.nameDifferences.length > 0 && <p>Las etiquetas difieren. Fuente: {c.observedName}; referencia: {c.expectedName}. Agrupación en fuente: {c.observedPartyName}; en referencia: {c.expectedPartyName}.</p>}
  </li>)}</ul> : <p className="text-sm">No hay hallazgos en estos candidatos.</p>;
}

function CategoryRows({ rows }: { rows: Record<string, ComparisonCell> }) {
  return <div className="grid gap-2 sm:grid-cols-2">{Object.entries(rows).map(([key, cell]) => <div key={key} className="rounded border p-3 text-sm">
    <p className="font-medium">{categoryLabels[key] ?? key}: {stateLabels[cell.state] ?? 'Por revisar'}</p>
    <p>Observado: {value(cell.observed)} · Referencia: {value(cell.expected)}</p>
    <p>Diferencia: {value(cell.delta)}</p>
  </div>)}</div>;
}

function PracticeNotes({ example }: { example: ReconciliationExample }) {
  const [fictional, setFictional] = useState(false), [coverage, setCoverage] = useState(false), [note, setNote] = useState('');
  function download() {
    if (!fictional || !coverage || note.trim().length < 10) return;
    const content = { mode: 'SYNTHETIC_ONLY', warning: 'NOTAS DE PRÁCTICA. NO ES UNA APROBACIÓN DOCUMENTAL.', scenario: example.id, datasetCode: example.result.datasetCode,
      createdAt: new Date().toISOString(), note: note.trim(), checked: { fictional, coverage },
      result: example.result, recordedOnServer: false, officialReviewRecorded: false, published: false };
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'SIMULACION-revision-' + example.id + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <fieldset className="space-y-3 rounded-lg border p-4">
    <legend className="px-1 font-semibold">Notas de práctica</legend>
    <p className="text-sm">Se conservan en esta vista y se reinician al cambiar de escenario o recargar. La descarga es local; no registra una revisión en la plataforma. Evita incluir datos personales en las notas.</p>
    <label className="flex items-start gap-2"><input type="checkbox" checked={fictional} onChange={e => setFictional(e.target.checked)} /><span>Reconozco que los datos y la referencia son ficticios.</span></label>
    <label className="flex items-start gap-2"><input type="checkbox" checked={coverage} onChange={e => setCoverage(e.target.checked)} /><span>Revisé candidatos, categorías, mesas y datos ausentes del ejemplo.</span></label>
    <label className="block">Hallazgos de la práctica<textarea aria-label="Hallazgos de la práctica" className="mt-1 block min-h-24 w-full rounded border bg-background p-2" minLength={10} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
    <Button type="button" disabled={!fictional || !coverage || note.trim().length < 10} onClick={download}>Descargar notas de práctica</Button>
  </fieldset>;
}

export function TerritorialReconciliationPreviewPanel() {
  const canRead = usePermission('PLATAFORMA', 'canRead');
  const [data, setData] = useState<ReconciliationExamples | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [selected, setSelected] = useState(''), [onlyFindings, setOnlyFindings] = useState(false);
  async function load() {
    setBusy(true); setError(''); setData(null); setSelected(''); setOnlyFindings(false);
    try {
      const next = await listReconciliationExamples();
      if (next.schemaVersion !== 1 || next.mode !== 'SYNTHETIC_ONLY' || !next.fixtureOnly || next.reviewsPersisted !== false || next.officialResultsAvailable !== false || !Array.isArray(next.items) || next.items.some(x => x.result.mode !== 'SYNTHETIC_ONLY' || x.result.publishable !== false || x.result.published !== false)) throw new Error('Respuesta incompatible con la vista de práctica.');
      setData(next);
    } catch (e) { setError(extractErrorMessage(e) || 'No se pudieron cargar los ejemplos de conciliación.'); }
    finally { setBusy(false); }
  }
  if (!canRead) return null;
  const example = data?.items.find(x => x.id === selected), r = example?.result;
  return <section aria-label="Previsualización de conciliación de Alcaldía" className="min-w-0 space-y-4 break-words rounded-xl border p-5">
    <h2 className="text-lg font-semibold">Conciliación de Alcaldía · práctica interna</h2>
    <p className="rounded border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950">DATOS FICTICIOS. Los ejemplos preparan la revisión de Medellín 2023; no contienen resultados oficiales. La conciliación real requiere originales y referencias revisadas.</p>
    <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>{busy ? 'Cargando ejemplos…' : data ? 'Recargar ejemplos de prueba' : 'Cargar ejemplos de prueba'}</Button>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {data && <label className="block">Escenario de práctica<select aria-label="Escenario de conciliación" className="mt-1 block w-full min-w-0 rounded border bg-background p-2" value={selected} onChange={e => { setSelected(e.target.value); setOnlyFindings(false); }}><option value="">Selecciona un escenario</option>{data.items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
    {example && r && <article key={example.id} aria-label={'Comparación ' + example.id} className="min-w-0 space-y-4">
      <h3 className="font-semibold">{example.title} · {stateLabels[r.status] ?? 'Por revisar'}</h3>
      <p>{example.description}</p>
      <p className="text-sm">Contexto de preparación: {r.datasetCode}. Códigos electorales, candidatos y cifras inventados.</p>
      <dl className="grid gap-3 sm:grid-cols-3"><div><dt>Comprobaciones con diferencias</dt><dd className="font-semibold">{r.differences}</dd></div><div><dt>Comparaciones incompletas</dt><dd className="font-semibold">{r.incompleteComparisons}</dd></div><div><dt>Mesas observadas / referencia</dt><dd className="font-semibold">{r.tableCoverage.observed} / {r.tableCoverage.expected}</dd></div></dl>
      <p className="text-sm">La diferencia se calcula como observado menos referencia. «Sin dato» no equivale a cero. Un cambio puede afectar varias comprobaciones; el contador no representa votos ni personas.</p>
      <h4 className="font-semibold">Totales y categorías del ejemplo</h4>
      <CategoryRows rows={{ ...r.categories, VALID: r.validVotes, TOTAL: r.totalVotes }} />
      <label className="flex gap-2"><input type="checkbox" checked={onlyFindings} onChange={e => setOnlyFindings(e.target.checked)} />Mostrar solo hallazgos en candidatos y mesas</label>
      <h4 className="font-semibold">Candidatos · total municipal ficticio</h4>
      <CandidateRows rows={r.candidates} onlyFindings={onlyFindings} />
      <h4 className="font-semibold">Detalle por mesa</h4>
      {!r.tableCoverage.sameIdentities && <p role="alert">Las mesas de la fuente y de la referencia no tienen la misma cobertura.</p>}
      {r.tables.filter(t => !onlyFindings || t.presence !== 'BOTH' || t.locationDifferences.length > 0 || t.candidates.some(finding) || Object.values(t.categories).some(c => c.state !== 'MATCH')).map(t => {
        const l = t.observedLocation ?? t.expectedLocation;
        return <details key={t.key} className="min-w-0 rounded border p-3"><summary className="cursor-pointer font-medium">Mesa {l?.mesa} · Zona {l?.zone} · Puesto {l?.station}</summary><div className="mt-3 space-y-3">
          <p className="text-sm">{l?.stationName} · {l?.communeName}</p>
          {t.presence !== 'BOTH' && <p>La mesa falta en {t.presence === 'MISSING_IN_SOURCE' ? 'la fuente' : 'la referencia'}.</p>}
          {t.locationDifferences.length > 0 && <p>Las etiquetas geográficas difieren y requieren revisión.</p>}
          <CategoryRows rows={t.categories} /><CandidateRows rows={t.candidates} onlyFindings={onlyFindings} />
        </div></details>;
      })}
      {onlyFindings && r.differences === 0 && r.incompleteComparisons === 0 && <p>Sin hallazgos en el escenario ficticio. Esto no acredita una conciliación oficial.</p>}
      <details><summary className="cursor-pointer">Huellas de los archivos de prueba</summary><dl className="space-y-2 break-all text-xs"><div><dt>CSV ficticio</dt><dd>{r.sourceCsvSha256}</dd></div><div><dt>Borrador adaptado</dt><dd>{r.draftSha256}</dd></div><div><dt>Referencia ficticia</dt><dd>{r.referenceFileSha256}</dd></div></dl></details>
      <p className="text-sm">Pendiente para la revisión real: originales oficiales, tipo y corte, correspondencias de candidatos, cobertura geográfica y conciliación independiente.</p>
      <PracticeNotes key={example.id} example={example} />
    </article>}
    <TerritorialReconciliationsPanel exampleId={example?.id??null}/>
  </section>;
}
