import type { GraphViewEdge, GraphViewNode } from './graph-view.types';

// Plan "OSINT Profesional" (2026-09-02), Fase 4 — exportar el grafo a
// formatos que herramientas externas de análisis de vínculos (Gephi, yEd,
// el propio Maltego) puedan abrir — el estándar real de la industria,
// no un JSON propio del proyecto.

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function nodesToCsv(nodes: GraphViewNode[]): string {
  const header = ['id', 'label', 'type', 'risk'];
  const rows = nodes.map((n) => [n.id, n.label, n.type, n.risk ?? ''].map(csvEscape).join(','));
  return [header.join(','), ...rows].join('\n');
}

export function edgesToCsv(edges: GraphViewEdge[]): string {
  const header = ['id', 'source', 'target', 'label', 'confidence', 'weight'];
  const rows = edges.map((e) =>
    [e.id, e.source, e.target, e.label, e.confidence ?? '', e.weight ?? '']
      .map(csvEscape)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

function xmlEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * GraphML mínimo pero real y válido — abre directo en Gephi/yEd/Maltego.
 * https://graphml.graphdrawing.org/
 */
export function graphToGraphML(nodes: GraphViewNode[], edges: GraphViewEdge[]): string {
  const nodeXml = nodes
    .map(
      (n) => `    <node id="${xmlEscape(n.id)}">
      <data key="label">${xmlEscape(n.label)}</data>
      <data key="ntype">${xmlEscape(n.type)}</data>
    </node>`,
    )
    .join('\n');

  const edgeXml = edges
    .map(
      (e) => `    <edge source="${xmlEscape(e.source)}" target="${xmlEscape(e.target)}">
      <data key="elabel">${xmlEscape(e.label)}</data>
      ${e.confidence ? `<data key="econfidence">${xmlEscape(e.confidence)}</data>` : ''}
    </edge>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="ntype" for="node" attr.name="type" attr.type="string"/>
  <key id="elabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="econfidence" for="edge" attr.name="confidence" attr.type="string"/>
  <graph id="G" edgedefault="directed">
${nodeXml}
${edgeXml}
  </graph>
</graphml>
`;
}

/** Dispara una descarga real en el navegador — mismo patrón ya usado para el informe PDF (blob + <a> descartable). */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
