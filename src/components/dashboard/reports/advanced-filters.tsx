'use client';

// Mejora del Dashboard de Analítica (2026-09-04): expone al frontend el
// motor de filtros que ya existía en el backend (`ReportsService.getWhereInput()`)
// pero que ningún endpoint de reportes usaba — mismo criterio de catálogos
// que `prospect-form.tsx` (Departamento→Municipio en cascada, Canal,
// Segmento, Ocupación, Líder solo si es admin global).
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, X } from 'lucide-react';

export interface AdvancedFilterValues {
  departmentId?: string;
  municipalityId?: string;
  channelId?: string;
  segmentId?: string;
  occupationId?: string;
  leaderId?: string;
}

interface Option {
  id: number | string;
  name: string;
}

interface LeaderOption {
  id: string;
  fullName: string;
}

interface AdvancedFiltersProps {
  value: AdvancedFilterValues;
  onChange: (value: AdvancedFilterValues) => void;
}

const EMPTY: AdvancedFilterValues = {};

export function AdvancedFilters({ value, onChange }: AdvancedFiltersProps) {
  const isGlobalAdmin = usePermission('PROSPECTOS_GLOBAL', 'canRead');

  const [departments, setDepartments] = useState<Option[]>([]);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [channels, setChannels] = useState<Option[]>([]);
  const [segments, setSegments] = useState<Option[]>([]);
  const [occupations, setOccupations] = useState<Option[]>([]);
  const [leaders, setLeaders] = useState<LeaderOption[]>([]);

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const promises = [
          api.get('/locations/departments'),
          api.get('/catalogs/channels'),
          api.get('/catalogs/segments'),
          api.get('/catalogs/occupations'),
        ];
        if (isGlobalAdmin) promises.push(api.get('/users?roles=LEADER'));

        const results = await Promise.all(promises);
        setDepartments(results[0].data || []);
        setChannels(results[1].data || []);
        setSegments(results[2].data || []);
        setOccupations(results[3].data || []);
        if (isGlobalAdmin && results[4]) {
          setLeaders(results[4].data?.data || results[4].data || []);
        }
      } catch (error) {
        console.error('Error cargando catálogos de filtros', error);
      }
    };
    loadCatalogs();
  }, [isGlobalAdmin]);

  // Cascada Departamento → Municipio, mismo patrón de prospect-form.tsx.
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (!value.departmentId) {
        setMunicipalities([]);
        return;
      }
      try {
        const res = await api.get(`/locations/municipalities/${value.departmentId}`);
        setMunicipalities(res.data || []);
      } catch {
        setMunicipalities([]);
      }
    };
    loadMunicipalities();
  }, [value.departmentId]);

  const activeCount = Object.values(value).filter(Boolean).length;

  const set = (key: keyof AdvancedFilterValues, v: string) => {
    const next = { ...value, [key]: v === 'all' ? undefined : v };
    if (key === 'departmentId') next.municipalityId = undefined; // reset cascada
    onChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bg-white border-slate-300 shadow-sm relative"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" />
          Filtros avanzados
          {activeCount > 0 && (
            <Badge className="ml-2 bg-primary text-white h-5 min-w-5 px-1.5 rounded-full">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4 space-y-3" align="end">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-primary">Cruzar por dimensión</p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY)}
              className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Departamento</Label>
          <Select
            value={value.departmentId ?? 'all'}
            onValueChange={(v) => set('departmentId', v)}
          >
            <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Municipio</Label>
          <Select
            value={value.municipalityId ?? 'all'}
            onValueChange={(v) => set('municipalityId', v)}
            disabled={!value.departmentId}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={value.departmentId ? 'Todos' : 'Elige un departamento primero'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {municipalities.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Canal</Label>
          <Select value={value.channelId ?? 'all'} onValueChange={(v) => set('channelId', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {channels.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Segmento</Label>
          <Select value={value.segmentId ?? 'all'} onValueChange={(v) => set('segmentId', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {segments.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Ocupación</Label>
          <Select value={value.occupationId ?? 'all'} onValueChange={(v) => set('occupationId', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {occupations.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isGlobalAdmin && (
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Líder</Label>
            <Select value={value.leaderId ?? 'all'} onValueChange={(v) => set('leaderId', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {leaders.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
