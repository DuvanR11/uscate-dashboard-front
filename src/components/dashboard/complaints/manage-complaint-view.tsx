'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import api from '@/lib/api';
import { assignComplaint, closeComplaint, respondComplaint } from '@/lib/api/complaints';
import { ComplaintItem } from '@/types/complaint';
import { usePermission } from '@/hooks/use-permission';
import { useAuthStore } from '@/store/auth-store';
import {
  COMPLAINT_PRIORITY_CONFIG,
  COMPLAINT_STATUS_CONFIG,
  COMPLAINT_TYPE_LABELS,
  DENUNCIAS_MODULE,
} from './complaint-status.constants';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Save,
  ArrowLeft,
  User,
  MessageCircle,
  UserCog,
  Clock,
  ExternalLink,
  ImageIcon,
  FileText,
  Copy,
  EyeOff,
  Paperclip,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface ManageComplaintViewProps {
  complaint: ComplaintItem;
}

interface Official {
  id: string;
  fullName: string;
  role: string;
}

// Roles elegibles para ser asignados como responsables de un caso — mismo
// criterio de "responder" que ya tienen SECRETARY/LEGISLATIVE en el backend
// (ver MATRIX de scripts/backfill-role-permissions.ts, DENUNCIAS_DEMANDAS).
const ASSIGNABLE_ROLES = ['SECRETARY', 'LEGISLATIVE'];

const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(url);
const isVideo = (url: string) => /\.(mp4|webm|mov)$/i.test(url);

export function ManageComplaintView({ complaint }: ManageComplaintViewProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [officials, setOfficials] = useState<Official[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(complaint.assignedUser?.id || 'none');

  const [responseText, setResponseText] = useState(complaint.responseText || '');
  const [responseAttachments, setResponseAttachments] = useState<
    { url: string; fileName: string; mimeType: string; fileSize: number }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [responding, setResponding] = useState(false);

  const [resolutionNotes, setResolutionNotes] = useState(complaint.resolutionNotes || '');
  const [closing, setClosing] = useState(false);

  // --- Autorización de dos niveles (ver ComplaintsService.canAccessComplaint) ---
  const canGlobalWrite = usePermission(DENUNCIAS_MODULE, 'canWrite'); // tier ADMIN: asigna/reasigna, ve todo
  const canRead = usePermission(DENUNCIAS_MODULE, 'canRead');
  const isAssignedToMe = complaint.assignedUser?.id === user?.id;
  // Autoridad de responder/cerrar: soy el asignado, O tengo canWrite global
  // (cubre rotación/ausencia) — NO basta con canRead de módulo.
  const canRespond = isAssignedToMe || canGlobalWrite;
  const isClosed = complaint.status === 'CLOSED';

  useEffect(() => {
    if (!canRead) {
      toast.error('Acceso denegado', {
        description: 'No tienes permisos para consultar este caso.',
      });
      router.push('/denuncias');
    }
  }, [canRead, router]);

  useEffect(() => {
    if (!canGlobalWrite) return;

    const loadOfficials = async () => {
      try {
        const res = await api.get(`/users?roles=${ASSIGNABLE_ROLES.join(',')}&limit=100`);
        const users = res.data.data || res.data;

        setOfficials(
          users.map((u: any) => ({
            id: u.id,
            fullName: u.full_name || u.fullName,
            role: u.role?.code,
          })),
        );
      } catch {
        console.error('Error cargando funcionarios asignables');
      }
    };

    loadOfficials();
  }, [canGlobalWrite]);

  const citizen = complaint.prospect;
  const citizenInitials = citizen ? `${citizen.firstName?.[0] || ''}${citizen.lastName?.[0] || ''}`.toUpperCase() : 'CI';

  const publicUrl = useMemo(
    () => `${window.location.origin}/denuncia-publica/consultar?code=${complaint.publicCode}`,
    [complaint.publicCode],
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Enlace de seguimiento copiado');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Endpoint privado (con JWT) — el funcionario ya está autenticado, a
      // diferencia del formulario público que usa /media/public-upload.
      const res = await api.post('/media/upload', formData, {
        params: { folder: 'denuncias' },
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResponseAttachments((prev) => [
        ...prev,
        { url: res.data.url, fileName: file.name, mimeType: file.type, fileSize: file.size },
      ]);

      toast.success('Archivo adjuntado', { description: 'Se enviará junto con tu respuesta.' });
    } catch (error: any) {
      toast.error('Error al subir archivo', {
        description: error?.response?.data?.message || 'No se pudo subir el archivo.',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (url: string) => {
    setResponseAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  const handleAssign = async () => {
    if (!canGlobalWrite) return;

    setAssigning(true);

    try {
      await assignComplaint(complaint.id, selectedAssignee === 'none' ? '' : selectedAssignee);
      toast.success('Caso asignado correctamente');
      router.refresh();
      window.location.reload();
    } catch (error: any) {
      toast.error('Error al asignar', {
        description: error?.response?.data?.message || 'No se pudo asignar el caso.',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleRespond = async () => {
    if (!canRespond) return;

    if (responseText.trim().length < 5) {
      toast.error('La respuesta es muy corta');
      return;
    }

    setResponding(true);

    try {
      await respondComplaint(complaint.id, {
        responseText,
        attachments: responseAttachments.length ? responseAttachments : undefined,
      });
      toast.success('Respuesta enviada — el ciudadano ya puede verla en su seguimiento público');
      window.location.reload();
    } catch (error: any) {
      toast.error('Error al responder', {
        description: error?.response?.data?.message || 'No se pudo enviar la respuesta.',
      });
    } finally {
      setResponding(false);
    }
  };

  const handleClose = async () => {
    if (!canRespond) return;

    setClosing(true);

    try {
      await closeComplaint(complaint.id, resolutionNotes || undefined);
      toast.success('Caso cerrado');
      window.location.reload();
    } catch (error: any) {
      toast.error('Error al cerrar el caso', {
        description: error?.response?.data?.message || 'No se pudo cerrar el caso.',
      });
    } finally {
      setClosing(false);
    }
  };

  const statusConfig = COMPLAINT_STATUS_CONFIG[complaint.status];
  const priorityConfig = COMPLAINT_PRIORITY_CONFIG[complaint.priority] || COMPLAINT_PRIORITY_CONFIG.MEDIUM;

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div className="h-6 w-px bg-slate-300 mx-2" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-primary">
                {COMPLAINT_TYPE_LABELS[complaint.type]} {complaint.publicCode}
              </h1>
              <Badge variant="secondary" className="text-[10px]">
                {COMPLAINT_TYPE_LABELS[complaint.type]}
              </Badge>

              {!canRespond && (
                <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 gap-1 ml-2">
                  <EyeOff size={12} /> Solo Lectura
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Recibido el {format(new Date(complaint.createdAt), "PPP 'a las' p", { locale: es })}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`${statusConfig?.badgeClass} font-medium px-3 py-1 text-sm`}>
          {statusConfig?.label || complaint.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. DETALLES DEL CASO */}
          <Card className="shadow-sm border-l-4 border-l-blue-600">
            <CardHeader>
              <CardTitle className="text-lg text-primary">Detalle del Caso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asunto</span>
                <p className="text-base font-medium text-slate-900">{complaint.subject}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</span>
                <div className="mt-1 p-3 bg-slate-50 rounded-md text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {complaint.description}
                </div>
              </div>
              <div className={`flex items-center w-fit px-2 py-0.5 rounded-full text-xs border ${priorityConfig.color}`}>
                Prioridad: {priorityConfig.label}
              </div>
            </CardContent>
          </Card>

          {/* 2. EVIDENCIA DEL CIUDADANO */}
          {complaint.attachments.filter((a) => a.source === 'CITIZEN').length > 0 && (
            <Card className="shadow-sm border border-slate-200 bg-slate-50/50">
              <CardHeader>
                <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-600" /> Evidencia Adjuntada por el Ciudadano
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complaint.attachments
                  .filter((a) => a.source === 'CITIZEN')
                  .map((attachment) => (
                    <AttachmentPreview key={attachment.id} attachment={attachment} />
                  ))}
              </CardContent>
            </Card>
          )}

          {/* 3. PANEL DE ASIGNACIÓN (solo tier ADMIN) */}
          {canGlobalWrite && (
            <Card className="shadow-sm border-t-4 border-t-indigo-500">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="h-5 w-5" /> Asignación del Caso
                </CardTitle>
                <CardDescription>
                  Solo tú (permiso de módulo) puedes asignar o reasignar — el funcionario asignado no puede
                  reasignarse ni reasignar a otro.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-3">
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar funcionario..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Sin Asignar --</SelectItem>
                    {officials.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssign} disabled={assigning} className="bg-indigo-600 hover:bg-indigo-700">
                  {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCog className="mr-2 h-4 w-4" />}
                  {complaint.assignedUser ? 'Reasignar' : 'Asignar'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 4. PANEL DE RESPUESTA (asignado, o ADMIN como override) */}
          <Card className={`shadow-md border-t-4 ${canRespond ? 'border-t-emerald-600' : 'border-t-slate-300'}`}>
            <CardHeader className={canRespond ? 'bg-emerald-50/30' : 'bg-slate-50'}>
              <CardTitle className="text-lg flex items-center gap-2">
                {canRespond ? <MessageCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                Respuesta al Ciudadano
              </CardTitle>
              <CardDescription>
                {canRespond
                  ? 'Tu respuesta y adjuntos quedan visibles para el ciudadano en su página de seguimiento público.'
                  : isClosed
                    ? 'Este caso ya está cerrado.'
                    : complaint.assignedUser
                      ? `Solo ${complaint.assignedUser.fullName} (o un administrador) puede responder este caso.`
                      : 'Este caso todavía no tiene un funcionario asignado.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Textarea
                placeholder={canRespond ? 'Describe la respuesta oficial al ciudadano...' : 'Sin respuesta todavía.'}
                className="min-h-[120px]"
                disabled={!canRespond || isClosed}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />

              {canRespond && !isClosed && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5" /> Adjuntar evidencia de respuesta
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {uploading && <p className="text-xs text-slate-400">Subiendo…</p>}

                  {responseAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {responseAttachments.map((a) => (
                        <span
                          key={a.url}
                          className="flex items-center gap-1 text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1"
                        >
                          {a.fileName}
                          <button onClick={() => removeAttachment(a.url)} className="text-slate-400 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {complaint.attachments.filter((a) => a.source === 'STAFF').length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {complaint.attachments
                    .filter((a) => a.source === 'STAFF')
                    .map((attachment) => (
                      <AttachmentPreview key={attachment.id} attachment={attachment} />
                    ))}
                </div>
              )}
            </CardContent>

            {canRespond && !isClosed && (
              <CardFooter className="bg-slate-50 flex justify-end py-4">
                <Button onClick={handleRespond} disabled={responding || uploading} className="bg-primary hover:bg-primary/90">
                  {responding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Enviar Respuesta
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* 5. CERRAR CASO (asignado, o ADMIN como override) */}
          {canRespond && !isClosed && (
            <Card className="shadow-sm border-t-4 border-t-slate-400">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Cerrar Caso
                </CardTitle>
                <CardDescription>Marca el caso como resuelto y archivado. Es un paso independiente de responder.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Notas de cierre/resolución (opcional)..."
                  className="min-h-[80px]"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </CardContent>
              <CardFooter className="justify-end">
                <Button onClick={handleClose} disabled={closing} variant="outline" className="border-slate-400">
                  {closing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Cerrar Caso
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* COLUMNA DERECHA (1/3) */}
        <div className="space-y-6">
          {/* TARJETA DEL CIUDADANO */}
          <Card className="shadow-sm border-t-4 border-t-secondary">
            <CardHeader>
              <CardTitle className="text-base text-primary">Ciudadano</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {citizen ? (
                <>
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 mb-3 border-4 border-slate-100">
                      <AvatarFallback className="bg-primary text-white text-xl">{citizenInitials}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-lg text-slate-900">
                      {citizen.firstName} {citizen.lastName}
                    </h3>
                    <p className="text-sm text-slate-500">{citizen.email || 'Sin correo'}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">CC {citizen.documentNumber}</p>

                    {citizen.phone && (
                      <Button
                        variant="outline"
                        className="mt-4 w-full border-green-200 hover:bg-green-50 text-slate-700"
                        onClick={() => window.open(`https://wa.me/57${citizen.phone}`, '_blank')}
                      >
                        <MessageCircle className="mr-2 h-4 w-4 text-green-600" /> Chat con Ciudadano
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="bg-slate-100 p-3 rounded-full w-fit mx-auto mb-3">
                    <User className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 italic">Sin datos de identificación.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LÍNEA DE TIEMPO */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-primary">Línea de Tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complaint.timeline.map((event, idx) => {
                  const eventConfig = COMPLAINT_STATUS_CONFIG[event.status];
                  return (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                        {idx < complaint.timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-semibold text-slate-800">{eventConfig?.label || event.status}</p>
                        {event.note && <p className="text-xs text-slate-500 mt-0.5">{event.note}</p>}
                        <p className="text-[10px] text-slate-400 mt-1">
                          {format(new Date(event.createdAt), "d MMM yyyy, h:mm a", { locale: es })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* CARD INFO TÉCNICA / SEGUIMIENTO PÚBLICO */}
          <Card className="bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
            <CardContent className="pt-6 space-y-4 text-xs text-slate-500">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>ID Interno:</span> <span className="font-mono">{complaint.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo:</span> <span className="font-medium">{COMPLAINT_TYPE_LABELS[complaint.type]}</span>
                </div>
              </div>

              <Separator className="bg-slate-200" />

              <div className="space-y-2">
                <span className="font-bold text-slate-700 uppercase block mb-1">Seguimiento Público</span>
                <Button
                  variant="outline"
                  className="w-full bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => window.open(publicUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver como Ciudadano
                </Button>
                <Button variant="ghost" className="w-full h-8" onClick={handleCopyLink}>
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copiar Enlace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: ComplaintItem['attachments'][number] }) {
  if (isImage(attachment.url)) {
    return (
      <div className="space-y-1">
        <div className="rounded-lg overflow-hidden border border-slate-200 aspect-video relative group bg-black">
          <img
            src={attachment.url}
            alt={attachment.fileName}
            className="w-full h-full object-contain cursor-pointer"
            onClick={() => window.open(attachment.url, '_blank')}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center">
              <ExternalLink className="w-3 h-3 mr-1" /> Ver original
            </span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 truncate">{attachment.fileName}</p>
      </div>
    );
  }

  if (isVideo(attachment.url)) {
    return (
      <div className="space-y-1">
        <video src={attachment.url} controls className="w-full rounded-lg border border-slate-200 aspect-video bg-black" />
        <p className="text-[10px] text-slate-400 truncate">{attachment.fileName}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-white p-6 rounded-lg border border-slate-200 aspect-video text-center shadow-sm">
      <FileText className="h-8 w-8 text-blue-500 mb-2" />
      <p className="text-xs text-slate-500 truncate max-w-full mb-2">{attachment.fileName}</p>
      <Button variant="outline" size="sm" onClick={() => window.open(attachment.url, '_blank')}>
        Descargar Archivo
      </Button>
    </div>
  );
}
