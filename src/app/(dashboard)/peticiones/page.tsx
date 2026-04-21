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
  Loader2, FileText, UploadCloud, ArrowLeft, Download, 
  Scale, Save, Calendar, User, Hash, Clock, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import html2canvas from 'html2canvas';
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
    id: '', // Para identificar si ya existe en BD
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
      const canvas = await html2canvas(printRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Respuesta_Oficial_${formData.radicado || 'PQR'}.pdf`);
      toast.success("Documento exportado correctamente.");
    } catch (error) {
      toast.error("Error al generar el archivo PDF.");
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
                                    // Formateamos la fecha cortando todo lo que está después de la "T"
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
          ========================================================= */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div ref={printRef} className="bg-white text-black px-24 py-20 relative" style={{ width: '816px', minHeight: '1056px', fontFamily: 'Arial, sans-serif' }}>
          
          {/* CABECERA INSTITUCIONAL REPLICADA DEL PDF */}
          <div className="flex justify-between items-center mb-12">
            <div className="w-20 h-24 flex items-center justify-center">
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="Logo1" className="max-w-full max-h-full opacity-0" />
            </div>
            
            <div className="text-center flex-1">
              <h1 className="font-bold text-[15px] tracking-widest uppercase leading-tight">Congreso</h1>
              <h2 className="font-medium text-[13px] tracking-widest uppercase leading-tight">De La República</h2>
              <h2 className="font-medium text-[13px] tracking-widest uppercase leading-tight">De Colombia</h2>
              <h3 className="font-bold text-[14px] tracking-widest uppercase mt-3">Cámara De Representantes</h3>
            </div>

            <div className="w-20 h-24 flex items-center justify-center">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="Logo2" className="max-w-full max-h-full opacity-0" />
            </div>
          </div>

          <div className="mb-10 text-[13px]">
            <p className="mb-8 font-medium">Bogotá D.C., {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Señor(a) {formData.petitioner || 'Ciudadano(a)'},</p>
            <p className="font-bold mt-4 uppercase">Asunto: Respuesta a Derecho de Petición - {formData.radicado || 'S.R.'}</p>
          </div>

          {/* CUERPO DINÁMICO */}
          <div className="text-[13px] leading-[1.6] text-justify whitespace-pre-wrap" style={{ color: '#000000' }}>
            {formData.generatedDraft}
          </div>

          {/* BLOQUE DE FIRMA CONDICIONAL */}
          <div className="mt-16 text-[13px]">
            <p className="mb-4">Cordialmente,</p>
            
            <div className="h-20 flex items-end mb-2">
              {formData.status === 'FIRMADO' ? (
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="Firma" className="max-h-full" />
              ) : (
                <p className="italic text-slate-400 text-[10px]">(Firma pendiente de aprobación digital)</p>
              )}
            </div>

            <div className="border-t border-black w-72 pt-2">
              <p className="font-bold text-[14px]">José Jaime Uscátegui Pastrana</p>
              <p className="text-[12px]">Representante a la Cámara</p>
            </div>
          </div>

          {/* PIE DE PÁGINA OFICIAL */}
          <div className="absolute bottom-12 left-24 right-24 border-t-[1.5px] border-black pt-4">
            <div className="text-center text-[10px] text-black font-medium leading-relaxed">
              <p className="uppercase font-bold tracking-widest mb-1">USCÁTEGUI REPRESENTANTE A LA CÁMARA</p>
              <p>Correspondencia Edificio Nuevo del Congreso Carrera 7 No. 8-68 Primer Piso</p>
              <p>Conmutador: 3904050 - Extensión: 5310 - jose.uscategui@camara.gov.co</p>
              <div className="mt-1 flex justify-center items-center gap-4 text-[9px]">
                <span className="flex items-center gap-1 font-bold">f José Jaime Uscátegui</span>
                <span className="flex items-center gap-1 font-bold">@ @jjuscategui</span>
                <span className="font-bold">🌐 https://uscateguicol.com/</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}