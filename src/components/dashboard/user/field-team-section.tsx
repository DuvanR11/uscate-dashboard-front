'use client';

// Plan hacia la versión estable, Fase 3a (2026-11-10): «Equipo en terreno».
// En la ficha de una persona, un administrador le da territorio a un
// Coordinador (municipios, zonas o puestos de votación) o le pone a un líder o
// voluntario el Coordinador a cargo. El Coordinador ve los contactos de su
// territorio y los de las personas a su cargo; la regla vive en el servidor
// (`prospect-scope.ts`), esta pantalla solo la configura.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, MapPinned, Plus, Users, X } from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractErrorMessage, localitiesApi, type Locality } from '@/lib/api/catalogs';
import { pollingStationsApi, type PollingStation } from '@/lib/api/polling-stations';
import {
  fieldTeamApi,
  type CoordinatorOption,
  type FieldTeamState,
  type NamedPlace,
} from '@/lib/api/field-team';

const COORDINATED_ROLES = ['LEADER', 'BUHO'];
const NONE = 'none';

interface Option {
  id: number;
  name: string;
}

interface Props {
  userId: string;
  roleCode?: string | null;
}

export function FieldTeamSection({ userId, roleCode }: Props) {
  if (roleCode === 'COORDINATOR') return <CoordinatorTerritory userId={userId} />;
  if (roleCode && COORDINATED_ROLES.includes(roleCode)) return <CoordinatorInCharge userId={userId} />;
  return null;
}

function Shell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

// --- Líder o voluntario: a cargo de qué Coordinador queda ---------------------

function CoordinatorInCharge({ userId }: { userId: string }) {
  const [state, setState] = useState<FieldTeamState | null>(null);
  const [options, setOptions] = useState<CoordinatorOption[]>([]);
  const [selected, setSelected] = useState<string>(NONE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fieldTeamApi.get(userId), fieldTeamApi.coordinators()])
      .then(([current, coordinators]) => {
        if (cancelled) return;
        setState(current);
        setOptions(coordinators);
        setSelected(current.coordinator?.id ?? NONE);
      })
      .catch((error) => toast.error(extractErrorMessage(error) ?? 'No se pudo cargar el equipo en terreno.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const current = state?.coordinator?.id ?? NONE;

  const save = async () => {
    setSaving(true);
    try {
      const next = await fieldTeamApi.setCoordinator(userId, selected === NONE ? null : selected);
      setState(next);
      toast.success(next.coordinator ? `Queda a cargo de ${next.coordinator.fullName}.` : 'Ya no queda a cargo de ningún Coordinador.');
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'No se pudo guardar el Coordinador a cargo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      icon={Users}
      title="Equipo en terreno"
      description="El Coordinador a cargo ve los contactos de esta persona y su avance."
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="field-team-coordinator">Coordinador a cargo</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger id="field-team-coordinator" className="w-full">
                <SelectValue placeholder="Sin Coordinador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin Coordinador</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.fullName} · {option._count.coordinatedUsers} a cargo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {options.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aún no hay Coordinadores. Crea una persona con el rol «Coordinador territorial».
              </p>
            )}
          </div>
          <Button onClick={save} disabled={saving || selected === current}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      )}
    </Shell>
  );
}

// --- Coordinador: su territorio ------------------------------------------------

function PlaceChips({
  places,
  empty,
  onRemove,
}: {
  places: NamedPlace[];
  empty: string;
  onRemove: (id: number) => void;
}) {
  if (places.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {places.map((place) => (
        <Badge key={place.id} variant="secondary" className="gap-1 pr-1">
          {place.name}
          <button
            type="button"
            onClick={() => onRemove(place.id)}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
            aria-label={`Quitar ${place.name}`}
            title={`Quitar ${place.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

function AddPlace({
  id,
  label,
  placeholder,
  options,
  taken,
  onAdd,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: Option[];
  taken: NamedPlace[];
  onAdd: (place: NamedPlace) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');
  const available = useMemo(
    () => options.filter((option) => !taken.some((place) => place.id === option.id)),
    [options, taken],
  );
  const add = () => {
    const option = available.find((o) => String(o.id) === value);
    if (!option) return;
    onAdd({ id: option.id, name: option.name });
    setValue('');
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Select value={value} onValueChange={setValue} disabled={disabled || available.length === 0}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={available.length === 0 ? 'No hay más para agregar' : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {available.map((option) => (
              <SelectItem key={option.id} value={String(option.id)}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="outline" onClick={add} disabled={!value}>
        <Plus className="mr-1 h-4 w-4" />
        Agregar
      </Button>
    </div>
  );
}

function CoordinatorTerritory({ userId }: { userId: string }) {
  const [state, setState] = useState<FieldTeamState | null>(null);
  const [municipalities, setMunicipalities] = useState<NamedPlace[]>([]);
  const [localities, setLocalities] = useState<NamedPlace[]>([]);
  const [stations, setStations] = useState<NamedPlace[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<Option[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [municipalityOptions, setMunicipalityOptions] = useState<Option[]>([]);
  const [localityOptions, setLocalityOptions] = useState<Option[]>([]);
  const [stationOptions, setStationOptions] = useState<Option[]>([]);

  const apply = useCallback((next: FieldTeamState) => {
    setState(next);
    setMunicipalities(next.municipalities);
    setLocalities(next.localities);
    setStations(next.pollingStations);
    setDirty(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fieldTeamApi.get(userId),
      api.get<Option[]>('/locations/departments').then((r) => r.data ?? []),
      // Las zonas y los puestos son opcionales: si una lista falla, el resto sigue.
      localitiesApi.list().catch(() => [] as Locality[]),
      pollingStationsApi.list().catch(() => [] as PollingStation[]),
    ])
      .then(([current, deps, zones, posts]) => {
        if (cancelled) return;
        apply(current);
        setDepartments(deps);
        setLocalityOptions(
          zones.map((zone) => ({
            id: zone.id,
            name: zone.municipalityName ? `${zone.name} (${zone.municipalityName})` : zone.name,
          })),
        );
        setStationOptions(
          posts.map((post) => ({
            id: post.id,
            name: post.municipalityName ? `${post.name} (${post.municipalityName})` : post.name,
          })),
        );
      })
      .catch((error) => toast.error(extractErrorMessage(error) ?? 'No se pudo cargar el territorio.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, apply]);

  useEffect(() => {
    if (!departmentId) {
      setMunicipalityOptions([]);
      return;
    }
    let cancelled = false;
    api
      .get<Option[]>(`/locations/municipalities/${departmentId}`)
      .then((r) => !cancelled && setMunicipalityOptions(r.data ?? []))
      .catch(() => !cancelled && setMunicipalityOptions([]));
    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  const change = (setter: React.Dispatch<React.SetStateAction<NamedPlace[]>>) => ({
    add: (place: NamedPlace) => {
      setter((list) => [...list, place]);
      setDirty(true);
    },
    remove: (id: number) => {
      setter((list) => list.filter((place) => place.id !== id));
      setDirty(true);
    },
  });
  const municipalityChange = change(setMunicipalities);
  const localityChange = change(setLocalities);
  const stationChange = change(setStations);

  const save = async () => {
    setSaving(true);
    try {
      const next = await fieldTeamApi.setTerritories(userId, {
        municipalityIds: municipalities.map((p) => p.id),
        localityIds: localities.map((p) => p.id),
        pollingStationIds: stations.map((p) => p.id),
      });
      apply(next);
      toast.success('Territorio guardado. El Coordinador lo ve en unos segundos.');
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'No se pudo guardar el territorio.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => state && apply(state);

  return (
    <Shell
      icon={MapPinned}
      title="Equipo en terreno"
      description="El Coordinador ve los contactos de su territorio y los de los líderes y voluntarios a su cargo (se asignan desde la ficha de cada uno)."
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <p className="text-sm">
            <span className="font-semibold">{state?.teamSize ?? 0}</span>{' '}
            {state?.teamSize === 1 ? 'persona a cargo' : 'personas a cargo'}.
          </p>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Municipios</h4>
            <PlaceChips
              places={municipalities}
              empty="Ningún municipio."
              onRemove={municipalityChange.remove}
            />
            <div className="space-y-2">
              <Label htmlFor="field-team-department">Departamento</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="field-team-department" className="w-full sm:w-80">
                  <SelectValue placeholder="Elige el departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AddPlace
              id="field-team-municipality"
              label="Municipio"
              placeholder={departmentId ? 'Elige el municipio' : 'Primero el departamento'}
              options={municipalityOptions}
              taken={municipalities}
              onAdd={municipalityChange.add}
              disabled={!departmentId}
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Zonas (comunas, barrios, veredas)</h4>
            <PlaceChips places={localities} empty="Ninguna zona." onRemove={localityChange.remove} />
            <AddPlace
              id="field-team-locality"
              label="Zona"
              placeholder="Elige la zona"
              options={localityOptions}
              taken={localities}
              onAdd={localityChange.add}
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Puestos de votación</h4>
            <PlaceChips places={stations} empty="Ningún puesto." onRemove={stationChange.remove} />
            <AddPlace
              id="field-team-station"
              label="Puesto"
              placeholder="Elige el puesto"
              options={stationOptions}
              taken={stations}
              onAdd={stationChange.add}
            />
          </section>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={discard} disabled={!dirty || saving}>
              Descartar cambios
            </Button>
            <Button type="button" onClick={save} disabled={!dirty || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar territorio
            </Button>
          </div>
        </>
      )}
    </Shell>
  );
}
