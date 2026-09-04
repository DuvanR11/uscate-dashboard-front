'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { getComplaint } from '@/lib/api/complaints';
import { ComplaintItem } from '@/types/complaint';
import { ManageComplaintView } from '@/components/dashboard/complaints/manage-complaint-view';

export default function ManageComplaintPage() {
  const params = useParams();
  const [data, setData] = useState<ComplaintItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const complaint = await getComplaint(params.id as string);
        setData(complaint);
      } catch (err) {
        console.error('Error fetching complaint', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchComplaint();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-2">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-slate-500 font-medium">Cargando caso...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-2 text-red-600">
        <AlertCircle className="h-10 w-10" />
        <p className="font-medium">No se pudo cargar el caso — no existe o no tienes acceso a él.</p>
      </div>
    );
  }

  return <ManageComplaintView complaint={data} />;
}
