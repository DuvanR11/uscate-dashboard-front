'use client';

import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

type Props = {
  graph: {
    nodes: any[];
    links: any[];
  };
  timeline?: {
    events: any[];
  };
  onExpand?: (newInvestigation: any) => void;
};

const nodeColors: Record<string, string> = {
  ROOT: '#1B2541',
  COMPANY: '#2563eb',
  PERSON: '#7c3aed',
  PUBLIC_ENTITY: '#f59e0b',
  CONTRACT: '#16a34a',
  PROCESS: '#22c55e',
  NEWS: '#dc2626',
  LOCATION: '#0891b2',
  EVENT: '#ea580c',
};

export default function InvestigationGraph({
  graph,
  timeline,
  onExpand,
}: Props) {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [expanding, setExpanding] = useState(false);

  const [filters, setFilters] = useState({
    CONTRACT: true,
    PROCESS: true,
    NEWS: true,
    PUBLIC_ENTITY: true,
    COMPANY: true,
    PERSON: true,
    LOCATION: true,
    EVENT: true,
    ROOT: true,
  });

  const visibleNodeIds = useMemo(() => {
    return new Set(
      graph.nodes
        .filter((n) => filters[n.type as keyof typeof filters] !== false)
        .map((n) => n.id),
    );
  }, [graph.nodes, filters]);

  const { nodes, edges } = useMemo(() => {
    const filteredNodes = graph.nodes.filter((n) => visibleNodeIds.has(n.id));

    const filteredLinks = graph.links.filter(
      (l) => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target),
    );

    return buildLayout(filteredNodes, filteredLinks);
  }, [graph, visibleNodeIds]);

  const relatedTimeline =
    timeline?.events?.filter((event) => {
      if (!selectedNode) return false;

      const raw = JSON.stringify(event).toUpperCase();
      return raw.includes(String(selectedNode.label || '').toUpperCase());
    }) || [];

  const relatedLinks =
    graph.links.filter(
      (l) => l.source === selectedNode?.id || l.target === selectedNode?.id,
    ) || [];

  const expandNode = async () => {
    if (!selectedNode?.label) return;

    setExpanding(true);

    try {
      const res = await api.get(
        `/investigation/search?q=${encodeURIComponent(selectedNode.label)}`,
      );

      onExpand?.(res.data);
    } finally {
      setExpanding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1B2541]">
            Grafo investigativo
          </CardTitle>

          <div className="flex flex-wrap gap-2 pt-2">
            {Object.keys(filters).map((key) => (
              <button
                key={key}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    [key]: !prev[key as keyof typeof filters],
                  }))
                }
                className={`text-[11px] px-2 py-1 rounded border font-bold ${
                  filters[key as keyof typeof filters]
                    ? 'bg-[#1B2541] text-white'
                    : 'bg-white text-slate-400'
                }`}
              >
                {filters[key as keyof typeof filters] ? '✓ ' : ''}
                {key}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <div className="w-full h-[700px] rounded-xl overflow-hidden border bg-white">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              onNodeClick={(_, node) => setSelectedNode(node.data.raw)}
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm h-fit">
        <CardHeader>
          <CardTitle className="text-base text-[#1B2541]">
            Detalle del nodo
          </CardTitle>
        </CardHeader>

        <CardContent>
          {!selectedNode ? (
            <p className="text-sm text-slate-500">
              Selecciona un nodo del grafo.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">
                  Nombre
                </p>
                <p className="font-black text-[#1B2541]">
                  {selectedNode.label}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-bold">Tipo</p>
                  <p>{selectedNode.type}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-bold">Fuente</p>
                  <p>{selectedNode.source}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-bold">Riesgo</p>
                  <p>{selectedNode.risk ?? 0}/10</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-bold">
                    Relaciones
                  </p>
                  <p>{relatedLinks.length}</p>
                </div>
              </div>

              <Button
                onClick={expandNode}
                disabled={expanding}
                className="w-full bg-[#1B2541] text-white"
              >
                {expanding ? 'Expandiendo...' : 'Expandir investigación'}
              </Button>

              <div>
                <p className="text-xs text-slate-400 uppercase font-bold mb-2">
                  Relaciones
                </p>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {relatedLinks.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Sin relaciones directas.
                    </p>
                  ) : (
                    relatedLinks.slice(0, 10).map((link, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-slate-50 p-2 rounded border"
                      >
                        <strong>{link.type}</strong>
                        <br />
                        {link.source} → {link.target}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase font-bold mb-2">
                  Timeline relacionado
                </p>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {relatedTimeline.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Sin eventos relacionados.
                    </p>
                  ) : (
                    relatedTimeline.slice(0, 8).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-xs bg-slate-50 p-2 rounded border"
                      >
                        <strong>{ev.title}</strong>
                        <p className="text-slate-400">
                          {new Date(ev.date).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedNode.properties && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-bold text-slate-500">
                    Ver propiedades
                  </summary>
                  <pre className="mt-2 bg-slate-950 text-slate-100 p-3 rounded overflow-auto max-h-[220px]">
                    {JSON.stringify(selectedNode.properties, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildLayout(rawNodes: any[], rawLinks: any[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 80,
    ranksep: 160,
  });

  rawNodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: 220,
      height: 70,
    });
  });

  rawLinks.forEach((link) => {
    dagreGraph.setEdge(link.source, link.target);
  });

  dagre.layout(dagreGraph);

  const nodes: Node[] = rawNodes.map((node) => {
    const pos = dagreGraph.node(node.id);

    return {
      id: node.id,
      position: {
        x: pos?.x || 0,
        y: pos?.y || 0,
      },
      data: {
        label: node.label,
        raw: node,
      },
      style: {
        background: nodeColors[node.type] || '#64748b',
        color: 'white',
        border: 'none',
        borderRadius: 12,
        padding: 10,
        fontSize: 11,
        fontWeight: 700,
        width: 220,
      },
    };
  });

  const edges: Edge[] = rawLinks.map((link, index) => ({
    id: `edge-${index}`,
    source: link.source,
    target: link.target,
    label: link.type,
    animated: link.weight > 100000000,
    style: {
      strokeWidth: Math.min(6, Math.max(1, Number(link.weight || 1) / 500000000)),
    },
  }));

  return { nodes, edges };
}