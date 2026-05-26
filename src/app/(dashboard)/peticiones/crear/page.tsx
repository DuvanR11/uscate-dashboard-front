'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Scale,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { apiPost } from '@/lib/apis';

const petitionTypes = [
  {
    value: 'INFORMACION',
    title: 'Información',
    days: '10 días',
    description: 'Para solicitar documentos, datos, copias o información pública.',
  },
  {
    value: 'GENERAL',
    title: 'General',
    days: '15 días',
    description: 'Para quejas, solicitudes, reclamos o peticiones de interés particular.',
  },
  {
    value: 'CONSULTA',
    title: 'Consulta',
    days: '30 días',
    description: 'Para solicitar conceptos jurídicos o interpretaciones administrativas.',
  },
];

const examples = [
  `Entidad: Alcaldía Municipal.

Hechos:
Desde hace aproximadamente seis meses la vía ubicada en la carrera 12 con calle 8 del barrio Las Palmas presenta varios huecos de gran tamaño. Esta situación ha ocasionado accidentes, daños en vehículos y dificultades para el tránsito de peatones.

Solicitud:
Solicito que se informe el estado actual de la intervención de la vía, el cronograma estimado de reparación, el presupuesto asignado y las medidas temporales que se adoptarán para evitar nuevos accidentes.`,

  `Entidad: Secretaría de Infraestructura.

Hechos:
La comunidad del barrio Villa Esperanza ha reportado retrasos en la obra de pavimentación iniciada en enero de 2026. Actualmente la obra se encuentra suspendida y no se ha informado una fecha clara de reinicio.

Solicitud:
Solicito información sobre las razones de la suspensión, el contratista responsable, el porcentaje de avance, la fecha estimada de reinicio y las acciones de seguimiento realizadas por la entidad.`,

  `Entidad: Empresa de Servicios Públicos.

Hechos:
En el sector se vienen presentando interrupciones constantes en el servicio de agua potable, especialmente en horas de la mañana y la noche. La comunidad no ha recibido información clara sobre las causas ni sobre las soluciones previstas.

Solicitud:
Solicito que se informe la causa de las interrupciones, el plan de contingencia, el cronograma de normalización del servicio y los canales oficiales para reportar nuevos casos.`,
];

type PetitionDirection = 'CREADA' | 'RESPUESTA';

export default function CrearPeticionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<{
    petitioner: string;
    petitionType: string;
    petitionDirection: PetitionDirection;
    originalText: string;
  }>({
    petitioner: '',
    petitionType: 'GENERAL',
    petitionDirection: 'CREADA',
    originalText: '',
  });

  const selectedType = useMemo(
    () => petitionTypes.find((item) => item.value === formData.petitionType),
    [formData.petitionType],
  );

  const canSubmit =
    formData.petitioner.trim().length >= 3 &&
    formData.originalText.trim().length >= 30 &&
    !loading;

  const normalizeText = (value: string) =>
    value
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setLoading(true);

    try {
      const payload = {
        ...formData,
        petitioner: formData.petitioner.trim(),
        petitionDirection: 'CREADA' as PetitionDirection,
        originalText: normalizeText(formData.originalText),
      };

      const res = (await apiPost('/petitions', payload)) as any;

      router.push(`/peticiones/${res.id}`);
    } catch (error) {
      console.error('Error al crear:', error);
      alert('Hubo un error al crear la petición.');
      setLoading(false);
    }
  };

  const applyExample = (text: string) => {
    setFormData((prev) => ({
      ...prev,
      originalText: text,
    }));
  };

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/peticiones"
          className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1B2541]"
        >
          <ArrowLeft size={20} />
        </Link>

        <div>
          <p className="mb-1 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
            <Sparkles size={14} />
            Asistente jurídico IA
          </p>

          <h1 className="text-3xl font-bold text-[#1B2541]">
            Crear derecho de petición
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Ingresa los datos base. Luego podrás editar, revisar, firmar y descargar el documento.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <form onSubmit={handleSubmit} className="space-y-7">
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#1B2541]">
                <FileText size={20} />
                Datos iniciales
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Nombre del peticionario
                  </label>

                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1B2541] focus:outline-none focus:ring-1 focus:ring-[#1B2541]"
                    placeholder="Ej. Juan Pérez"
                    value={formData.petitioner}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        petitioner: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tipo de petición
                  </label>

                  <select
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1B2541] focus:outline-none focus:ring-1 focus:ring-[#1B2541]"
                    value={formData.petitionType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        petitionType: e.target.value,
                      })
                    }
                  >
                    {petitionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.title} ({type.days})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedType && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  <div className="mb-1 flex items-center gap-2 font-bold">
                    <Info size={16} />
                    {selectedType.title} · término aproximado {selectedType.days}
                  </div>
                  <p>{selectedType.description}</p>
                </div>
              )}
            </section>

            <section>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Scale size={16} className="text-[#1B2541]" />
                Hechos y solicitud del ciudadano
              </label>

              <p className="mb-3 text-sm leading-6 text-slate-500">
                Escribe con saltos de línea. Se recomienda separar por entidad, hechos y solicitud para que el documento conserve mejor el formato.
              </p>

              <textarea
                required
                rows={12}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 focus:border-[#1B2541] focus:outline-none focus:ring-1 focus:ring-[#1B2541]"
                placeholder={`Entidad: Alcaldía Municipal

Hechos:
Describe qué ocurrió, fechas, lugar, antecedentes y afectaciones.

Solicitud:
Indica claramente qué información, actuación o solución se solicita.`}
                value={formData.originalText}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    originalText: e.target.value,
                  })
                }
              />

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>Mínimo recomendado: 30 caracteres</span>
                <span>{formData.originalText.length} caracteres</span>
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Se creará como derecho de petición, no como respuesta.
              </p>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B2541] px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                {loading ? 'Creando borrador...' : 'Crear y abrir editor'}
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1B2541]">
              Buenas prácticas
            </h3>

            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                Incluye entidad responsable.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                Describe hechos con fechas o lugares.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                Separa hechos y solicitudes.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1B2541]">
              Ejemplos rápidos
            </h3>

            <div className="space-y-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => applyExample(example)}
                  className="w-full whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}