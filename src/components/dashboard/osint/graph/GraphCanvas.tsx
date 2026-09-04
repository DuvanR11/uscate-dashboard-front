'use client';

import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Download, LayoutGrid, Network, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CONFIDENCE_EDGE_STYLE,
  riskRingColor,
  type GraphLayout,
  type GraphViewEdge,
  type GraphViewNode,
  type NodeBookmark,
} from './graph-view.types';
import { downloadTextFile, edgesToCsv, graphToGraphML, nodesToCsv } from './graph-export.util';

// Plan "OSINT Profesional" (2026-09-02), Fase 4 — grafo profesional
// unificado: UN solo componente de renderizado para el buscador ad-hoc
// (`InvestigationGraph.tsx`) y el grafo de casos (`EntityGraphView.tsx`),
// que hasta ahora reimplementaban por separado el mismo layout con
// ReactFlow+dagre. Cada llamador sigue dueño de SU propia obtención de
// datos, filtros y panel de detalle — este componente solo sabe dibujar,
// buscar, marcar y exportar.
//
// Marcadores/notas: se guardan en `localStorage` del navegador, por
// `storageKey` (una nota es de este analista, en este navegador — NO se
// sincroniza entre analistas todavía; eso es colaboración real, fuera del
// alcance de esta fase, ya señalado en el plan publicado).
type Props = {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  nodeColor: (type: string) => string;
  rootColor: string;
  rootId?: string;
  selectedNodeId?: string | null;
  onNodeClick?: (node: GraphViewNode) => void;
  storageKey: string;
  height?: number;
  exportFileBaseName?: string;
};

function loadBookmarks(storageKey: string): Record<string, NodeBookmark> {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveBookmarks(storageKey: string, bookmarks: Record<string, NodeBookmark>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(bookmarks));
  } catch {
    // localStorage lleno/deshabilitado — un marcador que no se guarda no debe romper el grafo.
  }
}

export default function GraphCanvas({
  nodes,
  edges,
  nodeColor,
  rootColor,
  rootId,
  selectedNodeId,
  onNodeClick,
  storageKey,
  height = 700,
  exportFileBaseName = 'grafo-osint',
}: Props) {
  const [layout, setLayout] = useState<GraphLayout>('hierarchical');
  const [searchTerm, setSearchTerm] = useState('');
  const [bookmarks, setBookmarks] = useState<Record<string, NodeBookmark>>({});

  useEffect(() => {
    setBookmarks(loadBookmarks(storageKey));
  }, [storageKey]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedBookmark = selectedNodeId ? bookmarks[selectedNodeId] : undefined;

  const toggleStar = () => {
    if (!selectedNodeId) return;
    setBookmarks((prev) => {
      const next = {
        ...prev,
        [selectedNodeId]: {
          starred: !prev[selectedNodeId]?.starred,
          note: prev[selectedNodeId]?.note || '',
        },
      };
      saveBookmarks(storageKey, next);
      return next;
    });
  };

  const setNote = (note: string) => {
    if (!selectedNodeId) return;
    setBookmarks((prev) => {
      const next = {
        ...prev,
        [selectedNodeId]: { starred: !!prev[selectedNodeId]?.starred, note },
      };
      saveBookmarks(storageKey, next);
      return next;
    });
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const { flowNodes, flowEdges } = useMemo(() => {
    const positions =
      layout === 'hierarchical'
        ? buildHierarchicalPositions(nodes, edges)
        : buildRadialPositions(nodes, edges, rootId);

    const flowNodes: Node[] = nodes.map((node) => {
      const pos = positions.get(node.id) || { x: 0, y: 0 };
      const starred = !!bookmarks[node.id]?.starred;
      const matchesSearch = !normalizedSearch || node.label.toLowerCase().includes(normalizedSearch);
      const riskColor = riskRingColor(node.risk);

      // El anillo de selección (oscuro) y el de riesgo (rojo/naranja) son
      // 2 boxShadows independientes — pueden coexistir sin pisarse.
      const boxShadowLayers = [
        node.id === selectedNodeId ? '0 0 0 2px #0f172a' : null,
        riskColor ? `0 0 0 3px ${riskColor}` : null,
      ].filter(Boolean);

      return {
        id: node.id,
        position: pos,
        data: { label: node.label, raw: node },
        style: {
          background: node.type === 'ROOT' ? rootColor : nodeColor(node.type),
          color: 'white',
          border: starred ? '3px solid #facc15' : 'none',
          boxShadow: boxShadowLayers.length ? boxShadowLayers.join(', ') : undefined,
          opacity: matchesSearch ? 1 : 0.2,
          borderRadius: 12,
          padding: 10,
          fontSize: 11,
          fontWeight: 700,
          width: 220,
        },
      };
    });

    const flowEdges: Edge[] = edges.map((edge) => {
      const style = edge.confidence
        ? CONFIDENCE_EDGE_STYLE[edge.confidence]
        : undefined;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: edge.confidence === 'VERIFIED_FACT' || (edge.weight || 0) > 100_000_000,
        style: {
          stroke: style?.color,
          strokeWidth: style?.width ?? Math.min(6, Math.max(1, Number(edge.weight || 1) / 500_000_000)),
          strokeDasharray: style?.dashed ? '6 4' : undefined,
        },
      };
    });

    return { flowNodes, flowEdges };
  }, [nodes, edges, layout, rootId, bookmarks, normalizedSearch, selectedNodeId, nodeColor, rootColor]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setLayout('hierarchical')}
            className={`px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 ${
              layout === 'hierarchical' ? 'bg-primary text-white' : 'bg-white text-slate-500'
            }`}
            title="Layout jerárquico"
          >
            <Network size={13} /> Jerárquico
          </button>
          <button
            type="button"
            onClick={() => setLayout('radial')}
            className={`px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 ${
              layout === 'radial' ? 'bg-primary text-white' : 'bg-white text-slate-500'
            }`}
            title="Layout radial (por profundidad desde el centro)"
          >
            <LayoutGrid size={13} /> Radial
          </button>
        </div>

        <div className="relative flex-1 min-w-[160px] max-w-[260px]">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en el grafo..."
            className="pl-7 h-8 text-xs"
          />
        </div>

        <div className="flex gap-1.5 ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[11px] gap-1"
            onClick={() => {
              downloadTextFile(`${exportFileBaseName}-nodos.csv`, nodesToCsv(nodes), 'text/csv');
              downloadTextFile(`${exportFileBaseName}-relaciones.csv`, edgesToCsv(edges), 'text/csv');
            }}
          >
            <Download size={12} /> CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[11px] gap-1"
            onClick={() =>
              downloadTextFile(
                `${exportFileBaseName}.graphml`,
                graphToGraphML(nodes, edges),
                'application/xml',
              )
            }
          >
            <Download size={12} /> GraphML
          </Button>
        </div>
      </div>

      <div className="w-full rounded-xl overflow-hidden border bg-white" style={{ height }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          onNodeClick={(_, node) => onNodeClick?.(node.data.raw as GraphViewNode)}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <button
            type="button"
            onClick={toggleStar}
            className={`shrink-0 ${selectedBookmark?.starred ? 'text-amber-500' : 'text-slate-300'} hover:text-amber-500`}
            title="Marcar este nodo"
          >
            <Star size={16} fill={selectedBookmark?.starred ? 'currentColor' : 'none'} />
          </button>
          <Textarea
            value={selectedBookmark?.note || ''}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Nota propia sobre "${selectedNode.label}" (solo en este navegador)...`}
            className="text-xs min-h-[36px] flex-1"
          />
        </div>
      )}
    </div>
  );
}

function buildHierarchicalPositions(
  nodes: GraphViewNode[],
  edges: GraphViewEdge[],
): Map<string, { x: number; y: number }> {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 160 });

  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 220, height: 70 }));
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    const pos = dagreGraph.node(node.id);
    positions.set(node.id, { x: pos?.x || 0, y: pos?.y || 0 });
  });
  return positions;
}

// Layout radial (concéntrico) — clásico en herramientas de análisis de
// vínculos: el nodo central en el medio, y cada anillo hacia afuera
// representa un salto más de distancia real en el grafo (BFS real, no
// una posición arbitraria). Nodos inalcanzables desde el centro (grafo
// desconectado) quedan en el anillo más externo, nunca superpuestos.
function buildRadialPositions(
  nodes: GraphViewNode[],
  edges: GraphViewEdge[],
  rootId?: string,
): Map<string, { x: number; y: number }> {
  const adjacency = new Map<string, string[]>();
  nodes.forEach((n) => adjacency.set(n.id, []));
  edges.forEach((e) => {
    adjacency.get(e.source)?.push(e.target);
    adjacency.get(e.target)?.push(e.source);
  });

  const center = rootId && adjacency.has(rootId) ? rootId : nodes[0]?.id;
  const depth = new Map<string, number>();

  if (center) {
    depth.set(center, 0);
    const queue: string[] = [center];
    while (queue.length) {
      const current = queue.shift()!;
      const currentDepth = depth.get(current)!;
      for (const neighbor of adjacency.get(current) || []) {
        if (!depth.has(neighbor)) {
          depth.set(neighbor, currentDepth + 1);
          queue.push(neighbor);
        }
      }
    }
  }

  const maxDepth = Math.max(0, ...Array.from(depth.values()));
  nodes.forEach((n) => {
    if (!depth.has(n.id)) depth.set(n.id, maxDepth + 1);
  });

  const byDepth = new Map<number, string[]>();
  nodes.forEach((n) => {
    const d = depth.get(n.id)!;
    byDepth.set(d, [...(byDepth.get(d) || []), n.id]);
  });

  const positions = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of byDepth) {
    const radius = d === 0 ? 0 : 140 + d * 220;
    ids.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / ids.length;
      positions.set(id, {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    });
  }

  return positions;
}
