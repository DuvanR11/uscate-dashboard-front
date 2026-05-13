'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowLeft, Loader2, Scale } from 'lucide-react';
import Link from 'next/link';
import { apiPost } from '@/lib/apis';

export default function CrearPeticionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    petitioner: '',
    petitionType: 'GENERAL',
    originalText: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Creamos el registro en blanco (Borrador)
      const res = await apiPost('/petitions', formData) as any;
      // Redirigimos al Workspace de la IA con el ID creado
      router.push(`/peticiones/${res.id}`);
    } catch (error) {
      console.error('Error al crear:', error);
      alert('Hubo un error al crear la petición.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/peticiones" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1B2541]">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1B2541]">Nueva Petición</h1>
          <p className="text-sm text-slate-500">Ingresa los datos iniciales para generar el borrador.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Peticionario */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nombre del Peticionario</label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-[#1B2541] focus:outline-none focus:ring-1 focus:ring-[#1B2541]"
                placeholder="Ej. Juan Pérez"
                value={formData.petitioner}
                onChange={(e) => setFormData({ ...formData, petitioner: e.target.value })}
              />
            </div>

            {/* Tipo de Petición */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de Petición</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-[#1B2541] focus:outline-none focus:ring-1 focus:ring-[#1B2541]"
                value={formData.petitionType}
                onChange={(e) => setFormData({ ...formData, petitionType: e.target.value })}
              >
                <option value="INFORMACION">Información (10 días)</option>
                <option value="GENERAL">General (15 días)</option>
                <option value="CONSULTA">Consulta (30 días)</option>
              </select>
            </div>
          </div>

          {/* Apuntes */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Scale size={16} className="text-[#1B2541]" />
              Resumen de los hechos (Tus apuntes)
            </label>
            <p className="mb-3 text-xs text-slate-500">
              Escribe en tus propias palabras qué necesita el ciudadano. La Inteligencia Artificial se encargará de redactarlo con el lenguaje jurídico adecuado y la normatividad vigente.
            </p>
            <textarea
              required
              rows={6}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-[#1B2541] focus:outline-none focus:ring-1 focus:ring-[#1B2541]"
              placeholder="Ej: El ciudadano necesita saber por qué la alcaldía no ha arreglado la calle 10 con 15. Dijo que hay un hueco hace 6 meses y ya ha causado 3 accidentes..."
              value={formData.originalText}
              onChange={(e) => setFormData({ ...formData, originalText: e.target.value })}
            />
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[#1B2541] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-900 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
              {loading ? 'Creando...' : 'Crear y Continuar al Editor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}