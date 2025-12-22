'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Type, Loader2, Save, Link as LinkIcon, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

// --- 1. ESQUEMA COINCIDENTE CON EL BACKEND (DTO) ---
// --- 1. ESQUEMA COINCIDENTE CON EL BACKEND (DTO) ---
const eventSchema = z.object({
  name: z.string().min(3, "El nombre es requerido"),
  // CORRECCIÓN AQUÍ: Quitamos el objeto { required_error: ... } que causaba el error
  type: z.enum(["PRESENTIAL", "VIRTUAL", "HYBRID"]), 
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
  imageUrl: z.string().optional().or(z.literal("")),
}).refine((data) => {
    if (!data.endDate || !data.startDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: "La fecha final debe ser posterior a la inicial",
  path: ["endDate"],
});

type EventFormValues = z.infer<typeof eventSchema>;

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateEventDialog({ open, onOpenChange, onSuccess }: CreateEventDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      type: "PRESENTIAL", // Valor por defecto seguro
      startDate: "",
      endDate: "",
      imageUrl: "",
    }
  });

  const onSubmit = async (data: EventFormValues) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        type: data.type,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        imageUrl: data.imageUrl || undefined,
      };

      // 3. CAPTURAR LA RESPUESTA
      const res = await api.post('/events', payload);
      
      toast.success("Evento creado exitosamente");
      form.reset();
      onOpenChange(false);
      
      // 4. LÓGICA DE REDIRECCIÓN
      // Asumimos que el backend devuelve el objeto creado en res.data
      if (res.data && res.data.id) {
          router.push(`/events/${res.data.id}`);
      } else {
          // Fallback por si acaso: refrescar calendario
          onSuccess();
      }

    } catch (error) {
      console.error(error);
      toast.error("Error al crear el evento");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Subir a DigitalOcean a través de tu API
      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // 2. Setear la URL en el formulario
      form.setValue('imageUrl', res.data.url);
      toast.success("Imagen cargada correctamente");
    } catch (error) {
      toast.error("Error subiendo la imagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="text-2xl font-bold text-[#1B2541] flex items-center gap-2">
             <CalendarIcon className="h-6 w-6 text-[#1B2541]" />
             Nuevo Evento de Campaña
          </DialogTitle>
          <DialogDescription>
            Configura los detalles del evento para la agenda del equipo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
            
            {/* Nombre del Evento */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-slate-700 flex items-center gap-2">
                    <Type className="h-4 w-4 text-slate-500" /> Nombre del Evento
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Reunión Líderes Comuna 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Evento (Enum) */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" /> Modalidad
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona modalidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PRESENTIAL">Presencial</SelectItem>
                      <SelectItem value="VIRTUAL">Virtual</SelectItem>
                      <SelectItem value="HYBRID">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-slate-700">Inicio</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="font-mono text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-slate-700">Cierre</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="font-mono text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* URL Imagen (Opcional) */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banner del Evento</FormLabel>
                  <div className="flex gap-2 items-center">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      disabled={uploading}
                    />
                    {/* Input oculto para guardar la URL */}
                    <input type="hidden" {...field} />
                  </div>
                  {field.value && (
                    <p className="text-xs text-green-600 mt-1">Imagen cargada: ...{field.value.slice(-20)}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#1B2541] hover:bg-[#1B2541]/90 min-w-[140px]" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Crear Evento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}