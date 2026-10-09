'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
// `html2canvas-pro`: la versión original (1.4) no entiende los colores `oklch`
// de Tailwind v4 y fallaba SIEMPRE con "unsupported color function" — el
// botón no generaba ningún PDF en producción.
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { SHOW_MAPS_EVENT } from '@/lib/google-maps';

interface ExportPdfButtonProps {
  targetId: string; // El ID del div que queremos exportar
  fileName: string; // El nombre del archivo final
}

/** Espera a que ningún mapa dentro de `root` siga cargando, como mucho `timeoutMs`. */
async function waitForMaps(root: HTMLElement, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  // Un respiro para que el aviso anterior alcance a montar los mapas.
  await new Promise((resolve) => setTimeout(resolve, 150));
  while (Date.now() < deadline) {
    if (!root.querySelector('[data-map-state="loading"]')) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

export default function ExportPdfButton({ targetId, fileName }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const generatePDF = async () => {
    const input = document.getElementById(targetId);
    if (!input) {
      toast.error("No se encontró el contenido a exportar.");
      return;
    }

    setIsExporting(true);
    toast.info("Generando reporte ejecutivo, por favor espera...");

    try {
      // Los mapas incrustados solo se crean al entrar en pantalla: se les
      // pide que aparezcan y se espera (con tope) a que pinten su fondo.
      window.dispatchEvent(new Event(SHOW_MAPS_EVENT));
      await waitForMaps(input, 8000);

      // Hallazgo real de QA (2026-09-19): html2canvas capturaba el DOM de
      // inmediato al hacer clic, sin esperar a que el mapa (montaje
      // async + tiles remotos) ni las animaciones de entrada de Recharts
      // terminaran de pintar — el PDF salía con el mapa en blanco o
      // gráficas a medio dibujar. Dos `requestAnimationFrame` aseguran que
      // el navegador ya hizo al menos un ciclo de layout/paint completo, y
      // el `setTimeout` le da tiempo real a los tiles del mapa y a las
      // transiciones CSS/Recharts que no dependen de un solo frame.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      await new Promise((resolve) => setTimeout(resolve, 700));

      // 1. Capturar el elemento HTML como un Canvas de alta calidad
      const canvas = await html2canvas(input, {
        scale: 2, // Mejora la nitidez de los textos y gráficos
        useCORS: true, // Permite cargar íconos o fuentes externas
        backgroundColor: '#f8fafc', // Fondo slate-50 para que coincida
      });

      // JPEG y no PNG: con PNG un tablero completo pesaba más de 30 MB.
      const imgData = canvas.toDataURL('image/jpeg', 0.9);

      // 2. Configurar el documento PDF (Tamaño Carta - Letter)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      // 3. Calcular proporciones para que encaje en el ancho de la página
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // 4. Agregar Membrete Oficial (Opcional, pero da mucho peso)
      const HEADER = 25;
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Generado por: Zyron — inteligencia territorial`, 10, 10);
      pdf.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, 10, 15);

      // 5. Pegar la imagen debajo del membrete. Si es más alta que la hoja,
      // continúa en las páginas siguientes (antes se cortaba en la primera):
      // la misma imagen se coloca desplazada hacia arriba en cada página.
      const usable = pageHeight - HEADER;
      let pages = Math.max(1, Math.ceil((imgHeight - 0.5) / usable));
      let width = pdfWidth;
      let height = imgHeight;
      // Si a la última página solo le tocaría una franja, la imagen se encoge
      // un poco para caber en una página menos.
      const lastPage = imgHeight - (pages - 1) * usable;
      if (pages > 1 && lastPage < usable * 0.12) {
        pages -= 1;
        const shrink = (pages * usable) / imgHeight;
        width = pdfWidth * shrink;
        height = imgHeight * shrink;
      }
      const left = (pdfWidth - width) / 2;
      for (let page = 0; page < pages; page++) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', left, HEADER - page * usable, width, height, 'tablero', 'FAST');
        if (page > 0) {
          // Tapa la franja del membrete para que no asome el final de la página anterior.
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pdfWidth, HEADER, 'F');
        }
      }

      // 6. Descargar el archivo
      pdf.save(`${fileName}_${new Date().getTime()}.pdf`);
      toast.success("¡Reporte descargado con éxito!");

    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al generar el PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF} 
      disabled={isExporting}
      className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-md"
    >
      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-secondary" />}
      {isExporting ? 'Procesando...' : 'Exportar a PDF'}
    </Button>
  );
}