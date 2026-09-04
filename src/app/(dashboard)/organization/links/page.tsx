'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink, Link2, Loader2, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * `/organization/links` — gap post-M4 de la "Deuda Multi-Tenant" (ver
 * memoria `deuda-multitenant-crm`): el slug de organización solo era
 * visible desde `/platform` (exclusivo PLATFORM_OPERATOR). Esta página le
 * da a CUALQUIER usuario de la organización (mismo criterio sin-permiso
 * que `GET /organization/profile`) los links públicos ya armados, listos
 * para copiar y compartir.
 *
 * Deliberadamente SOLO LECTURA — no hay forma de editar el slug acá. Con
 * la decisión D6 de la Fase M4, un slug viejo da 404 real sin fallback,
 * así que cambiarlo sigue siendo exclusivo de PLATFORM_OPERATOR vía
 * PATCH /platform/organizations/:id (que además deja rastro en
 * PlatformAuditLog): un ADMIN de organización no debe poder romper sin
 * querer links ya distribuidos (QR impresos, campañas ya enviadas).
 */

interface OrganizationProfile {
  id: string;
  name: string;
  nit: string;
  slug: string;
}

interface PublicLink {
  key: string;
  label: string;
  description: string;
  path: string;
}

export default function OrganizationLinksPage() {
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [origin, setOrigin] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get<OrganizationProfile>('/organization/profile');
      setProfile(data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // El origen (dominio del propio dashboard, ej. dashboard.uscateguicol.com)
    // solo existe en el navegador — los links públicos viven en las mismas
    // páginas Next.js del ciudadano, no en la API.
    setOrigin(window.location.origin);
  }, [load]);

  async function handleCopy(link: PublicLink, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(link.key);
      toast.success('Link copiado', { description: link.label });
      setTimeout(() => setCopiedKey((k) => (k === link.key ? null : k)), 2000);
    } catch {
      toast.error('No se pudo copiar el link. Cópialo manualmente.');
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-10 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No se pudieron cargar tus links públicos</h2>
        <Button onClick={load} variant="outline" className="mt-4">Reintentar</Button>
      </div>
    );
  }

  const links: PublicLink[] = [
    {
      key: 'register',
      label: 'Registro de ciudadanos',
      description: 'Formulario público para que un ciudadano se registre como prospecto.',
      path: `/${profile.slug}/register`,
    },
    {
      key: 'complaint',
      label: 'Radicar una PQRSD / denuncia',
      description: 'Formulario público para crear una petición, queja o denuncia.',
      path: `/${profile.slug}/denuncia-publica`,
    },
    {
      key: 'complaint-track',
      label: 'Consultar estado de una PQRSD',
      description: 'Página donde el ciudadano consulta el estado con su código de radicado.',
      path: `/${profile.slug}/denuncia-publica/consultar`,
    },
  ];

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-black text-primary tracking-tight">Enlaces públicos</h1>
        <p className="text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
          Organización: <span className="font-bold text-slate-800">{profile.name}</span>
          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 font-mono">
            /{profile.slug}
          </Badge>
        </p>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-4 flex items-start gap-3 bg-slate-50/60 rounded-xl">
          <Link2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-500">
            Estos son los enlaces que puedes compartir con ciudadanos (redes sociales, WhatsApp,
            QR impresos). Si necesitas cambiar el identificador <span className="font-mono">{profile.slug}</span>{' '}
            de tu organización, contacta al equipo de plataforma — hacerlo rompe de inmediato
            cualquier enlace ya distribuido con el identificador anterior.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {links.map((link) => {
          const url = `${origin}${link.path}`;
          const copied = copiedKey === link.key;
          return (
            <Card key={link.key} className="border-0 shadow-md ring-1 ring-slate-100 overflow-hidden group hover:ring-primary/20 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800">{link.label}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3">
                <code className="flex-1 text-xs sm:text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">
                  {url || link.path}
                </code>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(link, url)}
                    disabled={!origin}
                  >
                    {copied ? <Check className="h-4 w-4 mr-1.5 text-green-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" asChild disabled={!origin}>
                    <a href={url || link.path} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
