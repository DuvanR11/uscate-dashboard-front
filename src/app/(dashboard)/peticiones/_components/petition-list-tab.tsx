// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { Clock, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DeadlineCell } from './petition-model';
import { StatusBadge, EmptyState } from './petition-widgets';
import type { PetitionsWorkspace } from './use-petitions-workspace';

/** Tablero de control: búsqueda, filtros y lista de peticiones. */
export function PetitionListTab({ w }: { w: PetitionsWorkspace }) {
  const {
    loadingList,
    query,
    setQuery,
    onlyPendingApproval,
    setOnlyPendingApproval,
    onlyMyAssigned,
    setOnlyMyAssigned,
    assignedLawyerFilter,
    setAssignedLawyerFilter,
    lawyers,
    canApprove,
    resolveLawyerName,
    filteredPetitions,
    handleLoadPetition,
  } = w;
  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <CardTitle className="flex items-center gap-2 text-base whitespace-nowrap">
            <Clock size={18} className="text-blue-600" />
            Monitoreo de términos
          </CardTitle>

          {/* Se acomoda en varias filas: en un portátil la barra se salía por la derecha. */}
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            {/* Plan "Cadena de Firma", Fase 5 (2026-09-03) — vista
            "Pendientes de mi aprobación" para el congresista: mismo
            gate de `canApprove` que los botones de aprobar/rechazar,
            para no ofrecer un filtro que no le sirve a un abogado. */}
            {canApprove && (
              <label className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-600">
                <Switch
                  checked={onlyPendingApproval}
                  onCheckedChange={setOnlyPendingApproval}
                />
                Pendientes de mi aprobación
              </label>
            )}

            {/* Post-plan (2026-09-03) — "asignación de abogados con UI
            real": esta la ve CUALQUIER usuario (a diferencia de la de
            arriba) — un abogado real quiere ver solo lo que a ÉL le
            toca, sin necesitar la lista completa de colegas. */}
            <label className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-600">
              <Switch
                checked={onlyMyAssigned}
                onCheckedChange={setOnlyMyAssigned}
              />
              Mis peticiones asignadas
            </label>

            {canApprove && lawyers.length > 0 && (
              <Select
                value={assignedLawyerFilter || 'ALL'}
                onValueChange={(val) =>
                  setAssignedLawyerFilter(val === 'ALL' ? '' : val)
                }
              >
                <SelectTrigger className="h-9 w-full text-xs md:w-56" aria-label="Filtrar por abogado asignado">
                  <SelectValue placeholder="Asignado a..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Todos los abogados
                  </SelectItem>
                  {lawyers.map((lawyer) => (
                    <SelectItem key={lawyer.id} value={lawyer.id} className="text-xs">
                      {lawyer.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Buscar radicado, ciudadano o estado..."
                aria-label="Buscar peticiones"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingList ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto animate-spin text-slate-400" />
            </div>
          ) : filteredPetitions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-3">Radicado / Ciudadano</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Asignado a</th>
                    <th className="px-4 py-3">Fecha límite</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Días restantes</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredPetitions.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-700">
                          {p.radicado || 'Sin radicado'}
                        </p>
                        <p className="text-[11px] uppercase text-slate-500">
                          {p.petitioner || 'Sin peticionario'}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {p.petitionType}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          className={
                            p.petitionDirection === 'CREADA'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }
                        >
                          {p.petitionDirection === 'CREADA' ? 'Creada por mí' : 'Respuesta'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        {resolveLawyerName(p.assignedLawyerId) || (
                          <span className="text-slate-400">Sin asignar</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">
                        {p.deadlineAt
                          ? new Date(p.deadlineAt).toLocaleDateString('es-CO')
                          : 'N/A'}
                        {p.deadlineExtendedAt && (
                          <span
                            title="Plazo extendido (Art. 14, Ley 1755/2015)"
                            className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700"
                          >
                            Ext.
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>

                      <td className="px-4 py-3">
                        <DeadlineCell status={p.status} trafficLight={p.trafficLight} daysLeft={p.daysLeft} />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="font-bold text-blue-600"
                          onClick={() => handleLoadPetition(p)}
                        >
                          Ver / Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No hay peticiones registradas." />
          )}
        </CardContent>
      </Card>
    </>
  );
}
