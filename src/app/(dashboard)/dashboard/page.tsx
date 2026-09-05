'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  format, parseISO, subDays, differenceInDays,
  eachDayOfInterval, isSameDay, startOfWeek, endOfWeek,
  isWithinInterval, addWeeks
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from "react-day-picker";

// Imports UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Can } from '@/components/shared/can';

// Iconos
import {
  Users, FileText, CheckCircle2, Activity, Info, RefreshCw,
  LayoutDashboard, Calendar as CalendarIcon, ArrowUp, ArrowDown,
  Download, Loader2
} from 'lucide-react';

// Imports de Gráficas
import { SegmentsChart } from '@/components/dashboard/segments-chart';
import { MonthlyGrowthChart } from '@/components/dashboard/monthly-growth-chart';
import { AgeChart } from '@/components/dashboard/age-chart';
import { VotingStationsChart } from '@/components/dashboard/voting-stations-chart';
import { LeaderRanking } from '@/components/dashboard/leader-ranking';
import { WelcomeChecklist } from '@/components/dashboard/welcome-checklist';
import { SecretariesGoals } from '@/components/dashboard/reports/secretaries-goals';
import { ConversionFunnel } from '@/components/dashboard/reports/conversion-funnel';
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from '@/components/dashboard/reports/advanced-filters';
import ExportPdfButton from '@/components/dashboard/intelligence/ExportPdfButton';
import type { HeatmapPoint } from '@/components/dashboard/reports/department-heatmap';

// Leaflet toca `window` — mismo criterio que inteligencia/monitoreo/mapa.
const DepartmentHeatmap = dynamic(
  () => import('@/components/dashboard/reports/department-heatmap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    ),
  },
);

// --- TIPOS DE DATOS ---
interface MonthlyChartData {
  name: string;
  prospects: number;
  events: number;
}

interface DeltaPercent {
  totalProspects: number | null;
  totalRequests: number | null;
  closedRequests: number | null;
  conversionRate: number | null;
}

interface DashboardState {
  totalProspects: number;
  totalRequests: number;
  closedRequests: number;
  conversionRate: string;
  deltaPercent: DeltaPercent | null;
  monthlyData: MonthlyChartData[];
  segmentsData: any[];
  ageData: any[];
  stationsData: any[];
  leadersData: any[];
  heatmapData: HeatmapPoint[];
  secretariesData: any[];
}

// --- FUNCIONES HELPER ---

// 1. Rellenar días faltantes (Corto plazo)
function fillMissingDates(prospectsData: any[], eventsData: any[], startDate: Date, endDate: Date) {
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  return allDays.map((day) => {
    const pFound = prospectsData.find((item: any) => isSameDay(parseISO(item.date), day));
    const eFound = eventsData.find((item: any) => isSameDay(parseISO(item.date), day));

    return {
      name: format(day, 'dd MMM', { locale: es }),
      prospects: pFound ? pFound.count : 0,
      events: eFound ? eFound.count : 0
    };
  });
}

// 2. Agrupar por Semanas (Largo plazo)
function groupDataByWeek(prospectsData: any[], eventsData: any[], startDate: Date, endDate: Date) {
  const weeklyData: MonthlyChartData[] = [];
  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });

  while (currentWeekStart <= endDate) {
    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

    const sumInRange = (data: any[]) => data.reduce((acc: number, item: any) => {
      const itemDate = parseISO(item.date);
      if (isWithinInterval(itemDate, { start: currentWeekStart, end: currentWeekEnd })) {
        return acc + item.count;
      }
      return acc;
    }, 0);

    const totalProspects = sumInRange(prospectsData);
    const totalEvents = sumInRange(eventsData);

    const label = `${format(currentWeekStart, 'd MMM', { locale: es })} - ${format(currentWeekEnd, 'd MMM', { locale: es })}`;

    weeklyData.push({
      name: label,
      prospects: totalProspects,
      events: totalEvents
    });

    currentWeekStart = addWeeks(currentWeekStart, 1);
  }
  return weeklyData;
}

export default function DashboardPage() {
  return (
    <Can
      module="DASHBOARD"
      action="canRead"
      fallback={
        <div className="p-12 text-center text-slate-500">
          No tienes permisos para ver el tablero de control.
        </div>
      }
    >
      <DashboardContent />
    </Can>
  );
}

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // --- ESTADOS DE FILTROS ---
  // CAMBIO PRINCIPAL: Inicializamos como undefined para no enviar fechas al inicio
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [eventsList, setEventsList] = useState<any[]>([]);

  // Filtros avanzados (Mejora del Dashboard, 2026-09-04) — departamento,
  // municipio, canal, segmento, ocupación, líder. Se mandan junto con
  // evento+fecha en TODAS las llamadas de fetchData().
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValues>({});

  // Estado de Datos
  const [data, setData] = useState<DashboardState>({
    totalProspects: 0,
    totalRequests: 0,
    closedRequests: 0,
    conversionRate: "0%",
    deltaPercent: null,
    segmentsData: [],
    monthlyData: [],
    ageData: [],
    stationsData: [],
    leadersData: [],
    heatmapData: [],
    secretariesData: [],
  });

  // --- CARGAR LISTA DE EVENTOS ---
  useEffect(() => {
    const loadEvents = async () => {
        try {
            const res = await api.get('/events');
            setEventsList(Array.isArray(res.data) ? res.data : res.data.data || []);
        } catch (e) {
            console.error("Error cargando eventos", e);
        }
    };
    loadEvents();
  }, []);

  const buildParams = useCallback(() => {
    const params: any = {};

    // SOLO si existe 'date' y 'date.from', agregamos los parámetros.
    // En la primera carga, como date es undefined, esto se salta.
    if (date?.from) params.startDate = format(date.from, 'yyyy-MM-dd');
    if (date?.to) params.endDate = format(date.to, 'yyyy-MM-dd');

    if (selectedEvent && selectedEvent !== "all") params.eventId = parseInt(selectedEvent);

    if (advancedFilters.departmentId) params.departmentId = advancedFilters.departmentId;
    if (advancedFilters.municipalityId) params.municipalityId = advancedFilters.municipalityId;
    if (advancedFilters.channelId) params.channelId = advancedFilters.channelId;
    if (advancedFilters.segmentId) params.segmentId = advancedFilters.segmentId;
    if (advancedFilters.occupationId) params.occupationId = advancedFilters.occupationId;
    if (advancedFilters.leaderId) params.leaderId = advancedFilters.leaderId;

    return params;
  }, [date, selectedEvent, advancedFilters]);

  // --- FUNCIÓN DE CARGA PRINCIPAL ---
  const fetchData = useCallback(async () => {
    try {
      const params = buildParams();

      const [
        kpiRes,
        growthRes,
        eventsGrowthRes,
        stationsRes,
        leadersRes,
        segmentsRes,
        ageRes,
        heatmapRes,
        secretariesRes,
      ] = await Promise.all([
        api.get('/reports/dashboard-kpis', { params }),
        api.get('/reports/prospects-growth', { params }),
        api.get('/reports/events-growth', { params }),
        api.get('/reports/political/voting-stations', { params }),
        api.get('/reports/political/leader-performance', { params }),
        api.get('/reports/political/segments', { params }),
        api.get('/reports/political/age-distribution', { params }),
        api.get('/reports/political/map', { params }),
        api.get('/reports/performance/secretaries'),
      ]);

      // --- LÓGICA DE PROCESAMIENTO DE GRÁFICA ---
      // Si no hay fecha seleccionada, usamos un default visual de 30 días para renderizar la gráfica,
      // aunque el backend haya traído todo el histórico.
      const start = date?.from || subDays(new Date(), 30);
      const end = date?.to || new Date();
      const daysDiff = differenceInDays(end, start);

      let processedChartData: MonthlyChartData[];

      if (daysDiff > 60) {
          processedChartData = groupDataByWeek(growthRes.data, eventsGrowthRes.data, start, end);
      } else {
          processedChartData = fillMissingDates(growthRes.data, eventsGrowthRes.data, start, end);
      }

      setData({
        totalProspects: kpiRes.data.totalProspects,
        totalRequests: kpiRes.data.totalRequests,
        closedRequests: kpiRes.data.closedRequests,
        conversionRate: kpiRes.data.conversionRate,
        deltaPercent: kpiRes.data.deltaPercent ?? null,

        monthlyData: processedChartData,
        segmentsData: segmentsRes.data,
        stationsData: stationsRes.data,
        leadersData: leadersRes.data,
        ageData: ageRes.data,
        heatmapData: heatmapRes.data,
        secretariesData: secretariesRes.data,
      });

    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar métricas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, buildParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
      setRefreshing(true);
      fetchData();
      toast.info("Actualizando datos...");
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await api.get('/reports/export', {
        params: buildParams(),
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reportes-dashboard.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte CSV descargado');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo exportar el reporte');
    } finally {
      setExportingCsv(false);
    }
  };

  if (loading && !data.totalProspects) return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
          <div className="relative">
             <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <LayoutDashboard className="h-6 w-6 text-secondary" />
             </div>
          </div>
          <p className="text-primary font-medium animate-pulse">Cargando métricas...</p>
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      <WelcomeChecklist />

      {/* HEADER & FILTROS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 pb-6">

        {/* TÍTULO */}
        <div className="flex items-center gap-3">
             <div className="p-3 bg-primary rounded-xl shadow-lg shadow-blue-900/20 hidden sm:block">
                 <LayoutDashboard className="h-8 w-8 text-white" />
             </div>
             <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">
                    Tablero de Control
                </h2>
                <p className="text-sm sm:text-base text-slate-500 font-medium">
                    Resumen estratégico y operativo.
                </p>
             </div>
        </div>

        {/* BARRA DE HERRAMIENTAS (FILTROS) */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full xl:w-auto">

            {/* 1. SELECTOR DE EVENTOS */}
            <div className="w-full sm:w-[200px]">
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger className="bg-white border-slate-300 shadow-sm">
                        <SelectValue placeholder="Filtrar por Evento" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Eventos</SelectItem>
                        {eventsList.map((evt) => (
                            <SelectItem key={evt.id} value={evt.id.toString()}>
                                {evt.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* 2. SELECTOR DE RANGO DE FECHAS */}
            <div className="grid gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full sm:w-[260px] justify-start text-left font-normal border-slate-300 shadow-sm",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                                        {format(date.to, "LLL dd, y", { locale: es })}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y", { locale: es })
                                )
                            ) : (
                                <span>Seleccionar fechas</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from} // Ajustado para manejar undefined
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* 3. FILTROS AVANZADOS */}
            <AdvancedFilters value={advancedFilters} onChange={setAdvancedFilters} />

            {/* BOTÓN ACTUALIZAR */}
            <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-primary hover:bg-primary/90 text-white font-bold w-full sm:w-auto shadow-sm"
            >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Cargando' : 'Aplicar'}
            </Button>

            {/* EXPORTAR */}
            <Button
                onClick={handleExportCsv}
                disabled={exportingCsv}
                variant="outline"
                className="bg-white border-slate-300 shadow-sm w-full sm:w-auto"
            >
                {exportingCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                CSV
            </Button>
            <ExportPdfButton targetId="dashboard-report" fileName="dashboard-uscategui" />
        </div>
      </div>

      {/* --- DASHBOARD CONTENT (envuelto para exportar a PDF) --- */}
      <div id="dashboard-report" className={cn("space-y-6 transition-opacity", refreshing && "opacity-60 pointer-events-none")}>

      {/* 1. KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
            title="Total Prospectos"
            value={data.totalProspects}
            icon={<Users className="text-white" />}
            color="navy"
            subtext={date?.from ? "En periodo seleccionado" : "Histórico total"}
            tooltip="Número total de personas registradas."
            deltaPercent={data.deltaPercent?.totalProspects ?? null}
        />
        <KPICard
            title="Solicitudes Totales"
            value={data.totalRequests}
            icon={<FileText className="text-white" />}
            color="yellow"
            subtext="Recibidas"
            tooltip="Total de solicitudes creadas."
            deltaPercent={data.deltaPercent?.totalRequests ?? null}
        />
        <KPICard
            title="Solicitudes Resueltas"
            value={data.closedRequests}
            icon={<CheckCircle2 className="text-white" />}
            color="green"
            subtext="Cerradas exitosamente"
            tooltip="Total de solicitudes con estado RESUELTO."
            deltaPercent={data.deltaPercent?.closedRequests ?? null}
        />
        <KPICard
            title="Tasa de Efectividad"
            value={data.conversionRate}
            icon={<Activity className="text-white" />}
            color="red"
            subtext="Resolución"
            tooltip="% de solicitudes resueltas sobre el total."
            deltaPercent={data.deltaPercent?.conversionRate ?? null}
        />
      </div>

      {/* 2. GRÁFICAS PRINCIPALES */}
      <div className="grid gap-6 md:grid-cols-7">
        <div className="col-span-4 transition-transform hover:scale-[1.005] duration-300">
            <MonthlyGrowthChart data={data.monthlyData} usingDefaultRange={!date?.from} />
        </div>
        <div className="col-span-3 transition-transform hover:scale-[1.005] duration-300">
            <SegmentsChart data={data.segmentsData} />
        </div>
      </div>

      {/* 3. GRÁFICAS SECUNDARIAS */}
      <div className="grid gap-6 md:grid-cols-7">
        <div className="col-span-3 transition-transform hover:scale-[1.005] duration-300">
             <LeaderRanking leaders={data.leadersData} />
        </div>
        <div className="col-span-4 transition-transform hover:scale-[1.005] duration-300">
             <VotingStationsChart data={data.stationsData} />
        </div>
      </div>

       <div className="grid gap-6 md:grid-cols-1">
          <AgeChart data={data.ageData} />
       </div>

      {/* 4. NUEVOS WIDGETS (Mejora del Dashboard, 2026-09-04) */}
      <div className="grid gap-6 md:grid-cols-2">
        <ConversionFunnel
          totalProspects={data.totalProspects}
          totalRequests={data.totalRequests}
          closedRequests={data.closedRequests}
        />
        <SecretariesGoals data={data.secretariesData} />
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Distribución Geográfica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] w-full">
              <DepartmentHeatmap data={data.heatmapData} />
            </div>
          </CardContent>
        </Card>
      </div>

      </div>
    </div>
  );
}

// ... Componente KPICard ...
interface KPIProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtext: string;
    tooltip: string;
    color: 'navy' | 'yellow' | 'red' | 'green';
    // Comparación de periodo (Mejora del Dashboard, 2026-09-04): `null`
    // cuando no hay base real de comparación (periodo anterior en cero) —
    // nunca se muestra un porcentaje inventado.
    deltaPercent?: number | null;
}

function KPICard({ title, value, icon, subtext, tooltip, color, deltaPercent }: KPIProps) {
    const styles = {
        navy:   { border: 'border-t-primary', bgIcon: 'bg-primary', text: 'text-primary' },
        yellow: { border: 'border-t-secondary', bgIcon: 'bg-secondary', text: 'text-[#d97706]' },
        red:    { border: 'border-t-[#E11D48]', bgIcon: 'bg-[#E11D48]', text: 'text-[#E11D48]' },
        green:  { border: 'border-t-emerald-600', bgIcon: 'bg-emerald-600', text: 'text-emerald-700' },
    };

    const currentStyle = styles[color];
    const hasDelta = deltaPercent !== null && deltaPercent !== undefined;
    const isPositive = hasDelta && deltaPercent >= 0;

    return (
      <TooltipProvider>
        <Card className={`border-t-4 ${currentStyle.border} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wide">
                    {title}
                </CardTitle>

                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px] bg-primary text-white border-0">
                        <p>{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </div>

            <div className={`p-2 rounded-lg shadow-sm ${currentStyle.bgIcon}`}>
                <div className="h-4 w-4">
                    {icon}
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className={`text-3xl font-black ${currentStyle.text}`}>
                  {value}
              </div>
              {hasDelta && (
                <span className={cn(
                  "flex items-center gap-0.5 text-xs font-bold mb-1 px-1.5 py-0.5 rounded-full",
                  isPositive ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50",
                )}>
                  {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(deltaPercent!)}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
                {subtext}
            </p>
          </CardContent>
        </Card>
      </TooltipProvider>
    );
}
