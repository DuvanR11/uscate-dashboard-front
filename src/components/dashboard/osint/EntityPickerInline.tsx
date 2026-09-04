'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  resolveSubject,
  resolveAttribute,
  searchEntities,
  extractErrorMessage,
  ENTITY_IDENTITY_TYPES,
  ENTITY_ATTRIBUTE_TYPES,
  ENTITY_TYPE_LABELS,
  isExpandableEntityType,
  type EntitySubjectType,
  type EntityAttributeType,
  type EntityType,
  type Entity,
} from '@/lib/api/osint';
import ExpandEntityDialog from '@/components/dashboard/osint/ExpandEntityDialog';
import { Sparkles } from 'lucide-react';

export type PickedEntity = { id: string; canonicalName: string; type: EntityType };

type Props = {
  label: string;
  value: PickedEntity | null;
  onChange: (entity: PickedEntity | null) => void;
  /** Entidades ya conocidas por el caso — atajo para no tener que resolver de nuevo una que ya se usó. */
  knownEntities?: PickedEntity[];
  /**
   * Plan "Pilar OSINT", Fase C2 (cerrada 2026-09-02) — si se pasa, ofrece un
   * botón "Ampliar" compacto justo al lado de la entidad ya resuelta (mismo
   * mecanismo que ya existía en la pestaña de Relaciones, un segundo punto
   * de entrada real). Opcional a propósito: cada evidencia/vínculo que
   * "Ampliar" crea queda contra un Caso — un futuro uso de este picker sin
   * Caso en contexto simplemente no ofrece el botón.
   */
  caseId?: string;
};

/**
 * Selector inline de una `Entity`: no existe un `GET /osint/entities` de
 * búsqueda libre, así que "elegir una entidad" siempre pasa por resolverla.
 * 2 categorías con caminos reales distintos (Plan "OSINT Profesional",
 * Fase 1):
 *   - IDENTIDAD (Persona/Empresa/Entidad pública) → `POST /osint/entities/resolve`
 *     (motor probabilístico de la Fase 3/7 — documento/nombre/embeddings).
 *     Nunca fusiona automáticamente: si solo sugiere candidatos, igual crea
 *     la Entity nueva y deja el candidato en la cola de revisión de
 *     `/osint/entidades` para un analista.
 *   - ATRIBUTO (dominio/email/teléfono/dirección/vehículo/cuenta bancaria/
 *     perfil social/alias) → `POST /osint/entities/attributes` (dedupe
 *     determinista, sin candidatos — no hay ambigüedad que revisar).
 */
export default function EntityPickerInline({ label, value, onChange, knownEntities = [], caseId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  // Plan "OSINT Profesional" (2026-09-02), Fase 1 — la categoría decide
  // qué formulario y qué endpoint se usa (ver docstring del componente).
  const [category, setCategory] = useState<'IDENTITY' | 'ATTRIBUTE'>('IDENTITY');
  const [form, setForm] = useState({
    type: 'PERSON' as EntitySubjectType,
    name: '',
    documentNumber: '',
  });
  const [attributeForm, setAttributeForm] = useState({
    type: 'DOMAIN' as EntityAttributeType,
    value: '',
  });

  // Plan "OSINT Profesional" (2026-09-02), Fase 6 — buscador libre de
  // entidades ya resueltas: nunca pasa por el motor de identidad, solo
  // busca lo que ya existe en la organización (no solo lo ya conocido por
  // este caso, a diferencia de `knownEntities`).
  const [freeSearchTerm, setFreeSearchTerm] = useState('');
  const [freeSearchResults, setFreeSearchResults] = useState<Entity[]>([]);
  const [searchingFree, setSearchingFree] = useState(false);

  useEffect(() => {
    const term = freeSearchTerm.trim();
    if (term.length < 2) {
      setFreeSearchResults([]);
      return;
    }

    setSearchingFree(true);
    const timeout = setTimeout(() => {
      searchEntities(term)
        .then(setFreeSearchResults)
        .catch(() => setFreeSearchResults([]))
        .finally(() => setSearchingFree(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [freeSearchTerm]);

  const handleResolveIdentity = async () => {
    if (form.name.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres.');
      return;
    }

    setResolving(true);
    try {
      const result = await resolveSubject({
        type: form.type,
        name: form.name.trim(),
        documentNumber: form.documentNumber.trim() || undefined,
      });

      onChange({ id: result.entity.id, canonicalName: result.entity.canonicalName, type: result.entity.type });

      if (result.created) {
        toast.success(`Entidad nueva creada: ${result.entity.canonicalName}`);
      } else {
        toast.success(`Entidad existente encontrada: ${result.entity.canonicalName}`);
      }

      if (result.candidates.length > 0) {
        toast.message(
          `${result.candidates.length} candidato(s) de coincidencia quedaron en la cola de revisión (Resolución de entidades).`,
        );
      }

      setExpanded(false);
      setForm({ type: 'PERSON', name: '', documentNumber: '' });
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo resolver la entidad');
    } finally {
      setResolving(false);
    }
  };

  const handleResolveAttribute = async () => {
    if (attributeForm.value.trim().length < 2) {
      toast.error('El valor debe tener al menos 2 caracteres.');
      return;
    }

    setResolving(true);
    try {
      const result = await resolveAttribute({
        type: attributeForm.type,
        value: attributeForm.value.trim(),
      });

      onChange({ id: result.entity.id, canonicalName: result.entity.canonicalName, type: result.entity.type });
      toast.success(
        result.created
          ? `Entidad nueva creada: ${result.entity.canonicalName}`
          : `Entidad existente encontrada: ${result.entity.canonicalName}`,
      );

      setExpanded(false);
      setAttributeForm({ type: 'DOMAIN', value: '' });
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo resolver la entidad');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>

      {value ? (
        <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <span className="text-sm font-bold text-primary truncate">{value.canonicalName}</span>
          <div className="flex items-center gap-1 shrink-0">
            {caseId && isExpandableEntityType(value.type) && (
              <ExpandEntityDialog
                caseId={caseId}
                entityId={value.id}
                entityName={value.canonicalName}
                onExpanded={() => {}}
                trigger={
                  <button
                    type="button"
                    title="Ampliar esta entidad contra las fuentes reales (agrega evidencia + propone vínculos)"
                    className="text-slate-400 hover:text-primary"
                  >
                    <Sparkles size={14} />
                  </button>
                }
              />
            )}
            <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : !expanded ? (
        <div className="space-y-1.5">
          {knownEntities.length > 0 && (
            <Select onValueChange={(id) => {
              const e = knownEntities.find((k) => k.id === id);
              if (e) onChange(e);
            }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Elegir una entidad ya conocida del caso..." /></SelectTrigger>
              <SelectContent>
                {knownEntities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.canonicalName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={freeSearchTerm}
              onChange={(e) => setFreeSearchTerm(e.target.value)}
              placeholder="Buscar cualquier entidad ya resuelta de la organización..."
              className="pl-7 h-9 text-sm"
            />
            {searchingFree && <Loader2 size={13} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
          </div>
          {freeSearchResults.length > 0 && (
            <div className="border border-slate-200 rounded-lg divide-y max-h-[180px] overflow-y-auto">
              {freeSearchResults.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    onChange({ id: e.id, canonicalName: e.canonicalName, type: e.type });
                    setFreeSearchTerm('');
                    setFreeSearchResults([]);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{e.canonicalName}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{ENTITY_TYPE_LABELS[e.type] || e.type}</span>
                </button>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)} className="gap-1.5">
            <Search size={14} /> Crear entidad nueva
          </Button>
        </div>
      ) : (
        <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
            <button
              type="button"
              onClick={() => setCategory('IDENTITY')}
              className={`flex-1 px-2 py-1.5 ${category === 'IDENTITY' ? 'bg-primary text-white' : 'bg-white text-slate-500'}`}
            >
              Persona / Empresa / Entidad pública
            </button>
            <button
              type="button"
              onClick={() => setCategory('ATTRIBUTE')}
              className={`flex-1 px-2 py-1.5 ${category === 'ATTRIBUTE' ? 'bg-primary text-white' : 'bg-white text-slate-500'}`}
            >
              Atributo (dominio, email, teléfono...)
            </button>
          </div>

          {category === 'IDENTITY' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as EntitySubjectType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_IDENTITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Documento (opcional)"
                  value={form.documentNumber}
                  onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
                />
              </div>
              <Input
                placeholder="Nombre completo o razón social"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>Cancelar</Button>
                <Button type="button" size="sm" onClick={handleResolveIdentity} disabled={resolving}>
                  {resolving ? <Loader2 size={14} className="animate-spin" /> : 'Resolver'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Select
                value={attributeForm.type}
                onValueChange={(v) => setAttributeForm((f) => ({ ...f, type: v as EntityAttributeType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_ATTRIBUTE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Valor (ej. empresa.com, +57 300 1234567, Cra 7 # 32-16...)"
                value={attributeForm.value}
                onChange={(e) => setAttributeForm((f) => ({ ...f, value: e.target.value }))}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>Cancelar</Button>
                <Button type="button" size="sm" onClick={handleResolveAttribute} disabled={resolving}>
                  {resolving ? <Loader2 size={14} className="animate-spin" /> : 'Resolver'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
