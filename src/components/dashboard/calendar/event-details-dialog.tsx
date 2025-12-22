'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  CalendarIcon, MapPin, Type, AlignLeft, Loader2, 
  Save, Trash2, Clock, Pencil, X, ImageIcon 
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { CalendarEvent } from "@/types/calendar";

// --- SCHEMA ---
const eventSchema = z.object({
  title: z.string().min(3, "Título requerido"),
  type: z.enum(["PRESENTIAL", "VIRTUAL", "HYBRID"]).optional(),
  description: z.string().optional(),
  start: z.string().min(1, "Inicio requerido"),
  end: z.string().min(1, "Fin requerido"),
  location: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
}).refine((data) => new Date(data.end) >= new Date(data.start), {
  message: "La fecha final debe ser posterior a la inicial",
  path: ["end"],
});

interface EventDetailsDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EventDetailsDialog({ event, open, onOpenChange, onSuccess }: EventDetailsDialogProps) {
  const { user } = useAuthStore();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Permisos
  const userRole = typeof user?.role === 'object' ? user?.role?.code : user?.role;
  const canEditPermission = ['SUPER_ADMIN', 'ADMIN', 'SECRETARY'].includes(userRole || '');

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      type: "PRESENTIAL",
      description: "",
      start: "",
      end: "",
      location: "",
      imageUrl: "",
    }
  });

  // Efecto Cargar Datos
  useEffect(() => {
    if (event && open) {
      setIsEditing(false);
      
      const formatForInput = (date: Date) => {
        try { return format(new Date(date), "yyyy-MM-dd'T'HH:mm"); } catch (e) { return ""; }
      };

      form.reset({
        title: event.title || "",
        type: (event.type as any) || "PRESENTIAL",
        description: event.description || "",
        start: event.start ? formatForInput(event.start) : "",
        end: event.end ? formatForInput(event.end) : "",
        location: event.location || "",
        imageUrl: event.imageUrl || "",
      });
    }
  }, [event, open, form]);

  // Upload Imagen
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
      toast.success("Imagen cargada.");
    } catch (error) {
      toast.error("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  // Submit
  const onSubmit = async (data: any) => {
    if (!event?.id) return;
    setLoading(true);
    try {
      const payload = {
        name: data.title,
        type: data.type,
        description: data.description,
        startDate: new Date(data.start).toISOString(),
        endDate: new Date(data.end).toISOString(),
        location: data.location,
        imageUrl: data.imageUrl,
      };

      await api.patch(`/events/${event.id}`, payload);
      toast.success("Evento actualizado");
      setIsEditing(false);
      onSuccess();
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!event?.id) return;
    if (!confirm("¿Estás seguro? Se eliminará permanentemente.")) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/events/${event.id}`);
      toast.success("Evento eliminado");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Error al eliminar");
    } finally {
      setIsDeleting(false);
    }
  };

  const currentImage = form.watch('imageUrl');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="text-2xl font-bold text-[#1B2541] flex items-center gap-2">
             <CalendarIcon className="h-6 w-6 text-[#FFC400]" />
             {isEditing ? "Editando Evento" : "Detalles del Evento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
            
            {/* --- CORRECCIÓN AQUÍ: CONTENEDOR DE IMAGEN --- */}
            {/* Usamos 'relative' en el padre y 'absolute' en la imagen para forzar el tamaño */}
            <div className="relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group shadow-inner">
                {currentImage ? (
                    <img 
                      src={currentImage} 
                      alt="Banner" 
                      className="absolute inset-0 w-full h-full object-cover" 
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                        <span className="text-xs font-medium">Sin imagen de portada</span>
                    </div>
                )}
                
                {/* Overlay para editar */}
                {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                        <label className="cursor-pointer bg-white text-slate-800 px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors shadow-lg transform hover:scale-105 flex items-center gap-2">
                            {uploading ? <Loader2 className="animate-spin h-3 w-3"/> : <Pencil className="h-3 w-3"/>}
                            {uploading ? "Subiendo..." : "Cambiar Imagen"}
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                        </label>
                    </div>
                )}
            </div>
            {/* ------------------------------------------- */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="font-bold text-slate-700 flex items-center gap-2"><Type className="h-4 w-4"/> Título</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} className="font-bold text-lg bg-white" />
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
                      <FormLabel className="font-bold text-slate-700">Modalidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!isEditing}>
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
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700 flex items-center gap-2"><MapPin className="h-4 w-4"/> Ubicación</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} placeholder="Dirección..." />
                      </FormControl>
                    </FormItem>
                  )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Clock className="h-3 w-3"/> Inicio</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={!isEditing} className="h-9 text-xs font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Clock className="h-3 w-3"/> Fin</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={!isEditing} className="h-9 text-xs font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-slate-700 flex items-center gap-2"><AlignLeft className="h-4 w-4"/> Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                        {...field} 
                        disabled={!isEditing} 
                        className="resize-none min-h-[100px]" 
                        placeholder="Detalles del evento..."
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-between w-full border-t mt-4 gap-3 sm:gap-0">
                {!isEditing && canEditPermission ? (
                   <Button type="button" variant="ghost" onClick={handleDelete} disabled={isDeleting} className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto justify-start">
                     {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />} Eliminar
                   </Button>
                ) : <div />}

                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <Button type="button" variant="outline" onClick={() => isEditing ? (setIsEditing(false), form.reset()) : onOpenChange(false)}>
                      {isEditing ? "Cancelar" : "Cerrar"}
                    </Button>
                    
                    {canEditPermission && (
                        <>
                            {!isEditing ? (
                                <Button type="button" onClick={() => setIsEditing(true)} className="bg-[#1B2541] hover:bg-[#1B2541]/90 text-white">
                                    <Pencil className="mr-2 h-4 w-4" /> Editar Evento
                                </Button>
                            ) : (
                                <Button type="submit" className="bg-[#FFC400] hover:bg-[#FFC400]/90 text-[#1B2541] font-bold" disabled={loading || uploading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar Cambios
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}