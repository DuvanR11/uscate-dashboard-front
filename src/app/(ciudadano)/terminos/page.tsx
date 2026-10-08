'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LegalDocument } from '@/lib/api/billing';

// Documentos legales VIGENTES de la plataforma (términos, encargado del
// tratamiento, política de privacidad) — `GET /legal/current`, público:
// se leen antes de contratar. Solo aparecen los ya publicados.
export default function LegalDocumentsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';
    axios
      .get<LegalDocument[]>(`${API_URL}/legal/current`)
      .then((res) => setDocuments(res.data))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-secondary shadow-md">
            <ScrollText size={24} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Documentos legales</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Todavía no hay documentos publicados.</p>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">{doc.title}</CardTitle>
                <p className="text-xs text-slate-400">
                  Versión {doc.version}
                  {doc.publishedAt ? ` · vigente desde ${new Date(doc.publishedAt).toLocaleDateString('es-CO')}` : ''}
                </p>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{doc.content}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
