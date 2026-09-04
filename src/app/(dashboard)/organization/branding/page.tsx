'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Paintbrush, RotateCcw, Upload } from 'lucide-react';
import { Can } from '@/components/shared/can';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  brandingApi,
  uploadBrandingLogo,
  extractErrorMessage,
  DEFAULT_BRANDING,
  type AdminBranding,
} from '@/lib/api/branding';
import { hasLowContrastWithWhite } from '@/lib/color-contrast';

/**
 * `/organization/branding` — administración de Personalización de Marca
 * (White Label), Fase 6 del informe técnico. Gateada por `PERSONALIZACION`
 * (mismo molde `Can`/`usePermission` que `/catalogs`): `canRead` para ver
 * la página, `canWrite` para los controles de edición.
 *
 * El preview (decisión #8 de Fase 1) refleja el ESTADO DEL FORMULARIO, no
 * lo guardado — es 100% client-side con estilos inline propios, NO usa las
 * variables CSS reales de `ApplyTheme` (esas solo deben cambiar tras
 * guardar, o el admin vería el resto del dashboard "saltar" de color
 * mientras todavía está probando combinaciones).
 */
export default function BrandingPage() {
  return (
    <Can
      module="PERSONALIZACION"
      action="canRead"
      fallback={
        <div className="p-12 text-center text-slate-500">
          No tienes permisos para ver la personalización de marca.
        </div>
      }
    >
      <BrandingAdmin />
    </Can>
  );
}

type ColorField = 'primaryColor' | 'secondaryColor' | 'accentColor';

const COLOR_FIELDS: { field: ColorField; label: string }[] = [
  { field: 'primaryColor', label: 'Color principal' },
  { field: 'secondaryColor', label: 'Color secundario' },
  { field: 'accentColor', label: 'Color de acento' },
];

function BrandingAdmin() {
  const canWrite = usePermission('PERSONALIZACION', 'canWrite');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [admin, setAdmin] = useState<AdminBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [applicationName, setApplicationName] = useState('');
  const [colors, setColors] = useState<Record<ColorField, string>>({
    primaryColor: DEFAULT_BRANDING.primaryColor,
    secondaryColor: DEFAULT_BRANDING.secondaryColor,
    accentColor: DEFAULT_BRANDING.accentColor,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brandingApi.getAdmin();
      setAdmin(data);
      setApplicationName(data.applicationName ?? '');
      setColors({
        primaryColor: data.primaryColor ?? DEFAULT_BRANDING.primaryColor,
        secondaryColor: data.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
        accentColor: data.accentColor ?? DEFAULT_BRANDING.accentColor,
      });
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la personalización de marca');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleColorChange(field: ColorField, value: string) {
    setColors((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await brandingApi.update({
        applicationName: applicationName.trim() || undefined,
        ...colors,
      });
      toast.success('Personalización guardada', {
        description: 'Los cambios se verán reflejados en tu próxima carga del panel.',
      });
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al guardar la personalización');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar el mismo archivo después
    if (!file) return;

    setUploadingLogo(true);
    try {
      await uploadBrandingLogo(file);
      toast.success('Logo actualizado');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al subir el logo. Usa PNG, JPG o WEBP.');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleReset() {
    if (
      !confirm(
        '¿Restablecer la personalización de marca? Se borran el nombre, el logo y los colores configurados — la organización vuelve a mostrar la apariencia por defecto de la plataforma.',
      )
    ) {
      return;
    }

    setResetting(true);
    try {
      await brandingApi.reset();
      toast.success('Personalización restablecida');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al restablecer');
    } finally {
      setResetting(false);
    }
  }

  const previewName = applicationName.trim() || DEFAULT_BRANDING.applicationName;
  const previewLogoUrl = admin?.logoUrl ?? DEFAULT_BRANDING.logoUrl;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" /> Cargando personalización...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border/40 pb-6">
        <div className="p-2 bg-secondary/20 rounded-lg">
          <Paintbrush className="h-6 w-6 text-secondary-foreground" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Personalización de Marca</h2>
          <p className="text-muted-foreground">
            Nombre, logo y colores de tu organización. Si no configuras nada, se usa la apariencia
            por defecto de la plataforma — nunca queda sin tema.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* --- FORMULARIO --- */}
        <form onSubmit={handleSave} className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identidad</CardTitle>
              <CardDescription>Nombre de la aplicación tal como se muestra en el panel.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="applicationName">Nombre de la aplicación</Label>
              <Input
                id="applicationName"
                className="mt-1.5"
                placeholder={DEFAULT_BRANDING.applicationName}
                value={applicationName}
                onChange={(e) => setApplicationName(e.target.value)}
                disabled={!canWrite}
                maxLength={60}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logo</CardTitle>
              <CardDescription>PNG, JPG o WEBP — máximo 2MB. Se sube al guardar la selección.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden shrink-0">
                {/* Logo real (o el default de plataforma) — puede ser una URL
                    externa de DigitalOcean Spaces, por eso `unoptimized`: no
                    hay `images.remotePatterns` configurado para ese dominio
                    todavía y no vale la pena tocar next.config.ts solo para
                    esto en el MVP. */}
                <Image
                  src={previewLogoUrl}
                  alt="Logo actual"
                  width={64}
                  height={64}
                  unoptimized
                  className="object-contain"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoSelected}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!canWrite || uploadingLogo}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingLogo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploadingLogo ? 'Subiendo...' : 'Cambiar logo'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Colores</CardTitle>
              <CardDescription>Se aplican a botones, barra lateral y elementos destacados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {COLOR_FIELDS.map(({ field, label }) => (
                <div key={field} className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-12 rounded border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    value={/^#[0-9A-Fa-f]{6}$/.test(colors[field]) ? colors[field] : '#000000'}
                    onChange={(e) => handleColorChange(field, e.target.value)}
                    disabled={!canWrite}
                    aria-label={label}
                  />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input
                      value={colors[field]}
                      onChange={(e) => handleColorChange(field, e.target.value)}
                      disabled={!canWrite}
                      placeholder="#1B2541"
                      className="font-mono"
                    />
                  </div>
                  {hasLowContrastWithWhite(colors[field]) && (
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase text-amber-700 border-amber-300 bg-amber-50 gap-1 shrink-0"
                    >
                      <AlertTriangle className="h-3 w-3" /> Bajo contraste
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {canWrite && (
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={resetting || saving}
                className="text-destructive hover:text-destructive"
              >
                {resetting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Restablecer
              </Button>
              <Button type="submit" disabled={saving || resetting}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          )}
        </form>

        {/* --- PREVIEW EN VIVO --- */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Vista previa
            </p>
            <BrandingPreview
              applicationName={previewName}
              logoUrl={previewLogoUrl}
              primaryColor={colors.primaryColor}
              secondaryColor={colors.secondaryColor}
              accentColor={colors.accentColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface BrandingPreviewProps {
  applicationName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/**
 * Mockup autocontenido con estilos inline (NO variables CSS reales — ver
 * comentario en la cabecera del archivo) que refleja el formulario tal
 * cual está, sin guardar. Un color inválido (mientras el admin todavía
 * está escribiendo el hex) cae a un gris neutro en vez de romper el
 * render.
 */
function BrandingPreview({ applicationName, logoUrl, primaryColor, secondaryColor, accentColor }: BrandingPreviewProps) {
  const safe = (hex: string) => (/^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#94A3B8');

  return (
    <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
      {/* Barra tipo sidebar */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ backgroundColor: safe(primaryColor) }}
      >
        <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
          <Image src={logoUrl} alt="" width={24} height={24} unoptimized className="object-contain" />
        </div>
        <span className="text-sm font-bold text-white truncate">{applicationName}</span>
      </div>

      <div className="p-5 space-y-4">
        <div className="h-3 w-3/4 rounded bg-slate-100" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />

        <button
          type="button"
          disabled
          className="w-full rounded-md py-2 text-sm font-bold text-white"
          style={{ backgroundColor: safe(secondaryColor) }}
        >
          Botón principal
        </button>

        <a
          className="block text-sm font-medium text-center"
          style={{ color: safe(accentColor) }}
        >
          Enlace o etiqueta destacada
        </a>
      </div>

      <Separator />

      <p className="px-5 py-3 text-[11px] text-muted-foreground">
        Este preview no cambia el resto del panel — solo se aplica de verdad al guardar.
      </p>
    </div>
  );
}
