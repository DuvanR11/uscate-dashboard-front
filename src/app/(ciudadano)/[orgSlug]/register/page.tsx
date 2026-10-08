'use client';

import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, UserCheck, UserPlus, CheckCircle2, Search, ShieldCheck, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

// --- ESQUEMA DE VALIDACIÓN ---
const registerSchema = z.object({
  id: z.string().min(5, "Documento inválido"), // Cédula
  firstName: z.string().min(2, "Nombre requerido"),
  lastName: z.string().min(2, "Apellido requerido"),
  phone: z.string().min(10, "Celular de 10 dígitos"),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  votingStation: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function PublicRegisterPage() {
  // Deuda multi-tenant (Fase M4, ver memoria `deuda-multitenant-crm`):
  // el slug de la organización viene de la propia URL
  // (/[orgSlug]/register) — ya no hay ningún registro "pelado" sin
  // organización. Un slug inválido o inexistente da 404 real desde el
  // backend, no un default silencioso.
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const [step, setStep] = useState<'SEARCH' | 'FORM' | 'SUCCESS'>('SEARCH');
  const [loading, setLoading] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [cedulaSearch, setCedulaSearch] = useState("");
  // Centro de cumplimiento Habeas Data (2026-09-08) — hallazgo real: esta
  // pantalla (la ruta pública PRINCIPAL de auto-registro) no tenía NINGÚN
  // checkbox de consentimiento — `dataTreatment` nunca se enviaba, quedaba
  // en `false` por el default del backend, en silencio. Requerido para un
  // registro NUEVO; opcional (nunca bloquea) al solo actualizar datos.
  const [dataTreatmentAccepted, setDataTreatmentAccepted] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      id: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      votingStation: ""
    }
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const orgBasePath = `${API_URL}/public/organizations/${orgSlug}`;

  // PASO 1: BUSCAR CÉDULA
  const handleSearch = async () => {
    if (!cedulaSearch || cedulaSearch.length < 5) {
      toast.error("Ingresa un número de documento válido");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${orgBasePath}/prospects/check/${cedulaSearch}`);

      if (response.data.data) {
        // EXISTE
        setIsUpdate(true);
        form.reset({
            id: response.data.data.id,
            firstName: response.data.data.firstName,
            lastName: response.data.data.lastName,
            phone: response.data.data.phone,
            email: response.data.data.email || "",
            votingStation: response.data.data.votingStation || "",
        });
        toast.info(`Bienvenido de nuevo, ${response.data.data.firstName}`);
      } else {
        // La consulta responde 200 con `data: null` cuando la cédula todavía
        // no existe. Antes solo se guardaba la cédula si la consulta FALLABA,
        // así que a una persona nueva el campo le quedaba vacío y el botón de
        // enviar no hacía nada, sin ningún aviso (validación en pantalla,
        // 2026-10-07).
        setIsUpdate(false);
        form.setValue("id", cedulaSearch);
      }
    } catch {
      // No se pudo consultar: se sigue como persona nueva.
      setIsUpdate(false);
      form.setValue("id", cedulaSearch);
    } finally {
      setLoading(false);
      setStep('FORM');
    }
  };

  // PASO 2: ENVIAR DATOS
  const onSubmit = async (data: RegisterFormValues) => {
    if (!isUpdate && !dataTreatmentAccepted) {
      toast.error('Debes aceptar el tratamiento de datos para completar el registro.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${orgBasePath}/prospects/register`, {
        ...data,
        dataTreatment: dataTreatmentAccepted,
      });
      setStep('SUCCESS');
    } catch (error) {
      // Hallazgo real de QA (2026-09-19): este catch mostraba SIEMPRE el
      // mismo mensaje genérico, sin importar la causa real (catálogo de
      // canal/ocupación faltante, consentimiento no marcado, DTO
      // inválido...) — el 400 con el motivo real quedaba invisible tanto
      // para el ciudadano como para QA reportando el bug. Ahora se muestra
      // el mensaje real del backend cuando existe.
      const backendMessage = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(backendMessage || "Error al guardar información", {
        description: backendMessage ? undefined : "Inténtalo nuevamente más tarde."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">

      {/* HEADER VISUAL */}
      <div className="mb-8 text-center">
         <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ink text-secondary shadow-md mb-3">
            <ShieldCheck size={24} />
         </div>
         <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide">Bienvenido</h1>
      </div>

      {/* --- VISTA 1: BÚSQUEDA --- */}
      {step === 'SEARCH' && (
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
          <CardHeader className="text-center space-y-4 pb-2">
            <CardTitle className="text-2xl font-bold text-foreground">Registro Ciudadano</CardTitle>
            <CardDescription className="text-slate-500">
              Verifica si ya estás en nuestra base de datos o regístrate para apoyar la campaña.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    placeholder="Ingresa tu número de Cédula"
                    className="pl-10 text-lg h-12 border-slate-300 focus:border-primary focus:ring-primary/20"
                    type="number"
                    value={cedulaSearch}
                    onChange={(e) => setCedulaSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
              </div>
              <Button
                size="lg"
                className="h-12 bg-primary hover:bg-primary/90 text-white font-bold transition-all"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                    <>Continuar <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t bg-slate-50 py-4">
             <p className="text-xs text-slate-400">Tus datos están protegidos por nuestra política de privacidad.</p>
          </CardFooter>
        </Card>
      )}

      {/* --- VISTA 2: FORMULARIO --- */}
      {step === 'FORM' && (
        <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-6 duration-500">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-foreground">
                    {isUpdate ? "Actualiza tus Datos" : "Formulario de Registro"}
                </CardTitle>
                <CardDescription className="text-slate-500 mt-1">
                  {isUpdate
                    ? "Mantén tu información al día."
                    : "Completa el formulario para unirte al equipo."}
                </CardDescription>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                {isUpdate
                    ? <UserCheck className="text-foreground" size={28} />
                    : <UserPlus className="text-foreground" size={28} />
                }
              </div>
            </div>
          </CardHeader>

          <Separator className="mb-6 opacity-50" />

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Nombres</Label>
                  <Input {...form.register("firstName")} className="focus:border-primary focus:ring-primary/20" />
                  {form.formState.errors.firstName && <span className="text-xs text-red-500 font-medium">Requerido</span>}
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Apellidos</Label>
                  <Input {...form.register("lastName")} className="focus:border-primary focus:ring-primary/20" />
                  {form.formState.errors.lastName && <span className="text-xs text-red-500 font-medium">Requerido</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-medium">Cédula</Label>
                <Input {...form.register("id")} disabled={true} className="bg-slate-100 font-mono text-slate-500" />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-medium">Celular (WhatsApp)</Label>
                <Input type="number" {...form.register("phone")} className="focus:border-primary focus:ring-primary/20" />
                {form.formState.errors.phone && <span className="text-xs text-red-500 font-medium">Mínimo 10 dígitos</span>}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">Correo Electrónico (Opcional)</Label>
                <Input type="email" {...form.register("email")} className="focus:border-primary focus:ring-primary/20" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">Puesto de Votación</Label>
                <Input {...form.register("votingStation")} placeholder="Ej: Escuela Santa María" className="focus:border-primary focus:ring-primary/20" />
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Checkbox
                  id="dataTreatment"
                  checked={dataTreatmentAccepted}
                  onCheckedChange={(checked) => setDataTreatmentAccepted(checked === true)}
                  className="mt-0.5"
                />
                {/* `block`: la etiqueta trae `flex` y en celular partía el texto en columnas. */}
                <Label htmlFor="dataTreatment" className="block text-xs text-slate-500 leading-snug font-normal cursor-pointer">
                  Autorizo el{' '}
                  <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    tratamiento de mis datos personales
                  </a>
                  {' '}conforme a la Ley 1581 de 2012.
                </Label>
              </div>

              <div className="pt-4 space-y-3">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-bold shadow-md" disabled={loading || (!isUpdate && !dataTreatmentAccepted)}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUpdate ? "Guardar Cambios" : "Completar Registro"}
                </Button>

                <Button variant="ghost" className="w-full text-slate-500 hover:text-primary" onClick={() => setStep('SEARCH')}>
                    Volver / Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* --- VISTA 3: ÉXITO --- */}
      {step === 'SUCCESS' && (
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary text-center animate-in zoom-in-95 duration-500">
          <CardContent className="pt-12 pb-12">
            <div className="mx-auto bg-ink w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ring-4 ring-secondary/20">
              <CheckCircle2 size={48} className="text-secondary" />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-3">¡Registro Exitoso!</h2>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto text-lg">
              Tus datos han sido guardados correctamente en nuestro sistema.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" className="border-primary text-foreground hover:bg-primary/5 font-semibold">
              Volver al inicio
            </Button>
          </CardContent>
          <CardFooter className="bg-slate-50 py-4 justify-center">
            <p className="text-xs text-slate-400 font-medium">Gestión transparente</p>
          </CardFooter>
        </Card>
      )}

    </div>
  );
}
