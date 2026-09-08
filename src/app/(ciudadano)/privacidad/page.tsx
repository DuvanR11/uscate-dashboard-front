'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Centro de cumplimiento Habeas Data (2026-09-08), Fase 2 — texto real
// leído de `GET /public/privacy-notice` (única fuente de verdad real,
// compartida con la validación de consentimiento del backend — nunca
// duplicado a mano acá).
interface PrivacyNotice {
  version: string;
  text: string;
  effectiveDate: string;
}

export default function PrivacyNoticePage() {
  const [notice, setNotice] = useState<PrivacyNotice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';
    axios
      .get(`${API_URL}/public/privacy-notice`)
      .then((res) => setNotice(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-[#FFC400]">
        <CardHeader className="text-center">
          <div className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1B2541] text-[#FFC400] shadow-md mb-3">
            <ShieldCheck size={24} />
          </div>
          <CardTitle className="text-2xl font-bold text-[#1B2541]">
            Política de Tratamiento de Datos Personales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : notice ? (
            <>
              <p className="whitespace-pre-line text-slate-600 leading-relaxed">{notice.text}</p>
              <p className="text-xs text-slate-400 mt-6 text-center">
                Versión {notice.version} — vigente desde {notice.effectiveDate}
              </p>
            </>
          ) : (
            <p className="text-center text-slate-400">No se pudo cargar el aviso de privacidad.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
