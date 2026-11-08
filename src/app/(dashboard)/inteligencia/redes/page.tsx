'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// Colores de las etiquetas con más entidades, en orden fijo; las demás van en
// gris. La categoría de un nodo es el nombre de su etiqueta de Monitoreo.
const CATEGORY_COLORS = ['#2563eb', '#d97706', '#059669', '#db2777', '#7c3aed', '#0891b2'];
const OTHER_COLOR = '#94a3b8';

function categoryLabel(category: string) {
  const text = category.replace(/_/g, ' ').toLocaleLowerCase('es-CO');
  return text.charAt(0).toLocaleUpperCase('es-CO') + text.slice(1);
}

// IMPORTANTE: Cargamos la librería dinámicamente para evitar errores SSR en Next.js
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Renderizando física del grafo...</div>
});

// Deuda técnica menor (2026-09-17) — forma real de cada nodo del grafo,
// verificada contra el uso ya existente en este mismo archivo (`node.id`,
// `.val`, `.category`, `.x`/`.y` que agrega la física de `react-force-graph-2d`).
interface GraphNode {
  id?: string | number;
  val?: number;
  category?: string;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

export default function RedesPage() {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: { source: string; target: string; value: number }[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGraph();
    
    // Auto-ajustar el tamaño del grafo al contenedor
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    // Timeout pequeñito para asegurar que el DOM ya pintó el contenedor
    setTimeout(updateDimensions, 100); 

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const fetchGraph = async () => {
    try {
      const res = await api.get('/monitoring/analytics/network');
      if (res.data.success) {
        setGraphData(res.data.data);
      }
    } catch {
      toast.error("Error al cargar la telaraña de relaciones");
    } finally {
      setLoading(false);
    }
  };

  // Leyenda armada con las etiquetas que de verdad aparecen en el grafo
  // (antes eran 4 categorías fijas que casi ninguna organización usa).
  const legend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of graphData.nodes) {
      const category = String(node.category ?? '');
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const colors = new Map<string, string>();
    ranked.slice(0, CATEGORY_COLORS.length).forEach(([category], i) => colors.set(category, CATEGORY_COLORS[i]));
    return { colors, ranked, hasOthers: ranked.length > CATEGORY_COLORS.length };
  }, [graphData.nodes]);

  const getNodeColor = (node: GraphNode) => legend.colors.get(String(node.category ?? '')) ?? OTHER_COLOR;

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Network className="text-secondary" /> Mapa de Vínculos
          </h1>
          <p className="text-slate-500 text-sm mt-1">Grafo interactivo de entidades, contratistas y políticos.</p>
        </div>
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* LEYENDA Y CONTROLES */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto custom-scrollbar">
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
              <CardTitle className="text-sm text-foreground flex items-center gap-2">
                <Search size={16} className="text-secondary"/> Inteligencia Relacional
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Este grafo conecta automáticamente a personas y organizaciones que han sido mencionadas juntas en noticias oficiales, investigaciones o panfletos.
              </p>
              
              {legend.ranked.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Etiquetas</h4>
                  <div className="space-y-2">
                    {legend.ranked.slice(0, CATEGORY_COLORS.length).map(([category]) => (
                      <div key={category} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: legend.colors.get(category) }} />
                        {categoryLabel(category)}
                      </div>
                    ))}
                    {legend.hasOthers && (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: OTHER_COLOR }} />
                        Otras etiquetas
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 leading-relaxed">
                Un círculo más grande aparece en más noticias; una línea más gruesa, más veces juntos. Puedes arrastrar los círculos.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CONTENEDOR DEL GRAFO */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-lg border border-slate-200 relative overflow-hidden" ref={containerRef}>
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={48} className="animate-spin text-secondary mb-4" />
              <p className="font-bold">Tejiendo red de vínculos...</p>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              No hay suficientes datos cruzados para generar el grafo.
            </div>
          ) : (
            <>
              {/* Botones superpuestos en el canvas */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <div className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs font-bold text-slate-600">
                  Nodos: {graphData.nodes.length} | Conexiones: {graphData.links.length}
                </div>
              </div>

              <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="id"
                nodeColor={getNodeColor}
                nodeRelSize={6}
                // Si el nodo tiene mucho peso, lo hacemos más grande
                nodeVal={(node) => Math.max(1, Math.min(node.val, 10))} 
                linkColor={() => '#cbd5e1'}
                linkWidth={(link) => Math.min(link.value, 5)}
                // Física atractiva: se repelen para no amontonarse
                d3VelocityDecay={0.3}
                onNodeClick={(node) => {
                  toast(`Entidad: ${node.id}`, { description: `Apariciones: ${node.val} | Categoría: ${node.category}` });
                }}
                // Personalizamos el renderizado para pintar el nombre debajo del círculo
                nodeCanvasObject={(node: GraphNode, ctx, globalScale) => {
                  const label = String(node.id ?? '');
                  const x = node.x ?? 0;
                  const y = node.y ?? 0;
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                  ctx.fillRect(x - bckgDimensions[0] / 2, y + 6, bckgDimensions[0], bckgDimensions[1]);

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = '#1e293b'; // Texto oscuro
                  ctx.fillText(label, x, y + 6 + (fontSize/2));

                  // Dibujamos el círculo del nodo
                  ctx.beginPath();
                  ctx.arc(x, y, Math.sqrt(node.val ?? 1) * 3, 0, 2 * Math.PI, false);
                  ctx.fillStyle = getNodeColor(node);
                  ctx.fill();
                }}
              />
            </>
          )}
        </div>

      </div>
    </div>
  );
}