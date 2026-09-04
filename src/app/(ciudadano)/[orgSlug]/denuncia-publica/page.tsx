'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Loader2,
  UserCheck,
  UserPlus,
  CheckCircle2,
  Search,
  ShieldAlert,
  ArrowRight,
  Paperclip,
  X,
  Copy,
  FileWarning,
  Gavel,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://usca.jurytechsolution.com';

// Mismo esquema de identificación que (ciudadano)/[orgSlug]/register, más
// los campos propios del caso — un único paso de formulario en vez de dos,
// para no duplicar la fricción de /register (acá el ciudadano no vuelve
// nunca, así que conviene resolver todo de una).
const complaintSchema = z.object({
  documentNumber: z.string().min(5, 'Documento inválido'),
  firstName: z.string().min(2, 'Nombre requerido'),
  lastName: z.string().min(2, 'Apellido requerido'),
  phone: z.string().min(10, 'Celular de 10 dígitos'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  type: z.enum(['DENUNCIA', 'DEMANDA']),
  subject: z.string().min(5, 'El asunto es muy corto'),
  description: z.string().min(10, 'Detalla mejor tu caso'),
});

type ComplaintFormValues = z.infer<typeof complaintSchema>;

interface UploadedAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export default function PublicComplaintPage() {
  // Deuda multi-tenant (Fase M4, ver memoria `deuda-multitenant-crm`): el
  // slug de la organización viene de la propia URL
  // (/[orgSlug]/denuncia-publica) — sin fallback silencioso, un slug
  // inválido da 404 real desde el backend.
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const orgBasePath = `${API_URL}/public/organizations/${orgSlug}`;

  const [step, setStep] = useState<'IDENTIFY' | 'FORM' | 'SUCCESS'>('IDENTIFY');
  const [loading, setLoading] = useState(false);
  const [isKnownCitizen, setIsKnownCitizen] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [publicCode, setPublicCode] = useState('');

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      documentNumber: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      type: 'DENUNCIA',
      subject: '',
      description: '',
    },
  });

  // PASO 1: IDENTIFICACIÓN — mismo endpoint público que /[orgSlug]/register
  // (GET .../prospects/check/:documentNumber), sin login.
  const handleSearch = async () => {
    if (!documentSearch || documentSearch.length < 5) {
      toast.error('Ingresa un número de documento válido');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.get(`${orgBasePath}/prospects/check/${documentSearch}`);

      if (response.data.data) {
        setIsKnownCitizen(true);
        form.reset({
          ...form.getValues(),
          documentNumber: response.data.data.id,
          firstName: response.data.data.firstName,
          lastName: response.data.data.lastName,
          phone: response.data.data.phone || '',
          email: response.data.data.email || '',
        });
        toast.info(`Bienvenido de nuevo, ${response.data.data.firstName}`);
      }
    } catch {
      setIsKnownCitizen(false);
      form.setValue('documentNumber', documentSearch);
    } finally {
      setLoading(false);
      setStep('FORM');
    }
  };

  // Subida pública (sin JWT) — endpoint dedicado, distinto de
  // /media/upload (que exige login), ver media-public.controller.ts. No
  // depende de la organización — se deja tal cual.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (attachments.length >= 5) {
      toast.error('Máximo 5 archivos por caso');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/media/public-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAttachments((prev) => [
        ...prev,
        { url: response.data.url, fileName: file.name, mimeType: file.type, fileSize: file.size },
      ]);
      toast.success('Archivo adjuntado');
    } catch (error: any) {
      toast.error('No se pudo subir el archivo', {
        description: error?.response?.data?.message || 'Verifica el formato y tamaño (máx. 15MB, 50MB video).',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  // PASO 2: ENVÍO DEL CASO
  const onSubmit = async (data: ComplaintFormValues) => {
    setLoading(true);

    try {
      const response = await axios.post(`${orgBasePath}/complaints`, {
        ...data,
        email: data.email || undefined,
        attachments: attachments.length ? attachments : undefined,
      });

      setPublicCode(response.data.publicCode);
      setStep('SUCCESS');
    } catch (error: any) {
      toast.error('Error al radicar el caso', {
        description: error?.response?.data?.message || 'Inténtalo nuevamente más tarde.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(publicCode);
    toast.success('Código copiado');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* HEADER VISUAL */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1B2541] text-[#FFC400] shadow-md mb-3">
          <ShieldAlert size={24} />
        </div>
        <h1 className="text-2xl font-bold text-[#1B2541] uppercase tracking-wide">Denuncias y Demandas</h1>
        <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
          Radica tu caso ante el equipo de la campaña. Tu identificación es obligatoria — no se aceptan casos anónimos.
        </p>
      </div>

      {/* --- PASO 1: IDENTIFICACIÓN --- */}
      {step === 'IDENTIFY' && (
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-[#FFC400]">
          <CardHeader className="text-center space-y-4 pb-2">
            <CardTitle className="text-2xl font-bold text-[#1B2541]">Identifícate</CardTitle>
            <CardDescription className="text-slate-500">
              Ingresa tu cédula para continuar. Si ya estás en nuestra base de datos, precargamos tus datos.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  placeholder="Ingresa tu número de Cédula"
                  className="pl-10 text-lg h-12 border-slate-300 focus:border-[#1B2541] focus:ring-[#1B2541]/20"
                  type="number"
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                size="lg"
                className="h-12 bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold transition-all"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Continuar <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t bg-slate-50 py-4">
            <p className="text-xs text-slate-400">
              ¿Ya radicaste un caso?{' '}
              <Link href={`/${orgSlug}/denuncia-publica/consultar`} className="text-[#1B2541] font-semibold hover:underline">
                Consulta tu estado aquí
              </Link>
              .
            </p>
          </CardFooter>
        </Card>
      )}

      {/* --- PASO 2: FORMULARIO --- */}
      {step === 'FORM' && (
        <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-[#FFC400] animate-in fade-in slide-in-from-bottom-6 duration-500">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-[#1B2541]">Formulario del Caso</CardTitle>
                <CardDescription className="text-slate-500 mt-1">
                  Completa tus datos de contacto y describe tu denuncia o demanda.
                </CardDescription>
              </div>
              <div className="bg-[#1B2541]/10 p-3 rounded-full">
                {isKnownCitizen ? (
                  <UserCheck className="text-[#1B2541]" size={28} />
                ) : (
                  <UserPlus className="text-[#1B2541]" size={28} />
                )}
              </div>
            </div>
          </CardHeader>

          <Separator className="mb-6 opacity-50" />

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* --- DATOS DEL CIUDADANO --- */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1B2541] font-medium">Nombres</Label>
                  <Input {...form.register('firstName')} className="focus:border-[#1B2541] focus:ring-[#1B2541]/20" />
                  {form.formState.errors.firstName && (
                    <span className="text-xs text-red-500 font-medium">Requerido</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1B2541] font-medium">Apellidos</Label>
                  <Input {...form.register('lastName')} className="focus:border-[#1B2541] focus:ring-[#1B2541]/20" />
                  {form.formState.errors.lastName && (
                    <span className="text-xs text-red-500 font-medium">Requerido</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1B2541] font-medium">Cédula</Label>
                  <Input {...form.register('documentNumber')} disabled className="bg-slate-100 font-mono text-slate-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1B2541] font-medium">Celular (WhatsApp)</Label>
                  <Input type="number" {...form.register('phone')} className="focus:border-[#1B2541] focus:ring-[#1B2541]/20" />
                  {form.formState.errors.phone && (
                    <span className="text-xs text-red-500 font-medium">Mínimo 10 dígitos</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">Correo Electrónico (Opcional)</Label>
                <Input type="email" {...form.register('email')} className="focus:border-[#1B2541] focus:ring-[#1B2541]/20" />
                {form.formState.errors.email && (
                  <span className="text-xs text-red-500 font-medium">Correo inválido</span>
                )}
              </div>

              <Separator className="opacity-50" />

              {/* --- DATOS DEL CASO --- */}
              <div className="space-y-2">
                <Label className="text-[#1B2541] font-medium">Tipo de caso</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => form.setValue('type', 'DENUNCIA')}
                    className={`flex items-center justify-center gap-2 border rounded-lg p-3 font-medium transition-colors ${
                      form.watch('type') === 'DENUNCIA'
                        ? 'border-[#1B2541] bg-[#1B2541]/5 text-[#1B2541]'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <FileWarning className="h-4 w-4 text-red-500" /> Denuncia
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue('type', 'DEMANDA')}
                    className={`flex items-center justify-center gap-2 border rounded-lg p-3 font-medium transition-colors ${
                      form.watch('type') === 'DEMANDA'
                        ? 'border-[#1B2541] bg-[#1B2541]/5 text-[#1B2541]'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Gavel className="h-4 w-4 text-purple-500" /> Demanda
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1B2541] font-medium">Asunto</Label>
                <Input
                  {...form.register('subject')}
                  placeholder="Resume tu caso en pocas palabras"
                  className="focus:border-[#1B2541] focus:ring-[#1B2541]/20"
                />
                {form.formState.errors.subject && (
                  <span className="text-xs text-red-500 font-medium">{form.formState.errors.subject.message}</span>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[#1B2541] font-medium">Descripción detallada</Label>
                <Textarea
                  {...form.register('description')}
                  placeholder="Describe qué pasó, cuándo y dónde..."
                  className="min-h-[120px] focus:border-[#1B2541] focus:ring-[#1B2541]/20"
                />
                {form.formState.errors.description && (
                  <span className="text-xs text-red-500 font-medium">{form.formState.errors.description.message}</span>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[#1B2541] font-medium flex items-center gap-2">
                  <Paperclip className="h-4 w-4" /> Evidencia (fotos, video o PDF — opcional, máx. 5 archivos)
                </Label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4"
                  onChange={handleFileUpload}
                  disabled={uploading || attachments.length >= 5}
                  className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {uploading && <p className="text-xs text-slate-400">Subiendo…</p>}

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachments.map((a) => (
                      <span
                        key={a.url}
                        className="flex items-center gap-1 text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1"
                      >
                        {a.fileName}
                        <button type="button" onClick={() => removeAttachment(a.url)} className="text-slate-400 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-[#1B2541] hover:bg-[#1B2541]/90 h-12 text-base font-bold shadow-md"
                  disabled={loading || uploading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Radicar Caso
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-500 hover:text-[#1B2541]"
                  onClick={() => setStep('IDENTIFY')}
                >
                  Volver / Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* --- PASO 3: ÉXITO --- */}
      {step === 'SUCCESS' && (
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-[#FFC400] text-center animate-in zoom-in-95 duration-500">
          <CardContent className="pt-12 pb-12">
            <div className="mx-auto bg-[#1B2541] w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ring-4 ring-[#FFC400]/20">
              <CheckCircle2 size={48} className="text-[#FFC400]" />
            </div>
            <h2 className="text-3xl font-extrabold text-[#1B2541] mb-3">¡Caso Radicado!</h2>
            <p className="text-slate-500 mb-4 max-w-xs mx-auto">Guarda este código — lo necesitas para consultar el avance de tu caso.</p>

            <button
              onClick={handleCopyCode}
              className="mx-auto flex items-center gap-2 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg px-4 py-3 font-mono text-lg font-bold text-[#1B2541] mb-6"
            >
              {publicCode} <Copy className="h-4 w-4 text-slate-400" />
            </button>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-8 max-w-sm mx-auto">
              No enviamos notificaciones automáticas por correo o WhatsApp — vuelve a esta página y consulta con tu
              código y cédula cuando quieras saber el estado de tu caso.
            </div>

            <div className="space-y-2">
              <Link href={`/${orgSlug}/denuncia-publica/consultar?code=${publicCode}`}>
                <Button className="w-full bg-[#1B2541] hover:bg-[#1B2541]/90 font-semibold">Consultar mi caso ahora</Button>
              </Link>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full border-[#1B2541] text-[#1B2541] hover:bg-[#1B2541]/5 font-semibold"
              >
                Radicar otro caso
              </Button>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 py-4 justify-center">
            <p className="text-xs text-slate-400 font-medium">Gestión Transparente - Campaña 2026</p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
