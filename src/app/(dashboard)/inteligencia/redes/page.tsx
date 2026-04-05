'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, ArrowLeft, Loader2, Maximize, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// IMPORTANTE: Cargamos la librería dinámicamente para evitar errores SSR en Next.js
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Renderizando física del grafo...</div>
});

export default function RedesPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
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
      const res = await api.get('/intelligence/network');
      if (res.data.success) {
        setGraphData(res.data.data);
      }
    } catch (error) {
      toast.error("Error al cargar la telaraña de relaciones");
    } finally {
      setLoading(false);
    }
  };

  // Asignar colores según la categoría de la entidad
  const getNodeColor = (node: any) => {
    switch (node.category) {
      case 'SEGURIDAD': return '#ef4444'; // Rojo
      case 'PROPIEDAD_HORIZONTAL': return '#8b5cf6'; // Morado
      case 'POBREZA': return '#eab308'; // Amarillo
      case 'SALUD_MENTAL': return '#3b82f6'; // Azul
      default: return '#1B2541'; // Azul oscuro institucional
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-100 min-h-screen flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <Network className="text-[#FFC400]" /> Mapa de Vínculos
          </h1>
          <p className="text-slate-500 text-sm mt-1">Grafo interactivo de entidades, contratistas y políticos.</p>
        </div>
        
        <Link href="/inteligencia">
          <Button variant="outline" className="border-[#1B2541] text-[#1B2541] hover:bg-slate-200 gap-2">
            <ArrowLeft size={16} /> Volver al Mapa
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* LEYENDA Y CONTROLES */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto custom-scrollbar">
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-white border-b pb-4 rounded-t-xl">
              <CardTitle className="text-sm text-[#1B2541] flex items-center gap-2">
                <Search size={16} className="text-[#FFC400]"/> Inteligencia Relacional
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Este grafo conecta automáticamente a personas y organizaciones que han sido mencionadas juntas en noticias oficiales, investigaciones o panfletos.
              </p>
              
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Glosario de Nodos</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div> Seguridad / Delito</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div> Prop. Horizontal</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-3 h-3 rounded-full bg-[#eab308]"></div> Pobreza</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Salud / Sociedad</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-3 h-3 rounded-full bg-[#1B2541]"></div> Entidad General</div>
                </div>
              </div>

              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs border border-blue-100">
                <strong>💡 Tip Estratégico:</strong> Entre más grande sea un nodo, más menciones tiene. Entre más gruesa sea la línea, más veces han aparecido juntos. Puedes arrastrar los nodos para organizar el mapa.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CONTENEDOR DEL GRAFO */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-lg border border-slate-200 relative overflow-hidden" ref={containerRef}>
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={48} className="animate-spin text-[#FFC400] mb-4" />
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
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.id;
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                  ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 6, bckgDimensions[0], bckgDimensions[1]);

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = '#1e293b'; // Texto oscuro
                  ctx.fillText(label, node.x, node.y + 6 + (fontSize/2));

                  // Dibujamos el círculo del nodo
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, Math.sqrt(node.val) * 3, 0, 2 * Math.PI, false);
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