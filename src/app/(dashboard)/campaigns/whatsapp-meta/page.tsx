'use client';

import { useEffect, useState } from "react";
import { 
  Plus, Search, RefreshCw, Send, CheckCircle2, 
  XCircle, Clock, AlertTriangle, MessageSquare 
} from "lucide-react";
import { toast } from 'sonner';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// 👇 IMPORTANTE: Agregamos DialogTitle aquí
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"; 
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";

// Componentes Internos
import TemplateCreator from "@/components/dashboard/campaigns/meta/TemplateCreator";
import BroadcastModal from "@/components/dashboard/campaigns/meta/BroadcastModal";

// Configuración
const token = process.env.NEXT_PUBLIC_YOUR_ACCESS_TOKEN!;
const whatsappId = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_ID!;
const version = process.env.NEXT_PUBLIC_GRAPH_API_VERSION || "v19.0";

export default function WhatsAppMetaPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados Modales
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://graph.facebook.com/${version}/${whatsappId}/message_templates?access_token=${token}&limit=100`
      );
      const json = await response.json();
      
      if (json.error) throw new Error(json.error.message);

      const data = json.data || [];
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (error: any) {
      console.error(error);
      toast.error("Error al cargar plantillas", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = templates.filter((t) => 
      t.name.toLowerCase().includes(term) || 
      t.category.toLowerCase().includes(term)
    );
    setFilteredTemplates(filtered);
  }, [searchTerm, templates]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1"><CheckCircle2 className="w-3 h-3"/> Aprobada</Badge>;
      case "REJECTED": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1"><XCircle className="w-3 h-3"/> Rechazada</Badge>;
      case "PENDING": return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200 gap-1"><Clock className="w-3 h-3"/> Pendiente</Badge>;
      default: return <Badge variant="outline" className="gap-1"><AlertTriangle className="w-3 h-3"/> {status}</Badge>;
    }
  };

  const handleOpenBroadcast = (template: any) => {
    setSelectedTemplate(template);
    setIsBroadcastOpen(true);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B2541] tracking-tight">Plantillas Oficiales</h1>
          <p className="text-slate-500 mt-1">Administra tus mensajes aprobados por Meta (WhatsApp Business API).</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" onClick={fetchTemplates} disabled={loading} className="border-slate-200 text-slate-600">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
            <Button onClick={() => setIsCreatorOpen(true)} className="bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold shadow-lg shadow-blue-900/20">
                <Plus className="w-4 h-4 mr-2" /> Nueva Plantilla
            </Button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <Card className="border-0 shadow-xl ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-[#FFC400]" /> Listado de Plantillas
                </CardTitle>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Buscar por nombre..." 
                        className="pl-9 bg-white border-slate-200 focus:ring-[#1B2541]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50/50">
                        <TableHead className="w-[300px] font-bold text-slate-500">Nombre</TableHead>
                        <TableHead className="font-bold text-slate-500">Idioma / Categoría</TableHead>
                        <TableHead className="font-bold text-slate-500">Estado</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 pr-6">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredTemplates.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center text-slate-400 flex flex-col items-center justify-center w-full">
                                {loading ? <RefreshCw className="animate-spin h-8 w-8 mb-2 opacity-50"/> : <Search className="h-8 w-8 mb-2 opacity-20"/>}
                                {loading ? "Cargando plantillas..." : "No se encontraron plantillas."}
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredTemplates.map((template) => (
                            <TableRow key={template.id} className="group hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[#1B2541] text-base">{template.name.replace(/_/g, " ")}</span>
                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {template.id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1.5 items-start">
                                        <span className="text-sm text-slate-600 font-medium">
                                            {template.language === 'es' || template.language === 'es_CO' ? '🇪🇸 Español' : '🇺🇸 Inglés'}
                                        </span>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase font-bold tracking-wide border border-slate-200">
                                            {template.category}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(template.status)}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    {/* Botón siempre visible, sin opacidad hover */}
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleOpenBroadcast(template)}
                                            disabled={template.status !== "APPROVED"}
                                            className={`${template.status === "APPROVED" ? "bg-[#FFC400] text-[#1B2541] hover:bg-[#FFC400]/80" : "bg-slate-100 text-slate-400"} font-bold border-none shadow-sm transition-all`}
                                        >
                                            <Send className="w-3.5 h-3.5 mr-1.5" /> Difundir
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      {/* MODAL CREADOR */}
      <Dialog open={isCreatorOpen} onOpenChange={setIsCreatorOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 overflow-hidden bg-gray-50 border-none rounded-2xl shadow-2xl">
            {/* 👇 AQUÍ ESTÁ LA MAGIA: DialogTitle oculto para accesibilidad */}
            <DialogTitle className="sr-only">Crear Nueva Plantilla WhatsApp</DialogTitle>
            
            <TemplateCreator onClose={() => setIsCreatorOpen(false)} onSuccess={fetchTemplates} />
        </DialogContent>
      </Dialog>

      {/* MODAL BROADCAST */}
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent className="max-w-xl p-0 bg-white border-none rounded-2xl overflow-hidden shadow-2xl">
            {/* 👇 AQUÍ TAMBIÉN: DialogTitle oculto */}
            <DialogTitle className="sr-only">Configurar Difusión Masiva</DialogTitle>

            {selectedTemplate && (
                <BroadcastModal 
                    template={selectedTemplate} 
                    onClose={() => setIsBroadcastOpen(false)} 
                />
            )}
        </DialogContent>
      </Dialog>

    </div>
  );
}