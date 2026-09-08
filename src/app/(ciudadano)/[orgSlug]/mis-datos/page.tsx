'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, CheckCircle2, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Centro de cumplimiento Habeas Data (2026-09-08), Fase 3 — portal ARCO
// público (Ley 1581 de 2012): Acceso/Rectificación/Cancelación/Oposición.
// Sin login, mismo patrón real ya usado por denuncia-publica: se
// identifica con documentNumber, recibe un código público para consultar
// el estado después.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://usca.jurytechsolution.com';

const REQUEST_TYPE_LABEL: Record<string, string> = {
  ACCESO: 'Acceso — quiero saber qué datos tienen de mí',
  RECTIFICACION: 'Rectificación — mis datos están incorrectos',
  CANCELACION: 'Cancelación — quiero que borren mis datos',
  OPOSICION: 'Oposición — no quiero que me sigan contactando',
};

interface FormValues {
  documentNumber: string;
  requestType: string;
  details: string;
  contactEmail: string;
  contactPhone: string;
}

export default function DataSubjectRequestPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [loading, setLoading] = useState(false);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>();

  const requestType = watch('requestType');

  const onSubmit = async (data: FormValues) => {
    if (!data.requestType) {
      toast.error('Selecciona qué tipo de solicitud quieres hacer.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/public/organizations/${orgSlug}/habeas-data/requests`,
        data,
      );
      setPublicCode(res.data.publicCode);
      toast.success('Solicitud registrada correctamente.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo registrar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  if (publicCode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-[#FFC400] text-center animate-in zoom-in-95 duration-500">
          <CardContent className="pt-12 pb-8">
            <div className="mx-auto bg-[#1B2541] w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ring-4 ring-[#FFC400]/20">
              <CheckCircle2 size={48} className="text-[#FFC400]" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1B2541] mb-3">Solicitud registrada</h2>
            <p className="text-slate-500 mb-6">
              Guarda este código para consultar el estado de tu solicitud más adelante.
            </p>
            <div className="flex items-center justify-center gap-2 bg-slate-100 rounded-xl py-3 px-4 mb-6">
              <span className="font-mono text-xl font-bold text-[#1B2541]">{publicCode}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(publicCode);
                  toast.success('Código copiado');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Ley 1581 de 2012: tu solicitud será atendida dentro del plazo legal (10 o 15 días hábiles según el tipo).
            </p>
          </CardContent>
          <CardFooter className="bg-slate-50 py-4 justify-center">
            <a href={`/${orgSlug}/mis-datos/consultar?code=${publicCode}`} className="text-sm text-[#1B2541] font-medium underline">
              Consultar el estado de mi solicitud
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-[#FFC400]">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1B2541] text-[#FFC400] shadow-md">
            <ShieldCheck size={24} />
          </div>
          <CardTitle className="text-2xl font-bold text-[#1B2541]">Mis Datos Personales</CardTitle>
          <CardDescription className="text-slate-500">
            Ejerce tus derechos de Acceso, Rectificación, Cancelación u Oposición (Ley 1581 de 2012).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#1B2541] font-medium">Tu solicitud es sobre...</Label>
              <Select value={requestType} onValueChange={(v) => setValue('requestType', v)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecciona un tipo de solicitud" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REQUEST_TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1B2541] font-medium">Número de cédula</Label>
              <Input
                type="number"
                {...register('documentNumber', { required: true, minLength: 5 })}
                className="h-12"
              />
              {errors.documentNumber && <span className="text-xs text-red-500">Requerido</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-600">Correo (opcional)</Label>
                <Input type="email" {...register('contactEmail')} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Celular (opcional)</Label>
                <Input type="tel" {...register('contactPhone')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1B2541] font-medium">Cuéntanos qué necesitas</Label>
              <Textarea
                {...register('details', { required: true, minLength: 10 })}
                rows={4}
                placeholder="Ej: Quiero saber qué información tienen registrada sobre mí."
              />
              {errors.details && <span className="text-xs text-red-500">Cuéntanos con un poco más de detalle</span>}
            </div>

            <Button type="submit" className="w-full h-12 bg-[#1B2541] hover:bg-[#1B2541]/90 text-base font-bold" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar solicitud
            </Button>

            <p className="text-center text-xs text-slate-400">
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">
                Ver la política de tratamiento de datos
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
