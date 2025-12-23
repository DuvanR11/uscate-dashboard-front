'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { 
  QrCode, Smartphone, Send, Upload, CheckCircle2, 
  AlertCircle, Loader2, Plus, Trash2, Download, FileText, 
  RefreshCw, MessageSquare 
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns'; // Necesario para formatear fechas
import { es } from 'date-fns/locale';

// --- UI COMPONENTS ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// --- INTERFACES & TYPES ---
interface ConnectionData {
  type: 'qr' | 'code' | 'connected';
  data?: string;
  message?: string;
  session?: string;
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
  type?: 'qr' | 'code' | 'connected';
  data?: string;
  session?: string;
  campaignId?: string;
}

interface CampaignHistory {
    id: string;
    date: string;
    total: number;
    sent: number;
    failed: number;
    status: string;
}

export default function WhatsAppPage() {
  // --- ESTADOS DE CONEXIÓN ---
  const [sessionName, setSessionName] = useState<string>('');
  const [method, setMethod] = useState<'qr' | 'code'>('qr');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
  const [activeLines, setActiveLines] = useState<string[]>([]);
  const [loadingConnect, setLoadingConnect] = useState<boolean>(false);

  // --- ESTADOS CAMPAÑA ---
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [sendingStatus, setSendingStatus] = useState<'sending' | 'success' | 'error' | null>(null);
  const [lastCampaign, setLastCampaign] = useState<{id: string, time: Date} | null>(null);
  
  // --- ESTADO HISTORIAL ---
  const [history, setHistory] = useState<CampaignHistory[]>([]);

  // --- EFECTOS ---
  useEffect(() => {
    fetchSessions();
    fetchHistory();

    // Polling: Actualizar historial cada 5 segundos para ver progreso en vivo
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- API CALLS ---
  const fetchSessions = () => {
    fetch('https://api.uscateguicol.com/api/sessions')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.activeLines)) {
          setActiveLines(data.activeLines);
        }
      })
      .catch(err => console.error("Error sesiones:", err));
  }

  const fetchHistory = async () => {
      try {
        const res = await fetch('https://api.uscateguicol.com/api/history');
        const data = await res.json();
        if(Array.isArray(data)) {
            setHistory(data);
        }
      } catch (e) {
          console.error("Error historial:", e);
      }
  }

  // --- HANDLERS CONEXIÓN ---
  const handleConnect = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return toast.error("Ingresa un nombre para la sesión");

    setLoadingConnect(true);
    setConnectionData(null);

    try {
      const payload = {
        sessionName,
        method,
        phoneNumber: method === 'code' ? phoneNumber : undefined,
      };

      const res = await fetch('https://api.uscateguicol.com/api/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse = await res.json();

      if (data.success) {
        if (data.type === 'connected') {
          if (!activeLines.includes(sessionName)) {
            setActiveLines((prev) => [...prev, sessionName]);
          }
          toast.success(`¡Sesión ${sessionName} conectada!`);
          setSessionName('');
          setPhoneNumber('');
        } else if (data.type) {
          setConnectionData({
            type: data.type,
            data: data.data,
            message: data.message,
            session: sessionName
          });
          toast.info("Escanea el QR o ingresa el código.");
        }
      } else {
        toast.error('Error del servidor', { description: data.error });
      }
    } catch (error) {
      toast.error('Error de conexión con el API.');
    } finally {
      setLoadingConnect(false);
    }
  };

  const handleLogout = async (sessionNameToClose: string) => {
    if(!confirm(`¿Desconectar línea ${sessionNameToClose}?`)) return;
    try {
        await fetch('https://api.uscateguicol.com/api/logout-session', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sessionName: sessionNameToClose })
        });
        setActiveLines(prev => prev.filter(line => line !== sessionNameToClose));
        toast.success(`Línea ${sessionNameToClose} desconectada.`);
    } catch (error) {
        toast.error("Error al cerrar sesión.");
    }
  };

  const confirmConnectionManually = () => {
    if (sessionName && !activeLines.includes(sessionName)) {
      setActiveLines((prev) => [...prev, sessionName]);
      setConnectionData(null);
      setSessionName('');
      setPhoneNumber('');
      toast.success("Sesión agregada manualmente.");
    }
  };

  // --- HANDLERS CAMPAÑA ---
  const handleSendCampaign = async (e: FormEvent) => {
    e.preventDefault();
    if (!csvFile || !imageFile) return toast.warning('Faltan archivos', { description: 'Carga el CSV y la Imagen.' });
    if (activeLines.length === 0) return toast.error('Sin conexión', { description: 'Vincula al menos una línea de WhatsApp.' });

    setSendingStatus('sending');

    const formData = new FormData();
    formData.append('fileCsv', csvFile);
    formData.append('image', imageFile);
    formData.append('message', caption);

    try {
      const res = await fetch('https://api.uscateguicol.com/api/send-campaign', {
        method: 'POST',
        body: formData,
      });
      const result: ApiResponse = await res.json();
      
      if (result.success) {
        setSendingStatus('success');
        if (result.campaignId) {
            setLastCampaign({ id: result.campaignId, time: new Date() });
            fetchHistory(); // Actualizar tabla inmediatamente
        }
        toast.success('Campaña Iniciada', { description: result.message });
        setCaption('');
      } else {
        toast.error('Error iniciando campaña', { description: result.error });
        setSendingStatus('error');
      }
    } catch (error) {
      setSendingStatus('error');
      toast.error('Error de red al enviar.');
    }
  };

  const handleDownloadReport = (campaignId: string) => {
    const filename = `report_${campaignId}.csv`;
    const url = `https://api.uscateguicol.com/api/download-report/${filename}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B2541] tracking-tight">Marketing WhatsApp</h1>
          <p className="text-slate-500 mt-1">Gestión de líneas y difusión masiva multimedia.</p>
        </div>
        <div className="hidden md:block">
           <span className="bg-green-50 text-green-800 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-green-100 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Motor W-API Activo
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: GESTIÓN DE DISPOSITIVOS */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* 1. TARJETA DE VINCULACIÓN */}
            <Card className="shadow-lg border-0 ring-1 ring-slate-100">
                <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold text-[#1B2541] flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-[#FFC400]" /> Nueva Vinculación
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    <form onSubmit={handleConnect} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="sessionName" className="text-xs font-bold uppercase text-slate-500">Nombre de la Sesión</Label>
                            <input 
                                id="sessionName"
                                type="text" 
                                placeholder="Ej: linea_ventas_1" 
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B2541] focus:border-transparent outline-none transition-all"
                                value={sessionName}
                                onChange={(e) => setSessionName(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div 
                                onClick={() => setMethod('qr')}
                                className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${method === 'qr' ? 'bg-[#1B2541]/5 border-[#1B2541] text-[#1B2541] font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'}`}
                            >
                                <QrCode className="w-5 h-5 mx-auto mb-1" />
                                <span className="text-xs">Código QR</span>
                            </div>
                            <div 
                                onClick={() => setMethod('code')}
                                className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${method === 'code' ? 'bg-[#1B2541]/5 border-[#1B2541] text-[#1B2541] font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'}`}
                            >
                                <Smartphone className="w-5 h-5 mx-auto mb-1" />
                                <span className="text-xs">Código Pairing</span>
                            </div>
                        </div>

                        {method === 'code' && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <Label className="text-xs font-bold uppercase text-slate-500">Número (con país)</Label>
                                <input 
                                    type="text" 
                                    placeholder="573001234567" 
                                    className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B2541] outline-none"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            disabled={loadingConnect}
                            className="w-full bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold"
                        >
                            {loadingConnect ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                            Generar QR / Código
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* 2. ÁREA DE RESPUESTA (QR / CÓDIGO) */}
            {connectionData && (
                <Card className="shadow-xl border-green-200 bg-green-50/50 animate-in zoom-in duration-300">
                    <CardContent className="p-6 text-center">
                        <p className="text-sm font-medium text-slate-700 mb-4">{connectionData.message}</p>
                        
                        {connectionData.type === 'qr' && connectionData.data && (
                            <div className="flex justify-center mb-4 bg-white p-2 rounded-xl inline-block shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={connectionData.data} alt="QR Code" className="w-48 h-48" />
                            </div>
                        )}

                        {connectionData.type === 'code' && (
                            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-slate-300 mb-4">
                                <span className="text-3xl font-mono font-black tracking-[0.2em] text-[#1B2541] select-all">
                                    {connectionData.data}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">Copia este código en WhatsApp</p>
                            </div>
                        )}

                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={confirmConnectionManually}
                            className="text-green-700 hover:text-green-800 hover:bg-green-100 text-xs"
                        >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Ya escaneé, continuar
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* 3. LISTA DE SESIONES ACTIVAS */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-100">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                        Líneas Conectadas
                        <Badge variant="outline" className="bg-slate-50 text-slate-600">{activeLines.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {activeLines.length === 0 ? (
                        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">
                            <Smartphone className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Sin líneas activas.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activeLines.map((line) => (
                                <div key={line} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-100 shadow-sm transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="bg-green-100 p-1.5 rounded-full">
                                                <Smartphone className="w-4 h-4 text-green-600" />
                                            </div>
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                                        </div>
                                        <span className="font-bold text-sm text-slate-700">{line}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" size="icon" 
                                        onClick={() => handleLogout(line)}
                                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>

        {/* COLUMNA DERECHA: CONFIGURACIÓN DE CAMPAÑA */}
        <div className="lg:col-span-8 space-y-6">
            <Card className="shadow-xl border-0">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
                    <CardTitle className="text-xl font-bold text-[#1B2541] flex items-center gap-2">
                        <Send className="h-5 w-5 text-[#FFC400]" /> Configuración de Envío Masivo
                    </CardTitle>
                    <CardDescription>
                        Envía imágenes y texto a tu base de datos CSV.
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="p-8">
                    <form onSubmit={handleSendCampaign} className="space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Input CSV */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Base de Datos (CSV)</Label>
                                <div className={`border-2 border-dashed rounded-xl p-6 transition-all text-center cursor-pointer relative group ${csvFile ? 'border-green-400 bg-green-50/20' : 'border-slate-200 hover:border-[#1B2541] hover:bg-slate-50'}`}>
                                    <input 
                                        type="file" 
                                        accept=".csv" 
                                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center">
                                        <div className={`p-3 rounded-full mb-2 transition-colors ${csvFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 group-hover:bg-[#1B2541] group-hover:text-[#FFC400]'}`}>
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
                                            {csvFile ? csvFile.name : 'Subir CSV'}
                                        </span>
                                        {!csvFile && <span className="text-[10px] text-slate-400">Req: col "telefono"</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Input Imagen */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Imagen Promocional</Label>
                                <div className={`border-2 border-dashed rounded-xl p-6 transition-all text-center cursor-pointer relative group ${imageFile ? 'border-green-400 bg-green-50/20' : 'border-slate-200 hover:border-[#1B2541] hover:bg-slate-50'}`}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center">
                                        <div className={`p-3 rounded-full mb-2 transition-colors ${imageFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 group-hover:bg-[#1B2541] group-hover:text-[#FFC400]'}`}>
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
                                            {imageFile ? imageFile.name : 'Subir Imagen'}
                                        </span>
                                        {!imageFile && <span className="text-[10px] text-slate-400">JPG, PNG</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Textarea */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Contenido del Mensaje</Label>
                            <textarea 
                                rows={5}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1B2541] focus:border-transparent outline-none resize-none text-sm font-medium"
                                placeholder="Hola {nombre}, te invitamos a..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                            ></textarea>
                            <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                                <span>Variables: {'{nombre}'}</span>
                                <span>Caracteres: {caption.length}</span>
                            </div>
                        </div>

                        {/* Botón Enviar */}
                        <div className="pt-4 border-t border-slate-100">
                            <Button 
                                type="submit" 
                                disabled={sendingStatus === 'sending' || activeLines.length === 0}
                                className={`w-full h-14 text-base font-bold shadow-lg transition-all
                                    ${activeLines.length === 0 
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                        : 'bg-[#1B2541] hover:bg-[#1B2541]/90 text-white hover:scale-[1.01]'
                                    }
                                `}
                            >
                                {sendingStatus === 'sending' ? (
                                    <><Loader2 className="animate-spin mr-2" /> Procesando Envíos...</>
                                ) : (
                                    <><Send className="mr-2 h-5 w-5 text-[#FFC400]" /> Iniciar Distribución Masiva</>
                                )}
                            </Button>
                        </div>
                    </form>

                    {/* ALERTAS CAMPAÑA ACTUAL */}
                    {lastCampaign && (
                        <div className="mt-6 bg-[#1B2541] rounded-xl p-6 relative overflow-hidden animate-in slide-in-from-bottom-4 shadow-lg">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC400] rounded-full blur-[60px] opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
                            
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-white font-bold flex items-center gap-2">
                                        <RefreshCw className="h-4 w-4 text-[#FFC400] animate-spin-slow" /> 
                                        Campaña en Progreso
                                    </h4>
                                    <p className="text-slate-300 text-xs mt-1">ID: {lastCampaign.id}</p>
                                    <p className="text-slate-400 text-[10px] mt-2 max-w-md">
                                        El sistema está enviando los mensajes en segundo plano. Observa el historial abajo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* --- SECCIÓN NUEVA: HISTORIAL DE ENVÍOS (PERSISTENTE) --- */}
            <Card className="shadow-md border-0 ring-1 ring-slate-100">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                    <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" /> Historial de Campañas
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Fecha</TableHead>
                                <TableHead>Campaña</TableHead>
                                <TableHead className="text-center w-[200px]">Progreso</TableHead>
                                <TableHead className="text-right">Reporte</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-slate-400 italic">
                                        No hay campañas registradas aún.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((camp) => (
                                    <TableRow key={camp.id} className="hover:bg-slate-50/50">
                                        <TableCell className="text-xs text-slate-500 font-medium">
                                            {format(new Date(camp.date), 'dd MMM HH:mm', { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                {camp.id.substring(5)}
                                            </span>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                Total: {camp.total}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex justify-between text-[10px] font-bold">
                                                    <span className="text-green-600">{camp.sent} OK</span>
                                                    <span className="text-red-500">{camp.failed} Error</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-[#1B2541] transition-all duration-500" 
                                                        style={{ width: `${(camp.sent / camp.total) * 100}%` }}
                                                    />
                                                </div>
                                                {camp.status === 'Procesando' && (
                                                    <p className="text-[9px] text-center text-blue-500 animate-pulse">Enviando...</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="outline" size="sm"
                                                onClick={() => handleDownloadReport(camp.id)}
                                                className="h-8 w-8 p-0 text-slate-500 hover:text-[#1B2541] hover:border-[#1B2541]"
                                                title="Descargar CSV"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}