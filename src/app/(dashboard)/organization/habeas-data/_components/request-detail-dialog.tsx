'use client';

// Fase 2 del análisis de punta a punta (2026-10-28, MSG-06): la cola mostraba
// código, tipo y cédula, pero no qué pide el titular ni cómo responderle. El
// detalle lo trae completo; la tabla solo un adelanto para no ensancharse a
// 390 px.
import type { ReactNode } from 'react';
import { FileText, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { DataSubjectRequest } from '@/lib/api/habeas-data';
import {
  REQUEST_TYPE_LABEL,
  STATUS_CONFIG,
  changesDataOnResolve,
  formatRequestDate,
  isOpenRequest,
} from './habeas-data-labels';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

/** Cómo responderle al titular: el correo y el celular que dejó en el formulario. */
export function RequestContact({ request }: { request: DataSubjectRequest }) {
  if (!request.contactEmail && !request.contactPhone) {
    return (
      <p className="text-sm text-slate-500">
        No dejó correo ni teléfono: solo verá tu respuesta en el seguimiento público, con su código y su cédula.
      </p>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      {request.contactEmail && (
        <li className="flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <a className="break-all text-primary underline" href={`mailto:${request.contactEmail}`}>
            {request.contactEmail}
          </a>
        </li>
      )}
      {request.contactPhone && (
        <li className="flex items-start gap-2">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <a className="break-all text-primary underline" href={`tel:${request.contactPhone.replace(/[^\d+]/g, '')}`}>
            {request.contactPhone}
          </a>
        </li>
      )}
    </ul>
  );
}

/** Lo que pide el titular, tal como lo escribió. */
export function RequestDetails({ request, className = '' }: { request: DataSubjectRequest; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700 ${className}`}>
      {request.details}
    </p>
  );
}

export function RequestDetailDialog({ request }: { request: DataSubjectRequest }) {
  const status = STATUS_CONFIG[request.status];
  const typeLabel = REQUEST_TYPE_LABEL[request.requestType] ?? request.requestType;
  const dueAt = request.extendedDueAt ?? request.dueAt;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Ver la solicitud ${request.publicCode}`}>
          <FileText className="mr-1.5 h-3.5 w-3.5" /> Ver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Solicitud <span className="font-mono">{request.publicCode}</span>
          </DialogTitle>
          <DialogDescription>
            {typeLabel} · recibida el {formatRequestDate(request.submittedAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Badge variant={status.variant}>{status.label}</Badge>
          {isOpenRequest(request) && (
            <span>
              Plazo: {formatRequestDate(dueAt)}
              {request.extendedDueAt ? ' (con prórroga)' : ''}
            </span>
          )}
        </div>

        <Section title="Lo que pide el titular">
          <RequestDetails request={request} />
        </Section>

        <Section title="Titular">
          <p className="text-sm">
            {request.prospect ? (
              <>
                {request.prospect.firstName} {request.prospect.lastName}
                {request.prospect.deletedAt && (
                  <Badge variant="outline" className="ml-2">
                    Fuera de la base
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-slate-500">No está enlazado a ningún contacto de tu base.</span>
            )}
          </p>
          <p className="font-mono text-xs text-slate-500">Cédula {request.documentNumber}</p>
          {!request.prospect && isOpenRequest(request) && changesDataOnResolve(request) && (
            <p className="text-xs text-slate-500">Al resolverla se busca por esta cédula en tu base.</p>
          )}
        </Section>

        <Section title="Cómo contactarlo">
          <RequestContact request={request} />
        </Section>

        {request.extensionReason && (
          <Section title="Prórroga">
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{request.extensionReason}</p>
          </Section>
        )}

        {request.resolvedAt && (
          <Section title={request.status === 'RECHAZADA' ? 'Motivo del rechazo' : 'Respuesta'}>
            <p className="text-xs text-slate-500">
              {status.label} el {formatRequestDate(request.resolvedAt)}
              {request.resolvedByUser?.fullName ? ` por ${request.resolvedByUser.fullName}` : ''}
            </p>
            {request.resolutionNotes && (
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{request.resolutionNotes}</p>
            )}
          </Section>
        )}
      </DialogContent>
    </Dialog>
  );
}
