'use client';

import { CheckCircle, Clock, FileText, Save, Scale, Send, ShieldAlert, Sparkles } from 'lucide-react';
import { PetitionOfficeProfile } from '@/components/dashboard/petitions/office-profile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stat, PrintableDocument } from './_components/petition-widgets';
import { usePetitionsWorkspace } from './_components/use-petitions-workspace';
import { PetitionListTab } from './_components/petition-list-tab';
import { PetitionFormCard } from './_components/petition-form-card';
import { PetitionDeadlineCard } from './_components/petition-deadline-card';
import { PetitionLawyerCard } from './_components/petition-lawyer-card';
import { PetitionHistoryCard } from './_components/petition-history-card';
import { PetitionEditorPanel } from './_components/petition-editor-panel';
import { PetitionRejectDialog } from './_components/petition-reject-dialog';
import { PetitionExtendDialog } from './_components/petition-extend-dialog';

export default function PeticionesPage() {
  const w = usePetitionsWorkspace();
  const {
    activeTab,
    setActiveTab,
    formData,
    office,
    setOffice,
    canEditOffice,
    printRef,
    stats,
    handleNewDraft,
  } = w;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">
            <Scale className="text-secondary" />
            Gestión de Derechos de Petición
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Redacción, revisión, control de términos y exportación oficial.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PetitionOfficeProfile canEdit={canEditOffice} onChange={setOffice} />
          <Button onClick={handleNewDraft} className="bg-primary text-white hover:bg-primary/90">
            <Sparkles size={16} className="mr-2" />
            Nueva respuesta
          </Button>

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
          <PetitionListTab w={w} />
        </TabsContent>

        <TabsContent value="new">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-4">
              <PetitionFormCard w={w} />

              <PetitionDeadlineCard w={w} />

              <PetitionLawyerCard w={w} />

              <PetitionHistoryCard w={w} />
            </div>

            <div className="lg:col-span-8">
              <PetitionEditorPanel w={w} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <PrintableDocument printRef={printRef} formData={formData} office={office} />

      <PetitionRejectDialog w={w} />

      <PetitionExtendDialog w={w} />
    </div>
  );
}
