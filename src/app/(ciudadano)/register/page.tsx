'use client';

import { useState } from "react";
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
  const [step, setStep] = useState<'SEARCH' | 'FORM' | 'SUCCESS'>('SEARCH');
  const [loading, setLoading] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [cedulaSearch, setCedulaSearch] = useState("");

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

  // PASO 1: BUSCAR CÉDULA
  const handleSearch = async () => {
    if (!cedulaSearch || cedulaSearch.length < 5) {
      toast.error("Ingresa un número de documento válido");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/prospects/check/${cedulaSearch}`);
      
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
      }
    } catch (error) {
      // NO EXISTE
      setIsUpdate(false);
      form.setValue("id", cedulaSearch);
    } finally {
      setLoading(false);
      setStep('FORM');
    }
  };

  // PASO 2: ENVIAR DATOS
  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/prospects/public`, data);
      setStep('SUCCESS');
    } catch (error) {
      toast.error("Error al guardar información", {
        description: "Inténtalo nuevamente más tarde."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* HEADER VISUAL */}
      <div className="mb-8 text-center">
         <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1B2541] text-[#FFC400] shadow-md mb-3">
            <ShieldCheck size={24} />
         </div>
         <h1 className="text-2xl font-bold text-[#1B2541] uppercase tracking-wide">Campaña 2025</h1>
      </div>

      {/* --- VISTA 1: BÚSQUEDA --- */}
      {step === 'SEARCH' && (
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-[#FFC400]">
          <CardHeader className="text-center space-y-4 pb-2">
            <CardTitle className="text-2xl font-bold text-[#1B2541]">Registro Ciudadano</CardTitle>
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
                    className="pl-10 text-lg h-12 border-slate-300 focus:border-[#1B2541] focus:ring-[#1B2541]/20"
                    type="number"
                    value={cedulaSearch}
                    onChange={(e) => setCedulaSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
              </div>
              <Button 
                size="lg" 
                className="h-12 bg-[#1B2541] hover:bg-[#1B2541]/90 text-white font-bold transition-all" 
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
        <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-[#FFC400] animate-in fade-in slide-in-from-bottom-6 duration-500">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-[#1B2541]">
                    {isUpdate ? "Actualiza tus Datos" : "Formulario de Registro"}
                </CardTitle>
                <CardDescription className="text-slate-500 mt-1">
                  {isUpdate 
                    ? "Mantén tu información al día." 
                    : "Completa el formulario para unirte al equipo."}
                </CardDescription>
              </div>
              <div className="bg-[#1B2541]/10 p-3 rounded-full">
                {isUpdate 
                    ? <UserCheck className="text-[#1B2541]" size={28} /> 
                    : <UserPlus className="text-[#1B2541]" size={28} />
                }
              </div>
            </div>
          </CardHeader>
          
          <Separator className="mb-6 opacity-50" />

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1B2541] font-medium">Nombres</Label>
                  <Input {...form.register("firstName")} className="focus:border-[#1B2541] focus:ring-[#1B2541]/20" />
                  {form.formState.errors.firstName && <span className="text-xs text-red-500 font-medium">Requerido</span>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1B2541] font-medium">Apellidos</Label>
                  <Input {...form.register("lastName")} className="focus:border-[#1B2541] focus:ring-[#1B2541]/20" />
                  {form.formState.errors.lastName && <span className="text-xs text-red-500 font-medium">Requerido</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1B2541] font-medium">Cédula</Label>
                <Input {...form.register("id")} disabled={true} className="bg-slate-100 font-mono text-slate-500" />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1B2541] font-medium">Celular (WhatsApp)</Label>
                <Input type="number" {...form.register("phone")} className="focus:border-[#1B2541] focus:ring-[#1B2541]/20" />
                {form.formState.errors.phone && <span className="text-xs text-red-500 font-medium">Mínimo 10 dígitos</span>}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">Correo Electrónico (Opcional)</Label>
                <Input type="email" {...form.register("email")} className="focus:border-[#1B2541] focus:ring-[#1B2541]/20" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">Puesto de Votación</Label>
                <Input {...form.register("votingStation")} placeholder="Ej: Escuela Santa María" className="focus:border-[#1B2541] focus:ring-[#1B2541]/20" />
              </div>

              <div className="pt-4 space-y-3">
                <Button type="submit" className="w-full bg-[#1B2541] hover:bg-[#1B2541]/90 h-12 text-base font-bold shadow-md" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUpdate ? "Guardar Cambios" : "Completar Registro"}
                </Button>
                
                <Button variant="ghost" className="w-full text-slate-500 hover:text-[#1B2541]" onClick={() => setStep('SEARCH')}>
                    Volver / Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* --- VISTA 3: ÉXITO --- */}
      {step === 'SUCCESS' && (
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-[#FFC400] text-center animate-in zoom-in-95 duration-500">
          <CardContent className="pt-12 pb-12">
            <div className="mx-auto bg-[#1B2541] w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ring-4 ring-[#FFC400]/20">
              <CheckCircle2 size={48} className="text-[#FFC400]" />
            </div>
            <h2 className="text-3xl font-extrabold text-[#1B2541] mb-3">¡Registro Exitoso!</h2>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto text-lg">
              Tus datos han sido guardados correctamente en nuestro sistema.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" className="border-[#1B2541] text-[#1B2541] hover:bg-[#1B2541]/5 font-semibold">
              Volver al inicio
            </Button>
          </CardContent>
          <CardFooter className="bg-slate-50 py-4 justify-center">
            <p className="text-xs text-slate-400 font-medium">Gestión Transparente - Campaña 2025</p>
          </CardFooter>
        </Card>
      )}

    </div>
  );
}