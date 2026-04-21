'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, UploadCloud, ArrowLeft, Download, 
  Scale, Save, Calendar, User, Hash, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// Nuevas librerías para exportación a PDF
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export default function PeticionesPage() {
  // Estados para el Listado y Dashboard
  const [petitions, setPetitions] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Estados de proceso
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Datos del Formulario y Borrador
  const [formData, setFormData] = useState({
    id: '', 
    radicado: '',
    petitioner: '',
    petitionType: 'GENERAL',
    status: 'BORRADOR',
    receivedAt: new Date().toISOString().split('T')[0],
    originalText: '',
    generatedDraft: ''
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPetitions();
  }, []);

  const fetchPetitions = async () => {
    try {
      const res = await api.get('/intelligence/petition/list');
      setPetitions(res.data);
    } catch (error) {
      toast.error("No se pudo cargar el historial de peticiones.");
    } finally {
      setLoadingList(false);
    }
  };

  const handleAiProcess = async () => {
    if (!selectedFile) return toast.error("Sube el PDF primero.");
    
    setLoadingAi(true);
    const uploadData = new FormData();
    uploadData.append('file', selectedFile);

    try {
      const res = await api.post('/intelligence/petition/respond', uploadData);
      setFormData({ ...formData, generatedDraft: res.data.draft });
      toast.success("IA: Borrador generado con éxito.");
    } catch (error) {
      toast.error("Error al procesar el PDF con la IA.");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSaveToDb = async () => {
    if (!formData.generatedDraft) return toast.error("No hay borrador para guardar.");
    setIsSaving(true);
    try {
      const res = await api.post('/intelligence/petition/save', formData);
      setFormData({ ...formData, id: res.data.petitionId });
      toast.success("Guardado en el historial de la UTL.");
      fetchPetitions();
    } catch (error) {
      toast.error("Error al persistir en base de datos.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!formData.id) {
      return toast.warning("Primero debes 'Guardar' el borrador antes de cambiar su estado.");
    }

    setIsSaving(true);
    try {
      const res = await api.patch(`/intelligence/petition/${formData.id}/status`, { status: newStatus });
      if (res.data.success) {
        setFormData({ ...formData, status: newStatus });
        toast.success(res.data.message);
        fetchPetitions();
      }
    } catch (error) {
      toast.error("Error al actualizar el estado del documento.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);

    try {
      // 1. Renderizamos a PNG forzando dimensiones y opacidad
      const dataUrl = await toPng(printRef.current, {
        quality: 1,
        pixelRatio: 2, 
        skipFonts: false,
        style: {
          opacity: '1',
          visibility: 'visible',
          display: 'flex',
        },
      });

      // 2. Creamos el PDF en formato Carta (Letter)
      const pdf = new jsPDF('p', 'mm', 'letter');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // 3. Pegamos la imagen y guardamos
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Respuesta_Oficial_${formData.radicado || 'PQR'}.pdf`);
      
      toast.success("PDF generado con éxito.");
    } catch (error) {
      console.error("ERROR GENERANDO PDF:", error);
      toast.error("Error técnico al generar el PDF. Revisa la consola.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1B2541] tracking-tight flex items-center gap-2">
            <Scale className="text-[#FFC400]" /> Gestión de Peticiones (PQR)
          </h1>
          <p className="text-slate-500 text-sm">Control legal, semáforos de vencimiento y redacción asistida.</p>
        </div>
        <Link href="/inteligencia">
          <Button variant="outline" className="border-[#1B2541] text-[#1B2541] hover:bg-slate-200">
            <ArrowLeft size={16} className="mr-2" /> Volver al Tablero
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-slate-200 p-1">
          <TabsTrigger value="dashboard">Tablero de Control</TabsTrigger>
          <TabsTrigger value="new">Redactar Nueva Respuesta</TabsTrigger>
        </TabsList>

        {/* --- TABS 1: DASHBOARD DE SEGUIMIENTO --- */}
        <TabsContent value="dashboard">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock size={18} className="text-blue-600"/> Monitoreo de Términos (Ley 1755 de 2015)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b text-slate-400 uppercase text-[10px] font-bold tracking-widest">
                        <th className="py-3 px-4">Radicado / Ciudadano</th>
                        <th className="py-3 px-4">Tipo de Petición</th>
                        <th className="py-3 px-4">Fecha Límite</th>
                        <th className="py-3 px-4">Estado Actual</th>
                        <th className="py-3 px-4">Días Hábiles Restantes</th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {petitions.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-700">{p.radicado}</p>
                            <p className="text-[11px] text-slate-500 uppercase">{p.petitioner}</p>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="text-[10px]">{p.petitionType}</Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">{new Date(p.deadlineAt).toLocaleDateString('es-CO')}</td>
                          <td className="py-3 px-4">
                            <Badge className={`text-[10px] ${p.status === 'FIRMADO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {p.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${p.trafficLight === 'RED' ? 'bg-red-500 animate-pulse' : p.trafficLight === 'YELLOW' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                              <span className="font-black">{p.daysLeft} días</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-blue-600 font-bold" 
                              onClick={() => { 
                                setFormData({ 
                                  ...p, 
                                  receivedAt: p.receivedAt ? new Date(p.receivedAt).toISOString().split('T')[0] : '' 
                                }); 
                                toast.info("Cargado en el editor"); 
                              }}
                            >
                              Ver / Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TABS 2: REDACTOR ASISTIDO --- */}
        <TabsContent value="new">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Configuración del Radicado */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="shadow-sm border-0">
                <CardHeader className="bg-[#1B2541] text-white py-3 rounded-t-lg text-center">
                  <CardTitle className="text-xs uppercase tracking-widest">Parámetros de Ingreso</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Radicado</label>
                      <Input value={formData.radicado} onChange={(e)=>setFormData({...formData, radicado: e.target.value})} className="h-9 text-xs" placeholder="N° Radicado" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fecha Recibo</label>
                      <Input type="date" value={formData.receivedAt} onChange={(e)=>setFormData({...formData, receivedAt: e.target.value})} className="h-9 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre Peticionario</label>
                    <Input value={formData.petitioner} onChange={(e)=>setFormData({...formData, petitioner: e.target.value})} className="h-9 text-xs" placeholder="Ej: Juan Pérez o Entidad X" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo Legal</label>
                    <Select value={formData.petitionType} onValueChange={(val)=>setFormData({...formData, petitionType: val})}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFORMACION">Información/Docs (10 días)</SelectItem>
                        <SelectItem value="GENERAL">General/Quejas (15 días)</SelectItem>
                        <SelectItem value="CONSULTA">Consulta de Fondo (30 días)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="pt-4 border-t space-y-3">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-all">
                      <input type="file" accept=".pdf" onChange={(e)=>setSelectedFile(e.target.files?.[0] || null)} className="hidden" id="pdf-upload" />
                      <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                        <UploadCloud size={28} className="text-slate-400 mb-2" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase truncate max-w-full">
                          {selectedFile ? selectedFile.name : 'Subir PDF del Ciudadano'}
                        </span>
                      </label>
                    </div>
                    <Button onClick={handleAiProcess} disabled={loadingAi || !selectedFile} className="w-full bg-[#1B2541] hover:bg-slate-800 h-11 text-xs font-black tracking-widest uppercase">
                      {loadingAi ? <Loader2 className="animate-spin mr-2"/> : <Scale size={16} className="mr-2"/>} Redactar con IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Editor de Respuesta con Flujo de Aprobación */}
            <div className="lg:col-span-8">
              <Card className="h-full min-h-[650px] flex flex-col shadow-sm border-0">
                <CardHeader className="border-b py-3 flex flex-row justify-between items-center bg-white rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm text-[#1B2541] font-bold">Proyección Jurídica</CardTitle>
                    {formData.status && <Badge className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[9px]">{formData.status.replace('_', ' ')}</Badge>}
                  </div>
                  
                  <div className="flex gap-2">
                    {formData.generatedDraft && (
                      <>
                        {formData.status === 'BORRADOR' && (
                          <>
                            <Button variant="outline" size="sm" onClick={handleSaveToDb} disabled={isSaving} className="text-xs">
                              <Save size={14} className="mr-2"/> Guardar
                            </Button>
                            <Button size="sm" onClick={() => handleStatusChange('EN_REVISION')} disabled={isSaving} className="bg-yellow-600 hover:bg-yellow-700 text-xs text-white">
                              Enviar a Revisión
                            </Button>
                          </>
                        )}

                        {formData.status === 'EN_REVISION' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleStatusChange('BORRADOR')} disabled={isSaving} className="text-xs">
                              Devolver
                            </Button>
                            <Button size="sm" onClick={() => handleStatusChange('FIRMADO')} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-xs text-white">
                              Aprobar y Firmar
                            </Button>
                          </>
                        )}

                        {formData.status === 'FIRMADO' && (
                          <Button size="sm" onClick={handleExportPDF} disabled={isExporting} className="bg-[#1B2541] hover:bg-slate-800 text-xs text-white">
                            {isExporting ? <Loader2 size={14} className="animate-spin mr-2"/> : <Download size={14} className="mr-2"/>} 
                            Exportar PDF Firmado
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 bg-white">
                  <Textarea 
                    value={formData.generatedDraft}
                    onChange={(e)=>setFormData({...formData, generatedDraft: e.target.value})}
                    disabled={formData.status === 'FIRMADO'}
                    className="w-full h-full min-h-[580px] p-10 border-0 focus-visible:ring-0 resize-none font-serif text-[13pt] leading-relaxed text-slate-800"
                    placeholder="El borrador jurídico se mostrará aquí..."
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* =========================================================
          CONTENEDOR DEL MEMBRETE OFICIAL (OCULTO PARA EXPORTACIÓN)
          Posicionado fuera de pantalla, tamaño fijo y estilos 100% en línea
          ========================================================= */}
      <div 
        style={{ 
          position: 'absolute', 
          top: '-10000px', 
          left: 0, 
          width: '100%',
          pointerEvents: 'none'
        }}
      >
        <div 
          ref={printRef} 
          style={{ 
            width: '794px', // Ancho exacto A4/Letter
            minHeight: '1123px', // Alto mínimo A4/Letter
            padding: '80px', 
            backgroundColor: '#FFFFFF', 
            color: '#000000', 
            fontFamily: 'Arial, sans-serif',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          
          {/* CABECERA: Logos y Título */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ width: '80px' }}>
               {/* Reemplazar con el base64 real del escudo de Colombia */}
               <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR42mP8/w8AAwCB/vv96f8AAAAASUVORK5CYII=" style={{ width: '100%' }} alt="Escudo" />
            </div>
            
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontWeight: 'bold', fontSize: '16px', margin: 0, textTransform: 'uppercase' }}>Congreso de la República</p>
              <p style={{ fontSize: '14px', margin: 0, textTransform: 'uppercase' }}>Cámara de Representantes</p>
              <p style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '10px' }}>JOSÉ JAIME USCÁTEGUI PASTRANA</p>
            </div>

            <div style={{ width: '80px' }}>
               {/* Reemplazar con el base64 real del logo de la Cámara */}
               <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR42mP8/w8AAwCB/vv96f8AAAAASUVORK5CYII=" style={{ width: '100%' }} alt="Logo Camara" />
            </div>
          </div>

          {/* CUERPO DEL DOCUMENTO */}
          <div style={{ fontSize: '13px', textAlign: 'justify', flex: 1 }}>
            <p style={{ marginBottom: '30px' }}>Bogotá D.C., {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            
            <p style={{ fontWeight: 'bold', margin: 0 }}>Señor(a):</p>
            <p style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px' }}>{formData.petitioner || 'Ciudadano(a)'}</p>
            
            <p style={{ fontWeight: 'bold', marginBottom: '30px' }}>ASUNTO: RESPUESTA A DERECHO DE PETICIÓN - RAD. {formData.radicado || 'S.R.'}</p>

            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {formData.generatedDraft}
            </div>
          </div>

          {/* FIRMA Y PIE DE PÁGINA */}
          <div style={{ marginTop: '50px' }}>
            <p style={{ margin: 0 }}>Cordialmente,</p>
            <div style={{ height: '80px', marginTop: '10px' }}>
                {formData.status === 'FIRMADO' && (
                   // Reemplazar con el base64 real de la firma
                   <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR42mP8/w8AAwCB/vv96f8AAAAASUVORK5CYII=" style={{ height: '100%' }} alt="Firma Representante" />
                )}
            </div>
            <div style={{ borderTop: '1px solid #000000', width: '250px', paddingTop: '5px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>JOSÉ JAIME USCÁTEGUI PASTRANA</p>
              <p style={{ fontSize: '12px', margin: 0 }}>Representante a la Cámara</p>
            </div>
          </div>

          <div style={{ marginTop: '40px', paddingTop: '10px', borderTop: '1px solid #EEEEEE', textAlign: 'center', fontSize: '10px', color: '#666666' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>UTL JOSÉ JAIME USCÁTEGUI - CONGRESO DE LA REPÚBLICA</p>
            <p style={{ margin: 0 }}>Edificio Nuevo del Congreso, Carrera 7 No. 8-68 | jose.uscategui@camara.gov.co</p>
          </div>
        </div>
      </div>

    </div>
  );
}