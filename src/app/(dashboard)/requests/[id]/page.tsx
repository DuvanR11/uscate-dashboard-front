'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";
import { ManageRequestView } from "@/components/dashboard/requests/manage-request-view"; // <--- Importamos el nuevo componente

export default function ManageRequestPage() {
  const params = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await api.get(`/requests/${params.id}`);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching request", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRequest();
    }
  }, [params.id]);

  if (loading) {
    return (
        <div className="flex h-[50vh] items-center justify-center flex-col gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-[#1B2541]" />
            <p className="text-slate-500 font-medium">Cargando expediente...</p>
        </div>
    );
  }

  if (error || !data) {
      return (
          <div className="flex h-[50vh] items-center justify-center flex-col gap-2 text-red-600">
              <AlertCircle className="h-10 w-10" />
              <p className="font-medium">No se pudo cargar la solicitud.</p>
          </div>
      );
  }

  // Renderizamos la vista especializada de gestión
  return <ManageRequestView request={data} />;
}