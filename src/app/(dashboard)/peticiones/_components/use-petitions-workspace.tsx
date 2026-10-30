// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import api, { LONG_REQUEST_TIMEOUT_MS } from '@/lib/api';
import { calendarDayISO, todayISO } from '@/lib/dates';
import { useAuthStore } from '@/store/auth-store';
import { type PetitionOffice } from '@/components/dashboard/petitions/office-profile';
import { PetitionForm, PetitionListItem, PetitionHistoryEntry, initialForm, extractErrorMessage, isPetitionLocked, petitionTypeInfo } from './petition-model';

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
 * Fase 5 del análisis de punta a punta (2026-10-28, GOB-06): el tablero pedía
 * siempre la página 1 con 100 filas (las de plazo más cercano): con más de
 * 100, las nuevas no aparecían y la búsqueda y las cifras solo contaban esas
 * 100. Ahora la tabla va por páginas, la búsqueda y los filtros los aplica el
 * servidor y las cifras salen de `GET /petitions/summary`.
 */
const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 350;
/** Mismo tope que el servidor (`ApprovePetitionDto`), antes de convertirla a base64. */
const SIGNATURE_MAX_BYTES = 200 * 1024;
const SIGNATURE_TOO_BIG =
  'La imagen de la firma pesa demasiado: sube una de máximo 200 KB (recorta la foto para que quede solo la firma y guárdala en PNG o JPG).';

/** Cifras del tablero (`GET /petitions/summary`). */
type PetitionSummary = {
  total: number;
  byStatus: Record<string, number>;
  created: number;
  answered: number;
  critical: number;
};

/**
 * Estado, efectos y acciones de la pantalla de Peticiones (movidos tal cual
 * desde el componente de la página). Lo usan la página y sus secciones.
 */
export function usePetitionsWorkspace(options: { loadList?: boolean; documentOnly?: boolean } = {}) {
  const shouldLoadList = options.loadList !== false;
  const lastSavedContent = useRef('');
  const [petitions, setPetitions] = useState<PetitionListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  // Fase 5 (GOB-06): página actual, total de la búsqueda y cifras del tablero.
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState({ total: 0, lastPage: 0 });
  const [summary, setSummary] = useState<PetitionSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [onlyPendingApproval, setOnlyPendingApprovalValue] = useState(false);
  // Post-plan (2026-09-03) — "asignación de abogados con UI real": mismo
  // criterio, ahora para el lado del abogado — filtra a solo lo que ESTE
  // usuario tiene asignado, sin importar su rol.
  const [onlyMyAssigned, setOnlyMyAssignedValue] = useState(false);
  const [assignedLawyerFilter, setAssignedLawyerFilterValue] = useState<string>('');

  // Fase 5 (GOB-06): cambiar un filtro vuelve a la primera página.
  const setOnlyPendingApproval = (value: boolean) => {
    setOnlyPendingApprovalValue(value);
    setPage(1);
  };
  const setOnlyMyAssigned = (value: boolean) => {
    setOnlyMyAssignedValue(value);
    setPage(1);
  };
  const setAssignedLawyerFilter = (value: string) => {
    setAssignedLawyerFilterValue(value);
    setPage(1);
  };
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
  const canWrite = canEditOffice;
  const canApprove =
    currentUser?.role?.code === 'ADMIN' ||
    currentUser?.role?.code === 'SUPER_ADMIN';

  const printRef = useRef<HTMLDivElement>(null);

  // Fase 5 (GOB-06): la búsqueda va al servidor cuando se deja de escribir, y
  // vuelve a la primera página.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(query.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  // "Mis peticiones asignadas" y el filtro por abogado van al servidor como un
  // solo `assignedLawyerId`; si piden a dos personas distintas, no hay filas.
  const assignedFilter = onlyMyAssigned ? currentUser?.id || assignedLawyerFilter : assignedLawyerFilter;
  const filtersConflict =
    onlyMyAssigned && !!currentUser?.id && !!assignedLawyerFilter && assignedLawyerFilter !== currentUser.id;
  const hasActiveFilters = !!searchTerm || onlyPendingApproval || onlyMyAssigned || !!assignedLawyerFilter;

  const loadList = useCallback(async () => {
    if (!shouldLoadList) return;
    if (filtersConflict) {
      setPetitions([]);
      setListMeta({ total: 0, lastPage: 0 });
      setLoadingList(false);
      return;
    }

    setLoadingList(true);

    try {
      const res = await api.get('/petitions', {
        params: {
          page,
          limit: PAGE_SIZE,
          q: searchTerm || undefined,
          status: onlyPendingApproval ? 'EN_REVISION' : undefined,
          assignedLawyerId: assignedFilter || undefined,
        },
      });

      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      const lastPage = Number(res.data?.meta?.lastPage) || 0;
      setPetitions(rows);
      setListMeta({ total: Number(res.data?.meta?.total) || 0, lastPage });
      // La última página se quedó vacía (p. ej. se firmó la única pendiente):
      // se pasa a la que ahora es la última.
      if (!rows.length && lastPage > 0 && page > lastPage) setPage(lastPage);
    } catch {
      toast.error('No se pudo cargar el historial de peticiones.');
    } finally {
      setLoadingList(false);
    }
  }, [page, searchTerm, onlyPendingApproval, assignedFilter, filtersConflict, shouldLoadList]);

  const loadSummary = useCallback(async () => {
    if (!shouldLoadList) return;
    try {
      const res = await api.get<PetitionSummary>('/petitions/summary');
      setSummary(res.data ?? null);
    } catch {
      // Las cifras no bloquean la tabla: se quedan como estaban.
    }
  }, [shouldLoadList]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  /** Recarga la página actual y las cifras (después de guardar, firmar, asignar…). */
  const fetchPetitions = async () => {
    await Promise.all([loadList(), loadSummary()]);
  };

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

  // Plan "Cadena de Firma", Fase 5 (2026-09-03) — "Pendientes de mi
  // aprobación" (peticiones en revisión, esperando la firma del despacho) y
  // post-plan (2026-09-03) — "Mis peticiones asignadas". Fase 5 del análisis
  // de punta a punta (GOB-06): esos filtros y la búsqueda los aplica el
  // servidor (`loadList`), así que la tabla muestra la página tal cual llega.
  const filteredPetitions = petitions;

  // Fase 5 (GOB-06): de todas las peticiones de la organización, no de la página.
  const stats = useMemo(() => {
    return {
      total: summary?.total ?? 0,
      draft: summary?.byStatus?.BORRADOR ?? 0,
      review: summary?.byStatus?.EN_REVISION ?? 0,
      signed: summary?.byStatus?.FIRMADO ?? 0,
      red: summary?.critical ?? 0,
      createdByMe: summary?.created ?? 0,
      answeredByMe: summary?.answered ?? 0,
    };
  }, [summary]);

  const selectedType = petitionTypeInfo[formData.petitionType];

  // Fase 3 del análisis de punta a punta (2026-10-28): la firmada se ve de solo
  // lectura (GOB-04), y con prórroga del plazo ya no se cambian la fecha de
  // recibo ni el tipo (GOB-05); el servidor responde 409 en ambos casos.
  const isLocked = isPetitionLocked(formData.status, formData.signedAt);
  const hasDeadlineExtension = !!formData.deadlineExtendedAt;

  const canGenerate =
    !!selectedFile || formData.originalText.trim().length >= 30;

  const canSave =
    !!formData.id || (formData.petitioner.trim().length >= 3 &&
    formData.generatedDraft.trim().length >= 30);


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

  // Plan "Cadena de Firma", Fase 5 (2026-09-03) — hallazgo P1 real del
  // diagnóstico original: "el debounce de 3s envuelve el PATCH en `catch
  // {}` vacío — un fallo de red nunca se muestra al abogado". Un
  // autoguardado real que falla en silencio es peor que no autoguardar:
  // el abogado sigue escribiendo creyendo que el trabajo está a salvo.
  useEffect(() => {
    if (!formData.id || !canWrite || isLocked || lastSavedContent.current === formData.generatedDraft) return;

    setAutosaveStatus('saving');

    const timeout = setTimeout(async () => {
      if (lastSavedContent.current === formData.generatedDraft) return;
      try {
        await api.patch(`/petitions/${formData.id}`, buildPetitionPayload());
        lastSavedContent.current = formData.generatedDraft;
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
  }, [formData.id, formData.generatedDraft, formData.signedAt, isLocked, canWrite]);

 
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

    // Fase 5 (GOB-06): el servidor rechaza una firma de más de ~220 KB en
    // base64; se avisa antes de convertirla.
    if (file.size > SIGNATURE_MAX_BYTES) {
      toast.error(SIGNATURE_TOO_BIG);
      return;
    }

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
    if (isLocked) {
      toast.info('Esta petición ya está firmada o tramitada: no se puede volver a redactar.');
      return;
    }

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
        : // Fase 5 del análisis de punta a punta (2026-10-28, TRV-25): la
          // redacción con IA pasa del plazo general de 30 s (la del PDF ya
          // usa el de subida de archivos).
          await api.post(`/petitions/${petitionId}/generate-ai`, {}, { timeout: LONG_REQUEST_TIMEOUT_MS });

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

    if (options.documentOnly && data.id) return { generatedDraft: data.generatedDraft };

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
      // Fase 3 del análisis de punta a punta (2026-10-28, GOB-04): aquí iban
      // `signedAt`, `signedBy` y `signatureImage`. El servidor ya no los acepta
      // en el PATCH (400): la firma la pone solo "Aprobar y firmar", que manda
      // la imagen en su propia petición.
    };
  };

  const handleSaveToDb = async () => {
    if (isLocked) {
      toast.info('Esta petición ya está firmada o tramitada: su contenido no se puede modificar.');
      return;
    }

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

      lastSavedContent.current = normalizeDraftToHtml(res.data?.generatedDraft || payload.generatedDraft);
      setAutosaveStatus('saved');

      toast.success('Petición guardada correctamente.');
      await fetchPetitions();
      if (res.data?.id) fetchHistory(res.data.id);
    } catch (error) {
      console.error(error);
      // El servidor explica por qué (fecha futura, prórroga concedida, firmada).
      toast.error(extractErrorMessage(error) || 'Error al guardar la petición.');
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

  // Fase 5 (GOB-06): la fila de la tabla ya no trae los apuntes, el documento
  // ni la firma; el editor carga el registro completo por id.
  const handleLoadPetition = async (row: PetitionListItem) => {
    if (!row.id) return;

    let petition: PetitionListItem;
    try {
      const res = await api.get<PetitionListItem>(`/petitions/${row.id}`);
      petition = res.data;
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo abrir la petición. Vuelve a intentarlo.');
      return;
    }

    lastSavedContent.current = normalizeDraftToHtml(petition.generatedDraft || petition.draft || '');
    setFormData({
      id: petition.id || '',
      radicado: petition.radicado || '',
      petitioner: petition.petitioner || '',
      petitionerEmail: petition.petitionerEmail || '',
      petitionType: petition.petitionType || 'GENERAL',
      status: petition.status || 'BORRADOR',
      // Fase 3 del análisis de punta a punta (2026-10-28, GOB-07): sin fecha
      // guardada proponía el día en UTC (mañana, después de las 7 p. m.).
      receivedAt: calendarDayISO(petition.receivedAt) || todayISO(),
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
    // Hoy al abrir el borrador, no el día en que se cargó la pantalla.
    setFormData({ ...initialForm, receivedAt: todayISO() });
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
    page,
    setPage,
    pageSize: PAGE_SIZE,
    listMeta,
    hasActiveFilters,
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
    canWrite,
    printRef,
    lawyerMap,
    resolveLawyerName,
    filteredPetitions,
    stats,
    selectedType,
    isLocked,
    hasDeadlineExtension,
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
