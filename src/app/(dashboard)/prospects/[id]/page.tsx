// src/app/dashboard/prospects/[id]/page.tsx
'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProspectForm } from "@/components/dashboard/prospects/prospect-form";
import { PriorityScoreCard } from "@/components/dashboard/prospects/priority-score-card";
import { SocialContactsCard } from "@/components/dashboard/prospects/social-contacts-card";
import { ProspectVisitsCard } from "@/components/dashboard/field-visits/prospect-visits-card";
import { ProspectSurveysCard } from "@/components/dashboard/surveys/prospect-surveys-card";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";
import { usePermission } from "@/hooks/use-permission";

export default function EditProspectPage() {
  const params = useParams();
  const canWriteBase = usePermission('PROSPECTOS', 'canWrite');
  const canWriteGlobal = usePermission('PROSPECTOS_GLOBAL', 'canWrite');
  const [data, setData] = useState<{ id: string; firstName?: string; lastName?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProspect = async () => {
      try {
        const response = await api.get(`/prospects/${params.id}`);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching prospect", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProspect();
    }
  }, [params.id]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-900" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      {data && (
        <>
          <PriorityScoreCard prospectId={String(params.id)} />
          <SocialContactsCard prospectId={String(params.id)} />
          {/* Fase 3c: visitas puerta a puerta (solo si el servidor las tiene encendidas). */}
          <ProspectVisitsCard
            prospect={{ id: String(params.id), fullName: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() }}
            canWrite={canWriteBase || canWriteGlobal}
          />
          {/* Fase 4: encuestas y llamadas (solo si el servidor las tiene encendidas). */}
          <ProspectSurveysCard
            prospect={{ id: String(params.id), fullName: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() }}
          />
          {(canWriteBase || canWriteGlobal) && <ProspectForm initialData={data} />}
        </>
      )}
    </div>
  );
}
