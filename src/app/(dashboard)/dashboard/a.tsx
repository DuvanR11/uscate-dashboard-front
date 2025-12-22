'use client';

import { useEffect, useState } from 'react';
// Imports UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  CalendarCheck, 
  TrendingUp, 
  Activity, 
  Info, 
  RefreshCw,
  LayoutDashboard
} from 'lucide-react';
import { toast } from 'sonner';

// Imports de Gráficas
import { GenderChart } from '@/components/dashboard/gender-chart';
import { MonthlyGrowthChart } from '@/components/dashboard/monthly-growth-chart';
import { AgeChart } from '@/components/dashboard/age-chart';
import { VotingStationsChart } from '@/components/dashboard/voting-stations-chart';
import { LeaderRanking } from '@/components/dashboard/leader-ranking';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estado de Datos
  const [data, setData] = useState({
    totalProspects: 0,
    totalEvents: 0,
    growthRate: "+12%",
    conversionRate: "68%",
    genderData: [],
    monthlyData: [], 
    ageData: [],     
    stationsData: [],
    leadersData: []
  });

  // Función de Carga de Datos
  const fetchData = async () => {
    try {
      // Simulamos un retardo de red para ver la animación
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockResponse = {
          totalProspects: 1240,
          totalEvents: 45,
          growthRate: "+15%",
          conversionRate: "72%",
          genderData: [
              { name: 'Masculino', value: 540 },
              { name: 'Femenino', value: 680 },
              { name: 'Otro', value: 20 },
          ],
          monthlyData: [
              { name: 'Ene', prospects: 65, events: 4 },
              { name: 'Feb', prospects: 120, events: 8 },
              { name: 'Mar', prospects: 240, events: 12 },
              { name: 'Abr', prospects: 180, events: 6 },
              { name: 'May', prospects: 320, events: 15 },
              { name: 'Jun', prospects: 450, events: 20 },
          ],
          ageData: [
              { range: '18-25', count: 210 },
              { range: '26-35', count: 450 },
              { range: '36-50', count: 320 },
              { range: '50+', count: 260 },
          ],
          stationsData: [
              { name: 'Col. Santa Librada', value: 320 },
              { name: 'Esc. Normal Superior', value: 210 },
              { name: 'Polideportivo Sur', value: 180 },
              { name: 'Col. INEM', value: 150 },
              { name: 'U. Surcolombiana', value: 120 },
          ],
          leadersData: [
              { id: '1', name: 'Juan Pérez', email: 'juan@email.com', totalVotes: 150 },
              { id: '2', name: 'Maria Gomez', email: 'maria@email.com', totalVotes: 120 },
              { id: '3', name: 'Carlos Ruiz', email: 'carlos@email.com', totalVotes: 98 },
              { id: '4', name: 'Ana Torres', email: 'ana@email.com', totalVotes: 85 },
              { id: '5', name: 'Luis Diaz', email: 'luis@email.com', totalVotes: 70 },
          ]
      };
      
      setData(mockResponse as any);
    } catch (error) {
      toast.error("Error cargando estadísticas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
      setRefreshing(true);
      fetchData();
      toast.info("Actualizando métricas...");
  };

  if (loading) return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
          <div className="relative">
             <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-[#1B2541] animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <LayoutDashboard className="h-6 w-6 text-[#FFC400]" />
             </div>
          </div>
          <p className="text-[#1B2541] font-medium animate-pulse">Cargando Tablero de Control...</p>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
             <div className="p-3 bg-[#1B2541] rounded-xl shadow-lg shadow-blue-900/20">
                 <LayoutDashboard className="h-8 w-8 text-white" />
             </div>
             <div>
                <h2 className="text-3xl font-black tracking-tight text-[#1B2541]">
                    Tablero de Control
                </h2>
                <p className="text-slate-500 font-medium">
                    Resumen ejecutivo de la Campaña 2025
                </p>
             </div>
        </div>
        <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            className="border-[#1B2541] text-[#1B2541] hover:bg-[#1B2541] hover:text-white transition-all"
        >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar Datos
        </Button>
      </div>

      {/* 1. TARJETAS DE MÉTRICAS (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
            title="Total Prospectos" 
            value={data.totalProspects} 
            icon={<Users className="text-white" />} 
            color="navy" // Color personalizado
            subtext="Base de datos activa" 
            tooltip="Número total de personas registradas en el sistema con intención de voto."
        />
        <KPICard 
            title="Eventos Realizados" 
            value={data.totalEvents} 
            icon={<CalendarCheck className="text-white" />} 
            color="yellow" 
            subtext="En lo que va del año" 
            tooltip="Total de reuniones, recorridos y eventos logísticos ejecutados."
        />
        <KPICard 
            title="Crecimiento" 
            value={data.growthRate} 
            icon={<TrendingUp className="text-white" />} 
            color="green" 
            subtext="Vs. mes anterior" 
            tooltip="Porcentaje de aumento de registros comparado con el mes pasado."
        />
        <KPICard 
            title="Conversión" 
            value={data.conversionRate} 
            icon={<Activity className="text-white" />} 
            color="red" 
            subtext="Verificados / Total" 
            tooltip="Porcentaje de prospectos que han sido validados telefónicamente."
        />
      </div>

      {/* 2. GRÁFICAS PRINCIPALES */}
      <div className="grid gap-6 md:grid-cols-7">
        <div className="col-span-4 transition-transform hover:scale-[1.01] duration-300">
            <MonthlyGrowthChart data={data.monthlyData} />
        </div>
        <div className="col-span-3 transition-transform hover:scale-[1.01] duration-300">
            {/* Usamos el de AgeChart aquí o VotingStations si prefieres layout 4/3 */}
            <AgeChart data={data.ageData} />
        </div>
      </div>

      {/* 3. GRÁFICAS SECUNDARIAS */}
      <div className="grid gap-6 md:grid-cols-7">
        <div className="col-span-3 transition-transform hover:scale-[1.01] duration-300">
             <GenderChart data={data.genderData} />
        </div>
        <div className="col-span-4 transition-transform hover:scale-[1.01] duration-300">
             <VotingStationsChart data={data.stationsData} />
        </div>
      </div>

      {/* 4. RANKING DE LÍDERES */}
      <div className="transition-transform hover:scale-[1.005] duration-300">
         <LeaderRanking leaders={data.leadersData} />
      </div>
    </div>
  );
}

// --- COMPONENTE KPI CARD MEJORADO ---
interface KPIProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtext: string;
    tooltip: string;
    color: 'navy' | 'yellow' | 'red' | 'green';
}

function KPICard({ title, value, icon, subtext, tooltip, color }: KPIProps) {
    // Configuración de estilos según el color
    const styles = {
        navy:   { border: 'border-t-[#1B2541]', bgIcon: 'bg-[#1B2541]', text: 'text-[#1B2541]' },
        yellow: { border: 'border-t-[#FFC400]', bgIcon: 'bg-[#FFC400]', text: 'text-[#d97706]' }, // Texto un poco más oscuro para legibilidad
        red:    { border: 'border-t-[#E11D48]', bgIcon: 'bg-[#E11D48]', text: 'text-[#E11D48]' },
        green:  { border: 'border-t-emerald-600', bgIcon: 'bg-emerald-600', text: 'text-emerald-700' },
    };

    const currentStyle = styles[color];

    return (
      <TooltipProvider>
        <Card className={`border-t-4 ${currentStyle.border} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wide">
                    {title}
                </CardTitle>
                
                {/* Tooltip de Información */}
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px] bg-[#1B2541] text-white border-0">
                        <p>{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            
            {/* Ícono con fondo de color */}
            <div className={`p-2 rounded-lg shadow-sm ${currentStyle.bgIcon}`}>
                {/* Clonamos el elemento para forzar clases de tamaño si es necesario */}
                <div className="h-4 w-4">
                    {icon}
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${currentStyle.text}`}>
                {value}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
                {subtext}
            </p>
          </CardContent>
        </Card>
      </TooltipProvider>
    );
}