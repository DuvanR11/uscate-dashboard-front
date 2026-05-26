'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Loader2,
  Save,
  Scale,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LegalRichEditor } from '@/components/dashboard/petitions/LegalRichEditor';
import DOMPurify from 'dompurify';

type PetitionStatus = 'BORRADOR' | 'EN_REVISION' | 'FIRMADO';
type PetitionDirection = 'CREADA' | 'RESPUESTA';

type PetitionForm = {
  id: string;
  radicado: string;
  petitioner: string;
  petitionType: string;
  petitionDirection: PetitionDirection;
  status: PetitionStatus;
  receivedAt: string;
  originalText: string;
  generatedDraft: string;
  signedBy?: string;
  signedAt?: string;
  signatureImage?: string;
};

const initialForm: PetitionForm = {
  id: '',
  radicado: '',
  petitioner: '',
  petitionType: 'GENERAL',
  petitionDirection: 'CREADA',
  signedBy: '',
  signedAt: '',
  signatureImage: '',
  status: 'BORRADOR',
  receivedAt: new Date().toISOString().split('T')[0],
  originalText: '',
  generatedDraft: '',
};

const petitionTypeInfo: Record<string, { label: string; days: string; help: string }> = {
  INFORMACION: {
    label: 'Información / documentos',
    days: '10 días hábiles',
    help: 'Solicitudes de copias, datos, documentos o información pública.',
  },
  GENERAL: {
    label: 'Petición general',
    days: '15 días hábiles',
    help: 'Quejas, reclamos, solicitudes particulares o peticiones ciudadanas.',
  },
  CONSULTA: {
    label: 'Consulta',
    days: '30 días hábiles',
    help: 'Solicitudes de concepto o interpretación jurídica/administrativa.',
  },
};

export default function PeticionesPage() {
  const [petitions, setPetitions] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [editorMode, setEditorMode] = useState<'EDITAR' | 'VISTA'>('EDITAR');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  const [formData, setFormData] = useState<PetitionForm>(initialForm);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPetitions();
  }, []);

  const filteredPetitions = useMemo(() => {
    const value = query.toLowerCase().trim();

    if (!value) return petitions;

    return petitions.filter((petition) => {
      return [
        petition.radicado,
        petition.petitioner,
        petition.petitionType,
        petition.status,
        petition.petitionDirection,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value);
    });
  }, [petitions, query]);

  const stats = useMemo(() => {
    return {
      total: petitions.length,
      draft: petitions.filter((p) => p.status === 'BORRADOR').length,
      review: petitions.filter((p) => p.status === 'EN_REVISION').length,
      signed: petitions.filter((p) => p.status === 'FIRMADO').length,
      red: petitions.filter((p) => p.trafficLight === 'RED').length,
      createdByMe: petitions.filter((p) => p.petitionDirection === 'CREADA').length,
      answeredByMe: petitions.filter((p) => p.petitionDirection !== 'CREADA').length,
    };
  }, [petitions]);

  const selectedType = petitionTypeInfo[formData.petitionType];

  const canGenerate =
    !!selectedFile || formData.originalText.trim().length >= 30;

  const canSave =
    formData.petitioner.trim().length >= 3 &&
    formData.generatedDraft.trim().length >= 30;


  const normalizeDraftToHtml = (value: string) => {
    if (!value?.trim()) return '';

    const cleaned = value.trim();

    const hasHtml =
      /<\/?(p|br|strong|ul|ol|li|div|h1|h2|h3)[\s>/]/i.test(cleaned);

    if (hasHtml) return cleaned;

    return cleaned
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  };

  const fetchPetitions = async () => {
    setLoadingList(true);

    try {
     const res = await api.get('/petitions', {
      params: {
        page: 1,
        limit: 100,
      },
    });

    setPetitions(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      toast.error('No se pudo cargar el historial de peticiones.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!formData.id) return;

    const timeout = setTimeout(async () => {
      try {
      await api.patch(
        `/petitions/${formData.id}`,
        buildPetitionPayload(),
      );
      } catch {}
    }, 3000);

    return () => clearTimeout(timeout);
  }, [formData.generatedDraft]);

 
  function PetitionLetterhead() {
    return (
      <div className="mb-8">
        <img
          src="/templates/membrete_utl_header.png"
          alt="Membrete UTL"
          className="w-full object-contain"
        />
      </div>
    );
  }


  const handleSignatureUpload = (file?: File) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        signatureImage: String(reader.result),
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleAiProcess = async () => {
    if (!canGenerate) {
      toast.error('Sube un PDF o escribe apuntes suficientes para redactar.');
      return;
    }

    setLoadingAi(true);

    try {
      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        uploadData.append('petitionType', formData.petitionType);
        uploadData.append('petitioner', formData.petitioner);
        uploadData.append('radicado', formData.radicado);
        uploadData.append('petitionDirection', formData.petitionDirection);
        uploadData.append('originalText', formData.originalText);

        const res = await api.post('/intelligence/petition/respond', uploadData);

        setFormData((prev) => ({
          ...prev,
          generatedDraft: normalizeAiDraft(res.data?.draft || ''),
        }));
      } else {
        const res = await api.post('/intelligence/petition/draft', {
          petitioner: formData.petitioner,
          petitionType: formData.petitionType,
          petitionDirection: formData.petitionDirection,
          radicado: formData.radicado,
          receivedAt: formData.receivedAt,
          originalText: formData.originalText,
        });

        setFormData((prev) => ({
          ...prev,
          generatedDraft: normalizeAiDraft(res.data?.draft || ''),
        }));
      }

      toast.success('Borrador generado con IA.');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el borrador con IA.');
    } finally {
      setLoadingAi(false);
    }
  };


  const buildPetitionPayload = (override: Partial<PetitionForm> = {}) => {
    const data = {
      ...formData,
      ...override,
    };

    return {
      radicado: data.radicado,
      petitioner: data.petitioner,
      petitionType: data.petitionType,
      petitionDirection: data.petitionDirection,
      status: data.status,
      receivedAt: data.receivedAt,
      originalText: data.originalText,
      generatedDraft: data.generatedDraft,
      signedAt: data.signedAt || null,
      signedBy: data.signedBy || null,
      signatureImage: data.signatureImage || null,
    };
  };

  const handleSaveToDb = async () => {
    if (!canSave) {
      toast.error('Completa peticionario y borrador antes de guardar.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildPetitionPayload({
        generatedDraft: normalizeDraftToHtml(formData.generatedDraft),
      });

      const res = formData.id
        ? await api.patch(`/petitions/${formData.id}`, payload)
        : await api.post('/petitions', payload);

      setFormData((prev) => ({
        ...prev,
        ...res.data,
        generatedDraft: normalizeDraftToHtml(res.data?.generatedDraft || payload.generatedDraft),
        id: res.data?.id || prev.id,
      }));

      toast.success('Petición guardada correctamente.');
      await fetchPetitions();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la petición.');
    } finally {
      setIsSaving(false);
    }
  };

 const handleStatusChange = async (newStatus: PetitionStatus) => {
    if (!formData.id) {
      toast.warning('Primero guarda el borrador antes de cambiar el estado.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await api.patch(`/petitions/${formData.id}`, {
        status: newStatus,
      });

      setFormData((prev) => ({
        ...prev,
        ...res.data,
        status: newStatus,
      }));

      toast.success('Estado actualizado.');
      await fetchPetitions();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar el estado.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPetition = (petition: any) => {
    setFormData({
      id: petition.id || '',
      radicado: petition.radicado || '',
      petitioner: petition.petitioner || '',
      petitionType: petition.petitionType || 'GENERAL',
      status: petition.status || 'BORRADOR',
      receivedAt: petition.receivedAt
        ? new Date(petition.receivedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      originalText: petition.originalText || '',
      generatedDraft: normalizeDraftToHtml(
          petition.generatedDraft || petition.draft || '',
        ),
      petitionDirection: petition.petitionDirection || 'CREADA',
      signedBy: petition.signedBy || '',
      signedAt: petition.signedAt || '',
      signatureImage: petition.signatureImage || '',
    });

    setSelectedFile(null);
    setActiveTab('new');
    toast.success('Petición cargada en el editor.');
  };


  const normalizeAiDraft = (value: string) => {
    if (!value) return '';

    const trimmed = value.trim();

    if (trimmed.includes('<p') || trimmed.includes('<br') || trimmed.includes('<div')) {
      return trimmed;
    }

    return trimmed
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  };

  const handleSignDocument = async () => {
    if (!formData.id) {
      toast.warning('Primero guarda el documento antes de firmar.');
      return;
    }

    if (!formData.signatureImage) {
      toast.warning('Debes adjuntar una imagen de firma antes de aprobar y firmar.');
      return;
    }

    const signedPayload = buildPetitionPayload({
      status: 'FIRMADO',
      signedBy: 'JOSÉ JAIME USCÁTEGUI PASTRANA',
      signedAt: new Date().toISOString(),
    });

    setIsSaving(true);

    try {
      const res = await api.patch(`/petitions/${formData.id}`, signedPayload);

      setFormData((prev) => ({
        ...prev,
        ...signedPayload,
        ...res.data,
      }));

      toast.success('Documento firmado correctamente.');
      await fetchPetitions();
    } catch (error) {
      console.error(error);
      toast.error('Error al firmar el documento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewDraft = () => {
    setFormData(initialForm);
    setSelectedFile(null);
    setActiveTab('new');
  };

  const handleExportPDF = async () => {
    if (!formData.id) {
      toast.warning('Primero guarda el documento antes de exportar.');
      return;
    }

    setIsExporting(true);

    try {
      const res = await api.get(`/petitions/${formData.id}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `derecho-peticion-${formData.radicado || formData.id}.pdf`;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF generado correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#1B2541] md:text-3xl">
            <Scale className="text-[#FFC400]" />
            Gestión de Derechos de Petición
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Redacción, revisión, control de términos y exportación oficial.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleNewDraft} className="bg-[#1B2541] text-white hover:bg-slate-800">
            <Sparkles size={16} className="mr-2" />
            Nueva respuesta
          </Button>

          <Link href="/inteligencia">
            <Button variant="outline" className="border-[#1B2541] text-[#1B2541]">
              <ArrowLeft size={16} className="mr-2" />
              Volver
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <Stat label="Total" value={stats.total} icon={FileText} />
        <Stat label="Borrador" value={stats.draft} icon={Save} />
        <Stat label="En revisión" value={stats.review} icon={Clock} />
        <Stat label="Firmadas" value={stats.signed} icon={CheckCircle} />
        <Stat label="Críticas" value={stats.red} icon={ShieldAlert} danger />
        <Stat label="Creadas por mí" value={stats.createdByMe} icon={Send} />
        <Stat label="Respuestas" value={stats.answeredByMe} icon={FileText} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-200 p-1">
          <TabsTrigger value="dashboard">Tablero de control</TabsTrigger>
          <TabsTrigger value="new">Editor jurídico</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock size={18} className="text-blue-600" />
                Monitoreo de términos
              </CardTitle>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar radicado, ciudadano o estado..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent>
              {loadingList ? (
                <div className="py-10 text-center">
                  <Loader2 className="mx-auto animate-spin text-slate-400" />
                </div>
              ) : filteredPetitions.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <th className="px-4 py-3">Radicado / Ciudadano</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Origen</th>
                        <th className="px-4 py-3">Fecha límite</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Días restantes</th>
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {filteredPetitions.map((p) => (
                        <tr key={p.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-700">
                              {p.radicado || 'Sin radicado'}
                            </p>
                            <p className="text-[11px] uppercase text-slate-500">
                              {p.petitioner || 'Sin peticionario'}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-[10px]">
                              {p.petitionType}
                            </Badge>
                          </td>

                          <td className="px-4 py-3">
                            <Badge
                              className={
                                p.petitionDirection === 'CREADA'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }
                            >
                              {p.petitionDirection === 'CREADA' ? 'Creada por mí' : 'Respuesta'}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 font-mono text-xs">
                            {p.deadlineAt
                              ? new Date(p.deadlineAt).toLocaleDateString('es-CO')
                              : 'N/A'}
                          </td>

                          <td className="px-4 py-3">
                            <StatusBadge status={p.status} />
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-3 w-3 rounded-full ${
                                  p.trafficLight === 'RED'
                                    ? 'animate-pulse bg-red-500'
                                    : p.trafficLight === 'YELLOW'
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                }`}
                              />
                              <span className="font-black">
                                {p.daysLeft ?? 'N/A'} días
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="font-bold text-blue-600"
                              onClick={() => handleLoadPetition(p)}
                            >
                              Ver / Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="No hay peticiones registradas." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="rounded-t-lg bg-[#1B2541] py-3 text-center text-white">
                  <CardTitle className="text-xs uppercase tracking-widest">
                    Parámetros de ingreso
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 p-4">
                  <Field label="Radicado" icon={FileText}>
                    <Input
                      value={formData.radicado}
                      onChange={(e) =>
                        setFormData({ ...formData, radicado: e.target.value })
                      }
                      className="h-9 text-xs"
                      placeholder="N° Radicado"
                    />
                  </Field>

                  <Field label="Fecha recibo" icon={Calendar}>
                    <Input
                      type="date"
                      value={formData.receivedAt}
                      onChange={(e) =>
                        setFormData({ ...formData, receivedAt: e.target.value })
                      }
                      className="h-9 text-xs"
                    />
                  </Field>

                  <Field label="Nombre peticionario" icon={User}>
                    <Input
                      value={formData.petitioner}
                      onChange={(e) =>
                        setFormData({ ...formData, petitioner: e.target.value })
                      }
                      className="h-9 text-xs"
                      placeholder="Ej: Juan Pérez"
                    />
                  </Field>

                  <Field label="Tipo legal" icon={Scale}>
                    <Select
                      value={formData.petitionType}
                      onValueChange={(val) =>
                        setFormData({ ...formData, petitionType: val })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFORMACION">
                          Información / Docs (10 días)
                        </SelectItem>
                        <SelectItem value="GENERAL">
                          General / Quejas (15 días)
                        </SelectItem>
                        <SelectItem value="CONSULTA">
                          Consulta de fondo (30 días)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                    
                  <Field label="Tipo de documento" icon={Send}>
                  <Select
                    value={formData.petitionDirection}
                    onValueChange={(val) =>
                      setFormData({
                        ...formData,
                        petitionDirection: val as 'CREADA' | 'RESPUESTA',
                      })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESPUESTA">
                        Respuesta a petición recibida
                      </SelectItem>
                      <SelectItem value="CREADA">
                        Derecho de petición creado por la UTL
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                  {selectedType && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                      <b>{selectedType.days}</b>
                      <br />
                      {selectedType.help}
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">
                      Apuntes o hechos
                    </label>
                    <Textarea
                      rows={5}
                      value={formData.originalText}
                      onChange={(e) =>
                        setFormData({ ...formData, originalText: e.target.value })
                      }
                      placeholder="Describe brevemente qué solicita el ciudadano..."
                      className="text-xs"
                    />
                  </div>

                  <div
                    className={`rounded-xl border p-4 ${
                      formData.signatureImage
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className="mb-3 flex items-start gap-2">
                      <CheckCircle
                        size={18}
                        className={
                          formData.signatureImage ? 'text-emerald-600' : 'text-amber-600'
                        }
                      />

                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-700">
                          Firma obligatoria para aprobar
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          Adjunta una imagen PNG o JPG de la firma. Sin esta imagen no se podrá usar
                          la acción “Aprobar y firmar”.
                        </p>
                      </div>
                    </div>

                    <label
                      htmlFor="signature-upload"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 text-center transition hover:bg-slate-50"
                    >
                      <UploadCloud size={26} className="mb-2 text-slate-400" />

                      <span className="text-xs font-bold uppercase text-slate-600">
                        {formData.signatureImage ? 'Cambiar imagen de firma' : 'Adjuntar imagen de firma'}
                      </span>

                      <span className="mt-1 text-[11px] text-slate-400">
                        Formatos permitidos: PNG o JPG
                      </span>
                    </label>

                    <input
                      id="signature-upload"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => handleSignatureUpload(e.target.files?.[0])}
                      className="hidden"
                    />

                    {formData.signatureImage ? (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
                        <p className="mb-2 text-[11px] font-bold uppercase text-emerald-700">
                          Firma cargada correctamente
                        </p>
                        <img
                          src={formData.signatureImage}
                          alt="Vista previa de firma"
                          className="h-20 object-contain"
                        />
                      </div>
                    ) : (
                      <p className="mt-3 text-xs font-semibold text-amber-700">
                        Pendiente: adjunta la firma antes de aprobar el documento.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center transition-all hover:bg-slate-50">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) =>
                          setSelectedFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                        id="pdf-upload"
                      />
                      <label
                        htmlFor="pdf-upload"
                        className="flex cursor-pointer flex-col items-center"
                      >
                        <UploadCloud size={28} className="mb-2 text-slate-400" />
                        <span className="max-w-full truncate text-[11px] font-bold uppercase text-slate-600">
                          {selectedFile
                            ? selectedFile.name
                            : 'Subir PDF del ciudadano'}
                        </span>
                      </label>
                    </div>

                    <Button
                      onClick={handleAiProcess}
                      disabled={loadingAi || !canGenerate}
                      className="h-11 w-full bg-[#1B2541] text-xs font-black uppercase tracking-widest hover:bg-slate-800"
                    >
                      {loadingAi ? (
                        <Loader2 className="mr-2 animate-spin" />
                      ) : (
                        <Sparkles size={16} className="mr-2" />
                      )}
                     {formData.petitionDirection === 'CREADA'
                      ? 'Redactar derecho de petición'
                      : 'Redactar respuesta'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8">
              <Card className="flex h-full min-h-[720px] flex-col border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between rounded-t-lg border-b bg-white py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold text-[#1B2541]">
                        Editor jurídico profesional
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        {formData.petitionDirection === 'CREADA'
                          ? 'Redacción de derecho de petición'
                          : 'Respuesta institucional a derecho de petición'}
                      </p>
                    </div>
                    <StatusBadge status={formData.status} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.generatedDraft && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveToDb}
                          disabled={isSaving}
                          className="text-xs"
                        >
                          <Save size={14} className="mr-2" />
                          Guardar
                        </Button>

                        {formData.status === 'BORRADOR' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange('EN_REVISION')}
                            disabled={isSaving || !formData.id}
                            className="bg-yellow-600 text-xs text-white hover:bg-yellow-700"
                          >
                            <Send size={14} className="mr-2" />
                            Enviar a revisión
                          </Button>
                        )}

                        {formData.status === 'EN_REVISION' && (
                          <Button
                            size="sm"
                            onClick={handleSignDocument}
                            disabled={isSaving || !formData.signatureImage}
                            className="bg-green-600 text-xs text-white hover:bg-green-700"
                          >
                            <CheckCircle size={14} className="mr-2" />
                            Aprobar y firmar
                          </Button>
                        )}

                        {formData.status === 'FIRMADO' && (
                          <Button
                            size="sm"
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="bg-[#1B2541] text-xs text-white hover:bg-slate-800"
                          >
                            {isExporting ? (
                              <Loader2 size={14} className="mr-2 animate-spin" />
                            ) : (
                              <Download size={14} className="mr-2" />
                            )}
                            Exportar PDF
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 bg-slate-100 p-0">
                  <div className="flex items-center justify-between border-b bg-white px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={editorMode === 'EDITAR' ? 'default' : 'outline'}
                        onClick={() => setEditorMode('EDITAR')}
                        className="text-xs"
                      >
                        Editar
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={editorMode === 'VISTA' ? 'default' : 'outline'}
                        onClick={() => setEditorMode('VISTA')}
                        className="text-xs"
                      >
                        Vista previa
                      </Button>
                    </div>

                    <div className="text-xs font-medium text-slate-500">
                      {formData.generatedDraft.length} caracteres ·{' '}
                      {formData.generatedDraft.trim().split(/\s+/).filter(Boolean).length} palabras
                    </div>
                  </div>

                  <div className="flex h-full overflow-y-auto bg-slate-100">
                    <div className="w-full">
                    {editorMode === 'EDITAR' ? (
                    <LegalRichEditor
                      value={formData.generatedDraft}
                      onChange={(html) =>
                        setFormData({
                          ...formData,
                          generatedDraft: html,
                        })
                      }
                      disabled={formData.status === 'FIRMADO'}
                      letterhead={<PetitionLetterhead />}
                    />
                    ) : (
                      <PaginatedPetitionPreview formData={formData} />
                    )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <PrintableDocument printRef={printRef} formData={formData} />
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: number;
  icon: any;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {label}
        </p>
        <Icon className={danger ? 'text-red-500' : 'text-[#1B2541]'} size={18} />
      </div>
      <p className={danger ? 'text-2xl font-black text-red-600' : 'text-2xl font-black text-[#1B2541]'}>
        {value}
      </p>
    </div>
  );
}

function PaginatedPetitionPreview({
  formData,
  forPrint = false,
}: {
  formData: PetitionForm;
  forPrint?: boolean;
}) {
  return (
    <div className={forPrint ? '' : 'space-y-6 py-6'}>
      <div className="relative mx-auto flex min-h-[1056px] w-[816px] flex-col overflow-hidden bg-white shadow-xl">
        <img
          src="/templates/membrete_utl_header.png"
          alt="Membrete"
          className="w-full object-contain"
        />

        <div
          className="flex-1 px-[105px] py-8 font-serif text-[15px] leading-7 text-slate-900
          [&_p]:mb-4 [&_p]:text-justify
          [&_strong]:font-bold
          [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6
          [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6
          [&_li]:mb-2"
          dangerouslySetInnerHTML={{
            __html:
              DOMPurify.sanitize(formData.generatedDraft) ||
              '<p style="color:#94a3b8">No hay contenido para previsualizar.</p>',
          }}
        />

        {formData.status === 'FIRMADO' && formData.signatureImage && (
          <div className="px-[105px] pb-10">
            <img
              src={formData.signatureImage}
              alt="Firma"
              className="h-20 object-contain"
            />

            <div className="mt-2 w-64 border-t border-black pt-2">
              <p className="font-bold">
                {formData.signedBy || 'JOSÉ JAIME USCÁTEGUI PASTRANA'}
              </p>
              <p className="text-sm text-slate-600">
                Representante a la Cámara
              </p>
            </div>
          </div>
        )}

        <img
          src="/templates/membrete_utl_footer.png"
          alt="Pie de página"
          className="mt-auto w-full object-contain"
        />
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
        <Icon size={13} />
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || 'BORRADOR';

  const styles =
    value === 'FIRMADO'
      ? 'bg-green-100 text-green-700 border-green-200'
      : value === 'EN_REVISION'
        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <Badge className={`border uppercase ${styles}`}>
      {value.replace('_', ' ')}
    </Badge>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
      <p className="font-medium text-slate-500">{text}</p>
    </div>
  );
}

function PrintableDocument({
  printRef,
  formData,
}: {
  printRef: React.RefObject<HTMLDivElement | null>;
  formData: PetitionForm;
}) {
  return (
    <div style={{ position: 'absolute', top: '-10000px', left: 0 }}>
      <div ref={printRef}>
        <PaginatedPetitionPreview formData={formData} forPrint />
      </div>
    </div>
  );
}