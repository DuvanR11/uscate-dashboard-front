'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface ExportPdfButtonProps {
  targetId: string; // El ID del div que queremos exportar
  fileName: string; // El nombre del archivo final
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
      // 1. Capturar el elemento HTML como un Canvas de alta calidad
      const canvas = await html2canvas(input, {
        scale: 2, // Mejora la nitidez de los textos y gráficos
        useCORS: true, // Permite cargar íconos o fuentes externas
        backgroundColor: '#f8fafc', // Fondo slate-50 para que coincida
      });

      const imgData = canvas.toDataURL('image/png');

      // 2. Configurar el documento PDF (Tamaño Carta - Letter)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      // 3. Calcular proporciones para que encaje en la página
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // 4. Agregar Membrete Oficial (Opcional, pero da mucho peso)
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Generado por: Sistema de Inteligencia Territorial C5i`, 10, 10);
      pdf.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, 10, 15);

      // 5. Pegar la imagen de nuestro dashboard debajo del membrete
      pdf.addImage(imgData, 'PNG', 0, 25, pdfWidth, pdfHeight);

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
      className="bg-[#1B2541] hover:bg-slate-800 text-white gap-2 shadow-md"
    >
      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="text-[#FFC400]" />}
      {isExporting ? 'Procesando...' : 'Exportar a PDF'}
    </Button>
  );
}