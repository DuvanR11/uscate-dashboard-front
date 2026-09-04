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
  Mail,
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
import { useAuthStore } from '@/store/auth-store';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LegalRichEditor } from '@/components/dashboard/petitions/LegalRichEditor';
import DOMPurify from 'dompurify';

// Plan "Cadena de Firma", Fase 3 (2026-09-03) — RECHAZADO real: el
// congresista ahora puede devolver un borrador con un motivo real, en vez
// de que el único camino fuera seguir editando a ciegas.
type PetitionStatus = 'BORRADOR' | 'EN_REVISION' | 'FIRMADO' | 'RECHAZADO';
type PetitionDirection = 'CREADA' | 'RESPUESTA';

type PetitionForm = {
  id: string;
  radicado: string;
  petitioner: string;
  // Post-plan (2026-09-03) — "notificación real al peticionario": sin
  // esto, no hay forma real de avisarle al ciudadano cuando su petición
  // queda firmada.
  petitionerEmail: string;
  petitionType: string;
  petitionDirection: PetitionDirection;
  status: PetitionStatus;
  receivedAt: string;
  originalText: string;
  generatedDraft: string;
  signedBy?: string;
  signedAt?: string;
  signatureImage?: string;
  rejectionReason?: string | null;
  // Post-plan (2026-09-03) — "asignación de abogados con UI real": el
  // backend tiene `assignLawyer()` desde la Fase 2, nunca conectado a
  // ningún control del frontend hasta ahora.
  assignedLawyerId?: string | null;
  // Post-plan (2026-09-03) — "extensión de plazo legal" (Art. 14, Ley 1755
  // de 2015).
  deadlineAt?: string;
  deadlineExtendedAt?: string | null;
  deadlineExtensionReason?: string | null;
};

const initialForm: PetitionForm = {
  id: '',
  radicado: '',
  petitioner: '',
  petitionerEmail: '',
  petitionType: 'GENERAL',
  petitionDirection: 'CREADA',
  signedBy: '',
  signedAt: '',
  signatureImage: '',
  status: 'BORRADOR',
  receivedAt: new Date().toISOString().split('T')[0],
  originalText: '',
  generatedDraft: '',
  rejectionReason: null,
  assignedLawyerId: null,
};

// Plan "Cadena de Firma", Fase 3 (2026-09-03) — el backend ahora devuelve
// mensajes reales y específicos (motivo del 403 de rol, validación del
// motivo de rechazo, etc.) — mostrarlos tal cual es más útil que un
// genérico "Error al...".
function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } })
      .response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}

// Plan "Cadena de Firma", Fase 4 (2026-09-03) — etiquetas en español de los
// 6 hitos reales que `PetitionsService.logHistory()` registra (backend,
// mismo enum real).
const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATED: 'Petición creada',
  ASSIGNED: 'Asignada a un abogado',
  AI_DRAFT_GENERATED: 'Borrador generado con IA',
  SUBMITTED_FOR_REVIEW: 'Enviada a revisión',
  REJECTED: 'Rechazada por el despacho',
  APPROVED: 'Aprobada y firmada',
  DEADLINE_EXTENDED: 'Plazo legal extendido',
  DEADLINE_ALERT_SENT: 'Aviso de vencimiento enviado',
  PETITIONER_NOTIFIED: 'Peticionario notificado por correo',
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
  // Mejora de UX del editor (2026-09-03) — antes el autoguardado no daba
  // NINGUNA señal positiva (solo un toast si fallaba, desde la Fase 5):
  // el abogado no tenía forma de saber si "ya se guardó" sin adivinar.
  const [autosaveStatus, setAutosaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [isExporting, setIsExporting] = useState(false);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  // Plan "Cadena de Firma", Fase 5 (2026-09-03) — "vista Pendientes de mi
  // aprobación para el congresista": filtra el tablero a solo lo que ESTE
  // usuario, si puede aprobar, tiene esperando su firma.
  const [onlyPendingApproval, setOnlyPendingApproval] = useState(false);
  // Post-plan (2026-09-03) — "asignación de abogados con UI real": mismo
  // criterio, ahora para el lado del abogado — filtra a solo lo que ESTE
  // usuario tiene asignado, sin importar su rol.
  const [onlyMyAssigned, setOnlyMyAssigned] = useState(false);
  const [assignedLawyerFilter, setAssignedLawyerFilter] = useState<string>('');
  const [lawyers, setLawyers] = useState<{ id: string; fullName: string }[]>([]);
  const [assigningLawyerId, setAssigningLawyerId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [formData, setFormData] = useState<PetitionForm>(initialForm);

  // Plan "Cadena de Firma", Fase 5 (2026-09-03) — reemplaza el
  // `window.prompt()` de la Fase 3 (interacción provisional, documentada
  // como pendiente de pulir) por un diálogo real: el motivo se valida
  // antes de enviarlo (mismo mínimo de 10 caracteres que ya exige el
  // backend, `RejectPetitionDto`) en vez de descubrir el error recién en
  // la respuesta del servidor.
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Post-plan (2026-09-03) — "extensión de plazo legal" (Art. 14, Ley 1755
  // de 2015): mismo patrón de diálogo real que el rechazo, mismo mínimo de
  // caracteres que ya exige el backend (`ExtendDeadlineDto`).
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendReason, setExtendReason] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  const [history, setHistory] = useState<any[]>([]);

  // Plan "Cadena de Firma", Fase 3 (2026-09-03) — decisión confirmada: el
  // gate real de aprobación vive en el backend (`PetitionsService.
  // approve()`/`reject()`, por rol ADMIN/SUPER_ADMIN) — esto es solo la
  // UI: nunca mostrar un botón que el backend igual va a rechazar con un
  // 403 real.
  const currentUser = useAuthStore((s) => s.user);
  const canApprove =
    currentUser?.role?.code === 'ADMIN' ||
    currentUser?.role?.code === 'SUPER_ADMIN';

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPetitions();
  }, []);

  // Post-plan (2026-09-03) — "asignación de abogados con UI real": la
  // lista de abogados para el selector solo se puede pedir con el permiso
  // real `USUARIOS.canRead` (mismo criterio de `canApprove` — el despacho,
  // no el abogado individual, es quien reparte los casos). Un abogado
  // normal no ve este selector, pero sí puede filtrar sus PROPIAS
  // peticiones asignadas (eso no necesita listar a nadie más).
  useEffect(() => {
    if (!canApprove) return;

    api
      .get('/users', { params: { roles: 'LEGISLATIVE', limit: 100 } })
      .then((res) => {
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        setLawyers(
          data.map((u: any) => ({ id: u.id, fullName: u.fullName })),
        );
      })
      .catch((error) => console.error('Error cargando abogados', error));
  }, [canApprove]);

  const lawyerMap = useMemo(() => {
    const map = new Map<string, string>();
    lawyers.forEach((l) => map.set(l.id, l.fullName));
    return map;
  }, [lawyers]);

  // Resuelve un nombre real para mostrar — nunca inventa uno: si no se
  // puede resolver (un abogado normal no tiene la lista completa de
  // colegas), muestra un aviso genérico en vez de un uuid crudo.
  const resolveLawyerName = (lawyerId?: string | null): string | null => {
    if (!lawyerId) return null;
    if (lawyerId === currentUser?.id) return `${currentUser?.fullName} (yo)`;
    return lawyerMap.get(lawyerId) || 'Abogado asignado';
  };

  const filteredPetitions = useMemo(() => {
    const value = query.toLowerCase().trim();

    // Plan "Cadena de Firma", Fase 5 (2026-09-03) — hallazgo real del
    // diagnóstico original: el congresista no tenía ninguna vista propia,
    // solo la misma tabla completa que ve un abogado. Filtra a lo que
    // REALMENTE necesita su atención: peticiones en revisión, esperando
    // su firma.
    let scoped = onlyPendingApproval
      ? petitions.filter((p) => p.status === 'EN_REVISION')
      : petitions;

    // Post-plan (2026-09-03) — "Mis peticiones asignadas": funciona para
    // CUALQUIER usuario (no solo el despacho) — un abogado real quiere ver
    // solo lo que a ÉL le toca trabajar, sin depender de la lista completa
    // de abogados (que ni siquiera puede pedir).
    if (onlyMyAssigned && currentUser?.id) {
      scoped = scoped.filter((p) => p.assignedLawyerId === currentUser.id);
    }

    if (assignedLawyerFilter) {
      scoped = scoped.filter((p) => p.assignedLawyerId === assignedLawyerFilter);
    }

    if (!value) return scoped;

    return scoped.filter((petition) => {
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
  }, [petitions, query, onlyPendingApproval, onlyMyAssigned, assignedLawyerFilter, currentUser?.id]);

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

  // Plan "Cadena de Firma", Fase 5 (2026-09-03) — hallazgo P1 real del
  // diagnóstico original: "el debounce de 3s envuelve el PATCH en `catch
  // {}` vacío — un fallo de red nunca se muestra al abogado". Un
  // autoguardado real que falla en silencio es peor que no autoguardar:
  // el abogado sigue escribiendo creyendo que el trabajo está a salvo.
  useEffect(() => {
    if (!formData.id) return;

    setAutosaveStatus('saving');

    const timeout = setTimeout(async () => {
      try {
        await api.patch(`/petitions/${formData.id}`, buildPetitionPayload());
        setAutosaveStatus('saved');
      } catch (error) {
        setAutosaveStatus('error');
        toast.error(
          extractErrorMessage(error) ||
            'No se pudo guardar automáticamente — revisa tu conexión.',
        );
      }
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

  // Plan "Cadena de Firma", Fase 1 (2026-09-03) — unificación: antes esta
  // pantalla llamaba a `/intelligence/petition/draft` (que ni existía en
  // el backend — 404 real garantizado, hallazgo P0 del diagnóstico) y a
  // `/intelligence/petition/respond` (gateado por el permiso INTELIGENCIA,
  // distinto al PETICIONES que usa el resto de esta misma pantalla, y que
  // ni siquiera guardaba la petición — devolvía el borrador suelto).
  // Ahora ambos caminos crean/actualizan un registro REAL primero
  // (`POST`/`PATCH /petitions`) y generan sobre ese registro con los
  // endpoints reales de `PetitionsController` — el mismo que ya usa
  // "Redactor IA", sin duplicar reglas de negocio.
  const ensurePetitionRecord = async (): Promise<string> => {
    const payload = buildPetitionPayload();

    if (formData.id) {
      await api.patch(`/petitions/${formData.id}`, payload);
      return formData.id;
    }

    const res = await api.post('/petitions', payload);
    const newId = res.data?.id as string;

    setFormData((prev) => ({ ...prev, id: newId }));

    return newId;
  };

  const handleAiProcess = async () => {
    if (!canGenerate) {
      toast.error('Sube un PDF o escribe apuntes suficientes para redactar.');
      return;
    }

    setLoadingAi(true);

    try {
      const petitionId = await ensurePetitionRecord();

      const res = selectedFile
        ? await (() => {
            const uploadData = new FormData();
            uploadData.append('file', selectedFile);
            return api.post(
              `/petitions/${petitionId}/generate-ai/from-pdf`,
              uploadData,
            );
          })()
        : await api.post(`/petitions/${petitionId}/generate-ai`, {});

      setFormData((prev) => ({
        ...prev,
        ...res.data,
        id: petitionId,
        generatedDraft: normalizeAiDraft(res.data?.generatedDraft || ''),
      }));

      toast.success('Borrador generado con IA.');
      await fetchPetitions();
      fetchHistory(petitionId);
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
      // `class-validator`'s `@IsOptional()` solo se salta null/undefined,
      // NUNCA un string vacío — mandar '' real reventaría `@IsEmail()` en
      // el backend con un 400 real cada vez que el campo se deja en
      // blanco (el caso normal hoy). Se normaliza acá, mismo criterio ya
      // usado para `radicado` en el backend.
      petitionerEmail: data.petitionerEmail?.trim() || null,
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
      if (res.data?.id) fetchHistory(res.data.id);
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la petición.');
    } finally {
      setIsSaving(false);
    }
  };

  // Plan "Cadena de Firma", Fase 3 (2026-09-03) — reemplaza el
  // `PATCH {status:'EN_REVISION'}` genérico (ahora bloqueado explícitamente
  // por `PetitionsService.update()`, ver Fase 3) por el endpoint dedicado
  // que además exige contenido real y limpia el motivo de un rechazo
  // anterior — funciona igual desde BORRADOR o desde RECHAZADO (reenvío
  // real tras una corrección).
  const handleSubmitForReview = async () => {
    if (!formData.id) {
      toast.warning('Primero guarda el borrador antes de enviarlo a revisión.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await api.post(`/petitions/${formData.id}/submit-for-review`);

      setFormData((prev) => ({ ...prev, ...res.data }));
      fetchHistory(formData.id);

      toast.success('Petición enviada a revisión.');
      await fetchPetitions();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al enviar a revisión.');
    } finally {
      setIsSaving(false);
    }
  };

  // El congresista (rol ADMIN/SUPER_ADMIN, verificado real en el backend)
  // devuelve el borrador con un motivo real — antes de esta fase, el único
  // camino era seguir editando a ciegas sin ningún rastro de qué estuvo mal.
  //
  // Plan "Cadena de Firma", Fase 5 (2026-09-03) — reemplaza el
  // `window.prompt()` provisional de la Fase 3 por un diálogo real
  // (`rejectDialogOpen`/`rejectReason`, ver JSX). `handleReject()` ahora
  // solo envía — abrir el diálogo y validar el mínimo de caracteres viven
  // en el diálogo mismo.
  const handleReject = async () => {
    if (!formData.id) return;

    setIsSaving(true);

    try {
      const res = await api.post(`/petitions/${formData.id}/reject`, {
        reason: rejectReason.trim(),
      });

      setFormData((prev) => ({ ...prev, ...res.data }));
      setRejectDialogOpen(false);
      setRejectReason('');
      fetchHistory(formData.id);

      toast.success('Petición rechazada — el abogado verá el motivo real.');
      await fetchPetitions();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al rechazar la petición.');
    } finally {
      setIsSaving(false);
    }
  };

  // Post-plan (2026-09-03) — "extensión de plazo legal" (Art. 14, Ley 1755
  // de 2015): el backend ya valida las reglas legales reales (una sola
  // extensión, antes del vencimiento, no en un estado ya resuelto) — acá
  // solo se envía el motivo y se muestra el error real si alguna no se
  // cumple.
  const handleExtendDeadline = async () => {
    if (!formData.id) return;

    setIsExtending(true);

    try {
      const res = await api.post(`/petitions/${formData.id}/extend-deadline`, {
        reason: extendReason.trim(),
      });

      setFormData((prev) => ({ ...prev, ...res.data }));
      setExtendDialogOpen(false);
      setExtendReason('');
      fetchHistory(formData.id);

      toast.success('Plazo extendido correctamente.');
      await fetchPetitions();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al extender el plazo.');
    } finally {
      setIsExtending(false);
    }
  };

  // Plan "Cadena de Firma", Fase 4 (2026-09-03), llevado a esta pantalla en
  // la Fase 5 al retirarse "Redactor IA" (la única otra pantalla que lo
  // tenía): historial mínimo real del ciclo de vida. Fail-abierto en la UI
  // también — un fallo al cargarlo no debe bloquear el resto del editor.
  const fetchHistory = async (petitionId: string) => {
    if (!petitionId) {
      setHistory([]);
      return;
    }

    try {
      const res = await api.get(`/petitions/${petitionId}/history`);
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching petition history', error);
    }
  };

  const handleLoadPetition = (petition: any) => {
    setFormData({
      id: petition.id || '',
      radicado: petition.radicado || '',
      petitioner: petition.petitioner || '',
      petitionerEmail: petition.petitionerEmail || '',
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
      rejectionReason: petition.rejectionReason || null,
      assignedLawyerId: petition.assignedLawyerId || null,
      deadlineAt: petition.deadlineAt || undefined,
      deadlineExtendedAt: petition.deadlineExtendedAt || null,
      deadlineExtensionReason: petition.deadlineExtensionReason || null,
    });

    setSelectedFile(null);
    setActiveTab('new');
    setAutosaveStatus('idle');
    setAssigningLawyerId(petition.assignedLawyerId || '');
    setExtendReason('');
    fetchHistory(petition.id || '');
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

  // Plan "Cadena de Firma", Fase 3 (2026-09-03) — el punto central de esta
  // fase: antes, este botón mandaba `PATCH {status:'FIRMADO', signedBy:
  // 'JOSÉ JAIME USCÁTEGUI PASTRANA'}` — un string hardcodeado, sin
  // importar quién estuviera logueado, y CUALQUIER usuario con permiso de
  // escritura podía ejecutarlo. Ahora `signedBy` se resuelve siempre del
  // usuario real autenticado en el backend (nunca de este payload), y
  // solo el despacho real (rol ADMIN/SUPER_ADMIN, verificado en el
  // backend — `canApprove` acá es solo para no mostrar un botón que va a
  // fallar) puede ejecutarlo.
  const handleSignDocument = async () => {
    if (!formData.id) {
      toast.warning('Primero guarda el documento antes de firmar.');
      return;
    }

    if (!formData.signatureImage) {
      toast.warning('Debes adjuntar una imagen de firma antes de aprobar y firmar.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await api.post(`/petitions/${formData.id}/approve`, {
        signatureImage: formData.signatureImage,
      });

      setFormData((prev) => ({ ...prev, ...res.data }));
      fetchHistory(formData.id);

      toast.success('Documento firmado correctamente.');
      await fetchPetitions();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al firmar el documento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewDraft = () => {
    setFormData(initialForm);
    setSelectedFile(null);
    setHistory([]);
    setAutosaveStatus('idle');
    setAssigningLawyerId('');
    setExtendReason('');
    setActiveTab('new');
  };

  // Post-plan (2026-09-03) — "asignación de abogados con UI real": cierra
  // el ciclo que quedó abierto desde la Fase 2 (`assignLawyer()` existía
  // en el backend, pero ningún botón real lo usaba). Solo el despacho
  // (`canApprove`, mismo gate que aprobar/rechazar) ve este control en la
  // UI — el backend además exige lo mismo ahora que se corrigió el guard
  // real que lo bloqueaba (ver hallazgo del mismo día).
  const handleAssignLawyer = async () => {
    if (!formData.id || !assigningLawyerId) return;

    setIsAssigning(true);

    try {
      const res = await api.post(`/petitions/${formData.id}/assign`, {
        lawyerUserId: assigningLawyerId,
      });

      setFormData((prev) => ({ ...prev, ...res.data }));
      fetchHistory(formData.id);

      toast.success('Petición asignada correctamente.');
      await fetchPetitions();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al asignar la petición.');
    } finally {
      setIsAssigning(false);
    }
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
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-primary md:text-3xl">
            <Scale className="text-secondary" />
            Gestión de Derechos de Petición
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Redacción, revisión, control de términos y exportación oficial.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleNewDraft} className="bg-primary text-white hover:bg-slate-800">
            <Sparkles size={16} className="mr-2" />
            Nueva respuesta
          </Button>

          <Link href="/inteligencia">
            <Button variant="outline" className="border-primary text-primary">
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

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                {/* Plan "Cadena de Firma", Fase 5 (2026-09-03) — vista
                "Pendientes de mi aprobación" para el congresista: mismo
                gate de `canApprove` que los botones de aprobar/rechazar,
                para no ofrecer un filtro que no le sirve a un abogado. */}
                {canApprove && (
                  <label className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-600">
                    <Switch
                      checked={onlyPendingApproval}
                      onCheckedChange={setOnlyPendingApproval}
                    />
                    Pendientes de mi aprobación
                  </label>
                )}

                {/* Post-plan (2026-09-03) — "asignación de abogados con UI
                real": esta la ve CUALQUIER usuario (a diferencia de la de
                arriba) — un abogado real quiere ver solo lo que a ÉL le
                toca, sin necesitar la lista completa de colegas. */}
                <label className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-600">
                  <Switch
                    checked={onlyMyAssigned}
                    onCheckedChange={setOnlyMyAssigned}
                  />
                  Mis peticiones asignadas
                </label>

                {canApprove && lawyers.length > 0 && (
                  <Select
                    value={assignedLawyerFilter || 'ALL'}
                    onValueChange={(val) =>
                      setAssignedLawyerFilter(val === 'ALL' ? '' : val)
                    }
                  >
                    <SelectTrigger className="h-9 w-full text-xs md:w-56">
                      <SelectValue placeholder="Asignado a..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">
                        Todos los abogados
                      </SelectItem>
                      {lawyers.map((lawyer) => (
                        <SelectItem key={lawyer.id} value={lawyer.id} className="text-xs">
                          {lawyer.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar radicado, ciudadano o estado..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
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
                        <th className="px-4 py-3">Asignado a</th>
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

                          <td className="px-4 py-3 text-xs text-slate-600">
                            {resolveLawyerName(p.assignedLawyerId) || (
                              <span className="text-slate-400">Sin asignar</span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-mono text-xs">
                            {p.deadlineAt
                              ? new Date(p.deadlineAt).toLocaleDateString('es-CO')
                              : 'N/A'}
                            {p.deadlineExtendedAt && (
                              <span
                                title="Plazo extendido (Art. 14, Ley 1755/2015)"
                                className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700"
                              >
                                Ext.
                              </span>
                            )}
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
                <CardHeader className="rounded-t-lg bg-primary py-3 text-center text-white">
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

                  {/* Post-plan (2026-09-03) — "notificación real al
                  peticionario": si se deja en blanco, simplemente no se le
                  avisa al ciudadano cuando se firme — no bloquea nada del
                  resto del flujo. */}
                  <Field label="Correo del peticionario (opcional)" icon={Mail}>
                    <Input
                      type="email"
                      value={formData.petitionerEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, petitionerEmail: e.target.value })
                      }
                      className="h-9 text-xs"
                      placeholder="ciudadano@correo.com"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Si lo dejas, se le avisará por correo cuando la petición quede firmada.
                    </p>
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

                  {/* Plan "Cadena de Firma", Fase 3 (2026-09-03) — el
                  motivo real del rechazo, guardado por el despacho en
                  `reject()`. Sin esto, el dato existiría en la base pero
                  el abogado nunca lo vería — la ida y vuelta real que
                  esta fase construyó quedaría invisible en la práctica. */}
                  {formData.status === 'RECHAZADO' && formData.rejectionReason && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-900">
                      <p className="mb-1 font-bold uppercase tracking-wide">
                        Rechazado por el despacho
                      </p>
                      <p>{formData.rejectionReason}</p>
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
                      className="h-11 w-full bg-primary text-xs font-black uppercase tracking-widest hover:bg-slate-800"
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

              {/* Post-plan (2026-09-03) — "extensión de plazo legal" (Art.
              14, Ley 1755 de 2015). Antes de esto, el plazo real de una
              petición ni siquiera se mostraba en el editor (solo en la
              tabla del tablero) — cualquier usuario ve la fecha real y si
              ya fue extendida; solo el despacho (`canApprove`) puede
              extenderla, y solo una vez, mismo criterio que aprobar/
              rechazar. */}
              {formData.id && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <Calendar size={15} className="text-primary" />
                      Plazo legal
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <p className="text-xs text-slate-500">
                      Fecha límite:{' '}
                      <span className="font-bold text-slate-700">
                        {formData.deadlineAt
                          ? new Date(formData.deadlineAt).toLocaleDateString('es-CO')
                          : 'N/A'}
                      </span>
                    </p>

                    {formData.deadlineExtendedAt ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                        <p className="mb-1 font-bold uppercase tracking-wide">
                          Plazo extendido (Art. 14, Ley 1755/2015)
                        </p>
                        <p>{formData.deadlineExtensionReason}</p>
                      </div>
                    ) : (
                      canApprove && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExtendDialogOpen(true)}
                          className="w-full border-amber-200 text-xs text-amber-700 hover:bg-amber-50"
                        >
                          Extender plazo (doble del término)
                        </Button>
                      )
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Post-plan (2026-09-03) — "asignación de abogados con UI
              real": cierra el ciclo abierto desde la Fase 2
              (`assignLawyer()` existía en el backend, ningún botón lo
              usaba). Solo el despacho (`canApprove`) asigna — mismo
              criterio que aprobar/rechazar. Cualquier usuario ve a QUIÉN
              está asignada, aunque no pueda cambiarlo. */}
              {formData.id && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <User size={15} className="text-primary" />
                      Asignación
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <p className="text-xs text-slate-500">
                      {formData.assignedLawyerId ? (
                        <>
                          Asignada a{' '}
                          <span className="font-bold text-slate-700">
                            {resolveLawyerName(formData.assignedLawyerId) || 'un abogado'}
                          </span>
                        </>
                      ) : (
                        'Sin asignar todavía.'
                      )}
                    </p>

                    {canApprove && (
                      <div className="flex gap-2">
                        <Select
                          value={assigningLawyerId}
                          onValueChange={setAssigningLawyerId}
                        >
                          <SelectTrigger className="h-9 flex-1 text-xs">
                            <SelectValue placeholder="Elegir abogado..." />
                          </SelectTrigger>
                          <SelectContent>
                            {lawyers.map((lawyer) => (
                              <SelectItem key={lawyer.id} value={lawyer.id} className="text-xs">
                                {lawyer.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          onClick={handleAssignLawyer}
                          disabled={
                            isAssigning ||
                            !assigningLawyerId ||
                            assigningLawyerId === formData.assignedLawyerId
                          }
                          className="text-xs"
                        >
                          {isAssigning ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            'Asignar'
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Plan "Cadena de Firma", Fase 4 (2026-09-03), llevado a esta
              pantalla en la Fase 5 al retirarse "Redactor IA" (hallazgo P1
              real #10: "sin historial de versiones ni de acciones —
              imposible reconstruir qué pasó con un documento oficial si
              algo sale mal"). */}
              {formData.id && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <Clock size={15} className="text-primary" />
                      Historial
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {history.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Sin eventos registrados todavía.
                      </p>
                    ) : (
                      <ol className="space-y-3">
                        {history.map((entry) => (
                          <li
                            key={entry.id}
                            className="border-l-2 border-slate-200 pl-3"
                          >
                            <p className="text-xs font-bold text-primary">
                              {HISTORY_ACTION_LABELS[entry.action] || entry.action}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {entry.user?.fullName || 'Sistema'} ·{' '}
                              {new Date(entry.createdAt).toLocaleString('es-CO')}
                            </p>
                            {entry.detail && (
                              <p className="mt-1 text-[11px] italic text-slate-600">
                                “{entry.detail}”
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-8">
              <Card className="flex h-full min-h-[720px] flex-col border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between rounded-t-lg border-b bg-white py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold text-primary">
                        Editor jurídico profesional
                      </CardTitle>
                      <p className="text-xs text-slate-500">
                        {formData.petitionDirection === 'CREADA'
                          ? 'Redacción de derecho de petición'
                          : 'Respuesta institucional a derecho de petición'}
                      </p>
                    </div>
                    <StatusBadge status={formData.status} />
                    <AutosaveIndicator status={autosaveStatus} />
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

                        {(formData.status === 'BORRADOR' ||
                          formData.status === 'RECHAZADO') && (
                          <Button
                            size="sm"
                            onClick={handleSubmitForReview}
                            disabled={isSaving || !formData.id}
                            className="bg-yellow-600 text-xs text-white hover:bg-yellow-700"
                          >
                            <Send size={14} className="mr-2" />
                            {formData.status === 'RECHAZADO'
                              ? 'Reenviar a revisión'
                              : 'Enviar a revisión'}
                          </Button>
                        )}

                        {/* Plan "Cadena de Firma", Fase 3 — solo el
                        despacho real (rol ADMIN/SUPER_ADMIN) ve estos dos
                        botones; el backend los rechaza igual con un 403
                        real si alguien más los alcanza a golpear
                        directo, esto es solo para no mostrar una acción
                        que va a fallar. */}
                        {formData.status === 'EN_REVISION' && canApprove && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectDialogOpen(true)}
                              disabled={isSaving}
                              className="border-red-200 text-xs text-red-700 hover:bg-red-50"
                            >
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSignDocument}
                              disabled={isSaving || !formData.signatureImage}
                              className="bg-green-600 text-xs text-white hover:bg-green-700"
                            >
                              <CheckCircle size={14} className="mr-2" />
                              Aprobar y firmar
                            </Button>
                          </>
                        )}

                        {formData.status === 'EN_REVISION' && !canApprove && (
                          <span className="inline-flex items-center rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-800">
                            Pendiente de aprobación del despacho
                          </span>
                        )}

                        {formData.status === 'FIRMADO' && (
                          <Button
                            size="sm"
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="bg-primary text-xs text-white hover:bg-slate-800"
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

                  <div className="relative flex h-full overflow-y-auto bg-slate-100">
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
                      disabled={formData.status === 'FIRMADO' || loadingAi}
                      letterhead={<PetitionLetterhead />}
                    />
                    ) : (
                      <PaginatedPetitionPreview formData={formData} />
                    )}
                    </div>

                    {/* Mejora de UX del editor (2026-09-03) — antes, generar
                    con IA solo mostraba un spinner en el botón; el abogado
                    veía el documento (viejo o en blanco) sin ninguna señal
                    de que algo estaba pasando sobre ÉL. */}
                    {loadingAi && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-[1px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-semibold text-primary">
                          La IA está redactando el documento...
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <PrintableDocument printRef={printRef} formData={formData} />

      {/* Plan "Cadena de Firma", Fase 5 (2026-09-03) — reemplaza el
      `window.prompt()` provisional de la Fase 3. */}
      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) setRejectReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar y devolver al abogado</DialogTitle>
            <DialogDescription>
              Explica qué hay que corregir. El abogado verá este motivo tal
              cual al reabrir la petición.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo del rechazo</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Falta citar el artículo correcto de la Ley 1755 y precisar la fecha de los hechos."
              className="text-sm"
            />
            <p
              className={`text-xs ${
                rejectReason.trim().length > 0 && rejectReason.trim().length < 10
                  ? 'text-red-600'
                  : 'text-slate-400'
              }`}
            >
              {rejectReason.trim().length}/10 caracteres mínimos
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSaving || rejectReason.trim().length < 10}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isSaving ? (
                <Loader2 className="mr-2 animate-spin" size={14} />
              ) : null}
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-plan (2026-09-03) — "extensión de plazo legal" (Art. 14, Ley
      1755 de 2015): mismo patrón de diálogo real que el rechazo. */}
      <Dialog
        open={extendDialogOpen}
        onOpenChange={(open) => {
          setExtendDialogOpen(open);
          if (!open) setExtendReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender el plazo legal</DialogTitle>
            <DialogDescription>
              El Art. 14 de la Ley 1755 de 2015 permite duplicar el plazo
              con un motivo real justificado, notificado antes de que
              venza el plazo original. Esta extensión solo se puede
              aplicar una vez por petición.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="extend-reason">Motivo de la extensión</Label>
            <Textarea
              id="extend-reason"
              rows={4}
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              placeholder="Ej: Se requiere información adicional real de la entidad consultada para resolver de fondo."
              className="text-sm"
            />
            <p
              className={`text-xs ${
                extendReason.trim().length > 0 && extendReason.trim().length < 10
                  ? 'text-red-600'
                  : 'text-slate-400'
              }`}
            >
              {extendReason.trim().length}/10 caracteres mínimos
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialogOpen(false)}
              disabled={isExtending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExtendDeadline}
              disabled={isExtending || extendReason.trim().length < 10}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isExtending ? (
                <Loader2 className="mr-2 animate-spin" size={14} />
              ) : null}
              Confirmar extensión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        <Icon className={danger ? 'text-red-500' : 'text-primary'} size={18} />
      </div>
      <p className={danger ? 'text-2xl font-black text-red-600' : 'text-2xl font-black text-primary'}>
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
        : value === 'RECHAZADO'
          ? 'bg-red-100 text-red-700 border-red-200'
          : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <Badge className={`border uppercase ${styles}`}>
      {value.replace('_', ' ')}
    </Badge>
  );
}

// Mejora de UX del editor (2026-09-03) — el autoguardado (Fase 5) ya
// avisaba si fallaba, pero nunca daba ninguna señal de que SÍ funcionó —
// un abogado no tenía forma de saber "¿ya se guardó esto?" sin adivinar.
function AutosaveIndicator({
  status,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error';
}) {
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
        <Loader2 size={12} className="animate-spin" />
        Guardando...
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-600">
        <ShieldAlert size={12} />
        No se guardó el último cambio
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
      <CheckCircle size={12} />
      Guardado automáticamente
    </span>
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