// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { calendarDayISO } from '@/lib/dates';
import { useAuthStore } from '@/store/auth-store';
import { type PetitionOffice } from '@/components/dashboard/petitions/office-profile';
import { PetitionForm, PetitionListItem, PetitionHistoryEntry, initialForm, extractErrorMessage, petitionTypeInfo } from './petition-model';

/**
 * Fase 1 (2026-10-27, GOB-12): el servidor devuelve `receivedAt` como fecha
 * ISO completa y el `input type=date` de "Fecha recibo" solo entiende
 * AAAA-MM-DD — al mezclar la respuesta en el formulario quedaba en blanco.
 * Es una fecha de calendario (guardada a mediodía de Colombia).
 */
function withCalendarDays<T extends { receivedAt?: string | null }>(data: T): T {
  return data?.receivedAt ? { ...data, receivedAt: calendarDayISO(data.receivedAt) } : data;
}

/**
 * GOB-16 (2026-10-27): con `responseType: 'blob'` el 400 del servidor (p. ej.
 * faltan los datos del despacho) llega como Blob con JSON adentro, y
 * `extractErrorMessage` no lo ve. Se lee el texto y se saca `message`.
 */
async function extractBlobErrorMessage(error: unknown): Promise<string | undefined> {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  if (!(data instanceof Blob)) return undefined;
  try {
    const parsed = JSON.parse(await data.text()) as { message?: string | string[] };
    return Array.isArray(parsed.message) ? parsed.message[0] : parsed.message;
  } catch {
    return undefined;
  }
}

/**
 * Estado, efectos y acciones de la pantalla de Peticiones (movidos tal cual
 * desde el componente de la página). Lo usan la página y sus secciones.
 */
export function usePetitionsWorkspace() {
  const [petitions, setPetitions] = useState<PetitionListItem[]>([]);
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

  const [history, setHistory] = useState<PetitionHistoryEntry[]>([]);

  // Plan "Cadena de Firma", Fase 3 (2026-09-03) — decisión confirmada: el
  // gate real de aprobación vive en el backend (`PetitionsService.
  // approve()`/`reject()`, por rol ADMIN/SUPER_ADMIN) — esto es solo la
  // UI: nunca mostrar un botón que el backend igual va a rechazar con un
  // 403 real.
  const currentUser = useAuthStore((s) => s.user);
  // Datos del despacho de ESTA organización: con ellos se arma el membrete y
  // la firma (antes estaban escritos a mano los del primer cliente).
  const [office, setOffice] = useState<PetitionOffice | null>(null);
  const canEditOffice = (currentUser?.permissions ?? []).some(
    (permission) => permission.module === 'PETICIONES' && permission.canWrite,
  );
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
          data.map((u: { id: string; fullName: string }) => ({ id: u.id, fullName: u.fullName })),
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
      red: petitions.filter((p) => p.trafficLight === 'RED' || p.trafficLight === 'EXPIRED').length,
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
    // Autoguardado SOLO cuando cambia el texto del borrador. `buildPetitionPayload`
    // es una función nueva en cada render: incluirla dispararía un guardado cada 3 s
    // aunque nada haya cambiado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.generatedDraft]);

 
  // Membrete del editor: los datos del despacho de esta organización (antes,
  // una imagen fija con el escudo del Congreso y los datos del primer cliente).
  function PetitionLetterhead() {
    return (
      <div className="mb-8 border-b-2 border-slate-900 pb-2 font-serif text-slate-900">
        <p className="text-base font-bold tracking-wide">
          {office?.holderName || 'Datos del despacho sin configurar'}
        </p>
        <p className="text-xs">{office?.officeTitle || 'Complétalos en "Datos del despacho"'}</p>
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
        ...withCalendarDays(res.data),
        id: petitionId,
        generatedDraft: normalizeAiDraft(res.data?.generatedDraft || ''),
      }));

      toast.success('Borrador generado con IA.');
      await fetchPetitions();
      fetchHistory(petitionId);
    } catch (error) {
      console.error(error);
      // Si el servicio de IA está caído/sin cuota el backend responde 503 con
      // un mensaje claro — se muestra tal cual en vez del error genérico.
      toast.error(extractErrorMessage(error) || 'Error al generar el borrador con IA.');
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
        ...withCalendarDays(res.data),
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

      setFormData((prev) => ({ ...prev, ...withCalendarDays(res.data) }));
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

      setFormData((prev) => ({ ...prev, ...withCalendarDays(res.data) }));
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

      setFormData((prev) => ({ ...prev, ...withCalendarDays(res.data) }));
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

  const handleLoadPetition = (petition: PetitionListItem) => {
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

      setFormData((prev) => ({ ...prev, ...withCalendarDays(res.data) }));
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

      setFormData((prev) => ({ ...prev, ...withCalendarDays(res.data) }));
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
      toast.error(
        (await extractBlobErrorMessage(error)) ||
          extractErrorMessage(error) ||
          'No se pudo generar el PDF.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  return {
    petitions,
    setPetitions,
    loadingList,
    setLoadingList,
    editorMode,
    setEditorMode,
    selectedFile,
    setSelectedFile,
    loadingAi,
    setLoadingAi,
    isSaving,
    setIsSaving,
    autosaveStatus,
    setAutosaveStatus,
    isExporting,
    setIsExporting,
    query,
    setQuery,
    activeTab,
    setActiveTab,
    onlyPendingApproval,
    setOnlyPendingApproval,
    onlyMyAssigned,
    setOnlyMyAssigned,
    assignedLawyerFilter,
    setAssignedLawyerFilter,
    lawyers,
    setLawyers,
    assigningLawyerId,
    setAssigningLawyerId,
    isAssigning,
    setIsAssigning,
    formData,
    setFormData,
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectReason,
    setRejectReason,
    extendDialogOpen,
    setExtendDialogOpen,
    extendReason,
    setExtendReason,
    isExtending,
    setIsExtending,
    history,
    setHistory,
    currentUser,
    office,
    setOffice,
    canEditOffice,
    canApprove,
    printRef,
    lawyerMap,
    resolveLawyerName,
    filteredPetitions,
    stats,
    selectedType,
    canGenerate,
    canSave,
    normalizeDraftToHtml,
    fetchPetitions,
    PetitionLetterhead,
    handleSignatureUpload,
    ensurePetitionRecord,
    handleAiProcess,
    buildPetitionPayload,
    handleSaveToDb,
    handleSubmitForReview,
    handleReject,
    handleExtendDeadline,
    fetchHistory,
    handleLoadPetition,
    normalizeAiDraft,
    handleSignDocument,
    handleNewDraft,
    handleAssignLawyer,
    handleExportPDF,
  };
}

export type PetitionsWorkspace = ReturnType<typeof usePetitionsWorkspace>;
