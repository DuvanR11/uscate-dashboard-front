'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Save,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/apis';

type SenderRole = 'CIUDADANO' | 'CONGRESISTA';
type PetitionStatus = 'BORRADOR' | 'EN_REVISION' | 'FIRMADO';

export default function PetitionEditorPage() {
  const params = useParams();
  const router = useRouter();

  const [petition, setPetition] = useState<any>(null);
  const [draftContent, setDraftContent] = useState('');
  const [senderRole, setSenderRole] = useState<SenderRole>('CIUDADANO');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPetition();
  }, [params.id]);

  const fetchPetition = async () => {
    try {
      const data = (await apiGet(`/petitions/${params.id}`)) as any;
      setPetition(data);
      setDraftContent(data.generatedDraft || '');
    } catch (error) {
      console.error('Error fetching petition', error);
      alert('No se pudo cargar la petición.');
    }
  };

  const deadlineInfo = useMemo(() => {
    if (!petition?.deadlineAt) {
      return {
        label: 'Sin fecha límite',
        daysLeft: null,
        color: 'slate',
      };
    }

    const today = new Date();
    const deadline = new Date(petition.deadlineAt);
    const diff = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diff <= 2) {
      return {
        label: `${diff} días restantes`,
        daysLeft: diff,
        color: 'red',
      };
    }

    if (diff <= 5) {
      return {
        label: `${diff} días restantes`,
        daysLeft: diff,
        color: 'amber',
      };
    }

    return {
      label: `${diff} días restantes`,
      daysLeft: diff,
      color: 'green',
    };
  }, [petition?.deadlineAt]);

  const deadline = petition?.deadlineAt
    ? new Date(petition.deadlineAt).toLocaleDateString('es-CO')
    : 'N/A';

  const status = (petition?.status || 'BORRADOR') as PetitionStatus;

  const canEdit = status !== 'FIRMADO';
  const hasDraft = draftContent.trim().length > 0;

  const handleGenerateAI = async () => {
    setIsGenerating(true);

    try {
      const res = (await apiPost(`/petitions/${params.id}/generate-ai`, {
        senderRole,
      })) as any;

      setPetition(res);
      setDraftContent(res.generatedDraft || '');
    } catch (error) {
      console.error(error);
      alert('Error al generar con IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (nextStatus?: PetitionStatus) => {
    setIsSaving(true);

    try {
      const updated = (await apiPatch(`/petitions/${params.id}`, {
        generatedDraft: draftContent,
        status: nextStatus || status,
      })) as any;

      setPetition((prev: any) => ({
        ...prev,
        ...updated,
        generatedDraft: draftContent,
        status: nextStatus || status,
      }));

      alert('Documento guardado con éxito.');
    } catch (error) {
      console.error(error);
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToReview = async () => {
    await handleSave('EN_REVISION');
  };

  const handleApprove = async () => {
    await handleSave('FIRMADO');
  };

  if (!petition) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          <p>Cargando documento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col pb-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/peticiones"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1B2541]"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[#1B2541]">
                Redactor legal
              </h1>
              <StatusBadge status={status} />
            </div>

            <p className="text-sm font-medium text-slate-500">
              Peticionario:{' '}
              <span className="text-slate-700">
                {petition.petitioner || 'No registrado'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DeadlineBadge color={deadlineInfo.color} label={deadlineInfo.label} />

          <button
            onClick={() => handleSave()}
            disabled={isSaving || !hasDraft}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#1B2541] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            Guardar
          </button>

          {status === 'BORRADOR' && (
            <button
              onClick={handleSendToReview}
              disabled={isSaving || !hasDraft}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-700 disabled:opacity-50"
            >
              <Send size={16} />
              Enviar a revisión
            </button>
          )}

          {status === 'EN_REVISION' && (
            <button
              onClick={handleApprove}
              disabled={isSaving || !hasDraft}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle size={16} />
              Aprobar y firmar
            </button>
          )}
        </div>
      </div>

      <div className="grid flex-1 gap-6 overflow-hidden lg:grid-cols-[360px_1fr]">
        <aside className="flex flex-col gap-4 overflow-y-auto pr-1">
          <Panel title="Datos del caso" icon={User}>
            <InfoRow label="Radicado" value={petition.radicado || 'S.R.'} />
            <InfoRow label="Tipo" value={petition.petitionType || 'GENERAL'} />
            <InfoRow label="Fecha límite" value={deadline} />
            <InfoRow label="Estado" value={status.replace('_', ' ')} />
          </Panel>

          <Panel title="Apuntes originales" icon={FileText}>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {petition.originalText || 'No hay apuntes registrados.'}
            </div>
          </Panel>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-900">
              <BrainCircuit size={18} />
              Asistente jurídico IA
            </h2>

            <p className="mb-5 text-xs leading-5 text-indigo-700/80">
              Genera una respuesta estructurada con lenguaje jurídico, soporte
              constitucional y enfoque institucional.
            </p>

            <div className="mb-5">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                ¿Quién firmará?
              </label>

              <select
                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm font-medium text-indigo-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={senderRole}
                onChange={(e) => setSenderRole(e.target.value as SenderRole)}
                disabled={isGenerating || !canEdit}
              >
                <option value="CIUDADANO">Ciudadano / apoyo legal</option>
                <option value="CONGRESISTA">Congresista / control político</option>
              </select>
            </div>

            <button
              onClick={handleGenerateAI}
              disabled={isGenerating || !canEdit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B2541] px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-900 disabled:opacity-70"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              {isGenerating
                ? 'Redactando...'
                : hasDraft
                  ? 'Regenerar documento'
                  : 'Generar petición'}
            </button>
          </div>

          {deadlineInfo.color === 'red' && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-red-700">
                <AlertTriangle size={18} />
                <p className="font-bold">Atención</p>
              </div>
              <p className="text-sm leading-6 text-red-700">
                Esta petición está cerca de vencer. Prioriza revisión y firma.
              </p>
            </div>
          )}
        </aside>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div>
              <h2 className="font-bold text-[#1B2541]">Documento editable</h2>
              <p className="text-xs text-slate-500">
                {draftContent.length} caracteres
              </p>
            </div>

            {!canEdit && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
                Documento firmado
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
            {hasDraft || isGenerating ? (
              <textarea
                className={`mx-auto block min-h-full w-full max-w-4xl resize-none bg-white p-10 shadow-md outline-none transition focus:ring-2 focus:ring-blue-200 ${
                  isGenerating ? 'animate-pulse text-slate-300' : 'text-slate-800'
                }`}
                style={{
                  fontFamily: "'Times New Roman', Times, serif",
                  fontSize: '1.05rem',
                  lineHeight: '1.7',
                }}
                value={
                  isGenerating
                    ? 'La inteligencia artificial está redactando el documento...'
                    : draftContent
                }
                onChange={(e) => setDraftContent(e.target.value)}
                disabled={isGenerating || !canEdit}
              />
            ) : (
              <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
                <FileText size={52} className="mb-4 opacity-50" />
                <p className="text-lg font-semibold text-slate-500">
                  Documento en blanco
                </p>
                <p className="mt-1 text-sm">
                  Presiona “Generar petición” para crear el primer borrador.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        <Icon size={17} className="text-[#1B2541]" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#1B2541]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: PetitionStatus }) {
  const styles =
    status === 'FIRMADO'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'EN_REVISION'
        ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
        : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${styles}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function DeadlineBadge({ color, label }: { color: string; label: string }) {
  const styles =
    color === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : color === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : color === 'green'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${styles}`}>
      <Clock size={16} />
      {label}
    </div>
  );
}