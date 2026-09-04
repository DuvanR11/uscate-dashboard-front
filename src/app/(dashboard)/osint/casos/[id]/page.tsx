'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SummaryTab from '@/components/dashboard/osint/case/SummaryTab';
import EvidenceTab from '@/components/dashboard/osint/case/EvidenceTab';
import RelationshipsTab from '@/components/dashboard/osint/case/RelationshipsTab';
import IndicatorsTab from '@/components/dashboard/osint/case/IndicatorsTab';
import MonitorsTab from '@/components/dashboard/osint/case/MonitorsTab';
import CaseTimelineTab from '@/components/dashboard/osint/case/CaseTimelineTab';
import EntityGraphView from '@/components/dashboard/osint/EntityGraphView';
import type { PickedEntity } from '@/components/dashboard/osint/EntityPickerInline';
import {
  getCase,
  deleteCase,
  listEvidenceByCase,
  extractErrorMessage,
  type InvestigationCaseDetail,
  type Evidence,
} from '@/lib/api/osint';

const STATUS_LABEL: Record<string, string> = { OPEN: 'Abierto', CLOSED: 'Cerrado', ARCHIVED: 'Archivado' };

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [investigationCase, setInvestigationCase] = useState<InvestigationCaseDetail | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [downloadingReport, setDownloadingReport] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, ev] = await Promise.all([getCase(id), listEvidenceByCase(id)]);
      setInvestigationCase(c);
      setEvidence(ev);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cargar el caso');
      router.push('/osint/casos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Entidades conocidas por este caso: derivadas de qué evidencia real ya
  // tiene una `entity` vinculada — no existe un `GET /osint/entities` de
  // búsqueda libre, así que este es el único universo real navegable desde
  // Relaciones y Grafo.
  const knownEntities: PickedEntity[] = useMemo(() => {
    const seen = new Map<string, PickedEntity>();
    for (const e of evidence) {
      if (e.entity) {
        seen.set(e.entity.id, {
          id: e.entity.id,
          canonicalName: e.entity.canonicalName,
          type: e.entity.type as PickedEntity['type'],
        });
      }
    }
    return Array.from(seen.values());
  }, [evidence]);

  const handleDelete = async () => {
    if (!investigationCase) return;
    try {
      await deleteCase(investigationCase.id);
      toast.success('Caso eliminado');
      router.push('/osint/casos');
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo eliminar el caso');
    }
  };

  // Plan "Pilar OSINT" (2026-09-02), Fase B — mismo patrón real ya
  // probado en `peticiones/[id]/page.tsx::handleDownloadPdf` (blob +
  // enlace descartable): un PDF autenticado no puede servirse con un
  // <a href> plano, necesita viajar con el header de Authorization.
  const handleDownloadReport = async () => {
    if (!investigationCase) return;
    setDownloadingReport(true);
    try {
      const res = await api.get(`/osint/cases/${investigationCase.id}/report`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `informe-caso-${investigationCase.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo generar el informe');
    } finally {
      setDownloadingReport(false);
    }
  };

  const jumpToEvidence = (evidenceId: string) => {
    setTab('evidencia');
    setTimeout(() => {
      document.getElementById(`evidence-${evidenceId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  if (loading || !investigationCase) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-6">
        <div>
          <Link href="/osint/casos" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-2">
            <ArrowLeft size={12} /> Volver a Casos
          </Link>
          <h1 className="text-2xl font-black text-primary tracking-tight flex items-center gap-3">
            {investigationCase.title}
            <Badge variant="outline">{STATUS_LABEL[investigationCase.status]}</Badge>
          </h1>
          {investigationCase.description && <p className="text-slate-500 text-sm mt-1">{investigationCase.description}</p>}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadReport}
          disabled={downloadingReport}
        >
          {downloadingReport ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          Exportar informe
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="evidencia">Evidencia ({evidence.length})</TabsTrigger>
          <TabsTrigger value="relaciones">Relaciones</TabsTrigger>
          <TabsTrigger value="grafo">Grafo</TabsTrigger>
          <TabsTrigger value="tiempo">Línea de tiempo</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="monitores">Monitores</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <SummaryTab investigationCase={investigationCase} onUpdated={setInvestigationCase} onDeleted={handleDelete} />
        </TabsContent>

        <TabsContent value="evidencia">
          <EvidenceTab
            caseId={investigationCase.id}
            evidence={evidence}
            onCreated={(e) => setEvidence((prev) => [e, ...prev])}
          />
        </TabsContent>

        <TabsContent value="relaciones">
          <RelationshipsTab caseId={investigationCase.id} knownEntities={knownEntities} evidence={evidence} />
        </TabsContent>

        <TabsContent value="grafo">
          <EntityGraphView knownEntities={knownEntities} caseId={investigationCase.id} />
        </TabsContent>

        <TabsContent value="tiempo">
          <CaseTimelineTab caseId={investigationCase.id} />
        </TabsContent>

        <TabsContent value="indicadores">
          <IndicatorsTab caseId={investigationCase.id} onJumpToEvidence={jumpToEvidence} />
        </TabsContent>

        <TabsContent value="monitores">
          <MonitorsTab caseId={investigationCase.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
