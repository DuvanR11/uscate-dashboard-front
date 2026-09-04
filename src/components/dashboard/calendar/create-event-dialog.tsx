'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // <--- Importamos Textarea
import { 
  CalendarIcon, Type, Loader2, Save, Users, MapPin, ImageIcon, AlignLeft, Clock 
} from "lucide-react";
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

// --- 1. ESQUEMA ACTUALIZADO ---
const eventSchema = z.object({
  name: z.string().min(3, "El nombre es requerido"),
  type: z.enum(["PRESENTIAL", "VIRTUAL", "HYBRID"]), 
  description: z.string().optional(), // <--- Agregado
  location: z.string().optional(),    // <--- Agregado
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
      type: "PRESENTIAL",
      description: "",
      location: "",
      startDate: "",
      endDate: "",
      imageUrl: "",
    }
  });

  // Watch para previsualizar imagen
  const currentImage = form.watch('imageUrl');

  const onSubmit = async (data: EventFormValues) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        type: data.type,
        description: data.description, // <--- Enviamos descripción
        location: data.location,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        imageUrl: data.imageUrl || undefined,
      };

      const res = await api.post('/events', payload);
      
      toast.success("Evento creado exitosamente");
      form.reset();
      onOpenChange(false);
      
      if (res.data && res.data.id) {
          // Redirigir al detalle del evento creado
          router.push(`/events/${res.data.id}`);
      } else {
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
      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
             <CalendarIcon className="h-6 w-6 text-secondary" />
             Nuevo Evento
          </DialogTitle>
          <DialogDescription>
            Configura los detalles, fecha y descripción para la agenda.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
            
            {/* --- SECCIÓN IMAGEN (BANNER) --- */}
            <div className="relative w-full h-40 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group shadow-inner">
                {currentImage ? (
                    <img 
                      src={currentImage} 
                      alt="Banner" 
                      className="absolute inset-0 w-full h-full object-cover" 
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium">Subir portada del evento</span>
                    </div>
                )}
                
                {/* Botón Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                    <label className="cursor-pointer bg-white text-slate-800 px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors shadow-lg transform hover:scale-105 flex items-center gap-2">
                        {uploading ? <Loader2 className="animate-spin h-3 w-3"/> : <ImageIcon className="h-3 w-3"/>}
                        {uploading ? "Subiendo..." : "Seleccionar Imagen"}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                </div>
            </div>

            {/* --- NOMBRE Y TIPO --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="font-semibold text-slate-700 flex items-center gap-2">
                        <Type className="h-4 w-4 text-slate-500" /> Nombre del Evento
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Gran Asamblea Comunal" {...field} className="font-bold text-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                            <SelectValue placeholder="Selecciona" />
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

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-slate-700 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" /> Ubicación
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Dirección o Link" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            {/* --- FECHAS --- */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Clock className="h-3 w-3"/> Inicio
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="h-9 text-xs font-mono" />
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
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Clock className="h-3 w-3"/> Fin
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="h-9 text-xs font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* --- DESCRIPCIÓN --- */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-slate-700 flex items-center gap-2">
                    <AlignLeft className="h-4 w-4 text-slate-500" /> Descripción
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                        placeholder="Detalles del evento, agenda, requisitos..." 
                        className="resize-none min-h-[100px]"
                        {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 min-w-[140px]" disabled={loading}>
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