// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import React from 'react';
import { CheckCircle, Loader2, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type PetitionOffice } from '@/components/dashboard/petitions/office-profile';
import { Badge } from '@/components/ui/badge';
import DOMPurify from 'dompurify';
import { PetitionForm } from './petition-model';

export function Stat({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
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

export function PaginatedPetitionPreview({
  formData,
  office,
  forPrint = false,
}: {
  formData: PetitionForm;
  office: PetitionOffice | null;
  forPrint?: boolean;
}) {
  // Sede, una línea por renglón (igual que en el PDF que arma el servidor).
  const officeLines = (office?.officeLocation ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <div className={forPrint ? '' : 'space-y-6 py-6'}>
      <div className="relative mx-auto flex min-h-[1056px] w-[816px] flex-col overflow-hidden bg-white shadow-xl">
        <div className="px-[105px] pt-8 font-serif text-slate-900">
          <div className="border-b-2 border-slate-900 pb-2">
            <p className="text-base font-bold tracking-wide">
              {office?.holderName || 'Datos del despacho sin configurar'}
            </p>
            <p className="text-xs">{office?.officeTitle || 'Complétalos en "Datos del despacho"'}</p>
          </div>
        </div>

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
            {/* eslint-disable-next-line @next/next/no-img-element -- URL dinámica (archivo subido, URL firmada o vista previa local): la optimización de next/image no aplica */}
            <img
              src={formData.signatureImage}
              alt="Firma"
              className="h-20 object-contain"
            />

            <div className="mt-2 w-64 border-t border-black pt-2">
              <p className="font-bold">
                {formData.signedBy || office?.holderName || 'Firmante no identificado'}
              </p>
              {office?.officeTitle && <p className="text-sm text-slate-600">{office.officeTitle}</p>}
              {officeLines.map((line) => (
                <p key={line} className="text-sm text-slate-600">{line}</p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto px-[105px] pb-6 font-serif text-slate-700">
          <div className="border-t border-slate-400 pt-2 text-center text-[11px] leading-snug">
            {officeLines.length > 0 && <p>{officeLines.join(' · ')}</p>}
            {office?.notificationEmail && <p>{office.notificationEmail}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
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

export function StatusBadge({ status }: { status?: string }) {
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
export function AutosaveIndicator({
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

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
      <p className="font-medium text-slate-500">{text}</p>
    </div>
  );
}

export function PrintableDocument({
  printRef,
  formData,
  office,
}: {
  printRef: React.RefObject<HTMLDivElement | null>;
  formData: PetitionForm;
  office: PetitionOffice | null;
}) {
  return (
    <div style={{ position: 'absolute', top: '-10000px', left: 0 }}>
      <div ref={printRef}>
        <PaginatedPetitionPreview formData={formData} office={office} forPrint />
      </div>
    </div>
  );
}
