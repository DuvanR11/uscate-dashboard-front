// src/app/dashboard/prospects/[id]/page.tsx
'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProspectForm } from "@/components/dashboard/prospects/prospect-form";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function EditProspectPage() {
  const params = useParams();
  const [data, setData] = useState(null);
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
    <div className="max-w-5xl mx-auto py-6">
      {data && <ProspectForm initialData={data} />}
    </div>
  );
}