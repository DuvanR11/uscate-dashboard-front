'use client';

import React, { useEffect, useState } from 'react';
import api from "@/lib/api"; // Tu instancia de Axios
import {
  Loader2, Mail, MessageSquare, MessageCircle,
  Users, ShieldAlert, CheckCircle2, Crown, ChevronRight, Layers, Sparkles
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; // Si usas shadcn, sino usa el div nativo abajo
import { getPermissionModules, PermissionModule } from "@/lib/api/permissions";

// --- TIPOS (Coinciden con el backend) ---
interface UsageMetric {
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
}

interface SeatMetric {
  roleName: string;
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
}

// Fase P4 del "Gating por Plan" — `plan: null` significa "sin plan asignado
// todavía" (decisión #1: acceso completo sin filtrar), NUNCA un error ni un
// plan por defecto inventado.
interface ActivePlan {
  code: string;
  name: string;
  modules: string[];
}

interface SubscriptionData {
  organization: {
    id: string;
    name: string;
    nit: string;
  };
  billing: {
    status: string;
    nextRenewal: string;
  };
  consumption: {
    sms: UsageMetric;
    email: UsageMetric;
    whatsapp: UsageMetric;
  };
  seats: Record<string, SeatMetric>;
  plan: ActivePlan | null;
}

export default function SubscriptionPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const [{ data: subscription }, moduleTree] = await Promise.all([
        api.get('/organization/subscription'),
        getPermissionModules(),
      ]);
      setData(subscription);
      setModules(moduleTree);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Agrupa los códigos planos de `plan.modules` por su sección padre en el
  // árbol real de `/permissions/modules` — así "Tu plan incluye" se lee
  // igual que el propio sidebar, no como una lista de códigos técnicos.
  const groupPlanModulesBySection = (planModules: string[]) => {
    const included = new Set(planModules);
    const groups: { section: string; items: string[] }[] = [];
    for (const root of modules) {
      const childNames = root.children
        .filter((child) => included.has(child.code))
        .map((child) => child.name);
      const rootIncluded = included.has(root.code);
      // Un módulo raíz sin hijos (ej. DASHBOARD, MEDIA) se muestra a sí mismo;
      // uno con hijos se muestra por sus hijos incluidos, no por su propio nombre de menú.
      if (root.children.length === 0 && rootIncluded) {
        groups.push({ section: root.name, items: [] });
      } else if (childNames.length > 0) {
        groups.push({ section: root.name, items: childNames });
      }
    }
    return groups;
  };

  // Función para determinar color de la barra según uso
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';     // Crítico
    if (percentage >= 75) return 'bg-yellow-500';  // Advertencia
    return 'bg-primary';                         // Normal (Tu color de marca)
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-10 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No se pudo cargar la suscripción</h2>
        <p className="text-slate-500">Verifica que tu organización tenga un plan activo.</p>
        <Button onClick={fetchSubscription} variant="outline" className="mt-4">Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER & RESUMEN DE ORGANIZACIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Mi Plan y Consumo</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Organización: <span className="font-bold text-slate-800">{data.organization.name}</span>
            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">{data.organization.nit}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
             <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Estado del Plan</p>
             <p className="text-green-600 font-bold flex items-center justify-end gap-1">
               <CheckCircle2 className="h-4 w-4" /> Activo
             </p>
          </div>
          <Button className="bg-secondary text-primary hover:bg-secondary/90 font-bold shadow-md shadow-yellow-500/20">
            <Crown className="mr-2 h-4 w-4" /> Ampliar Plan
          </Button>
        </div>
      </div>

      {/* TU PLAN — Fase P4 del "Gating por Plan" */}
      <PlanCard plan={data.plan} groupModules={groupPlanModulesBySection} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* SECCIÓN 1: CONSUMO DE MENSAJERÍA */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
             <MessageSquare className="h-5 w-5 text-slate-400" /> Consumo de Campañas
          </h3>

          {/* SMS CARD */}
          <ConsumptionCard 
            icon={<MessageSquare className="h-5 w-5 text-blue-500" />}
            title="Mensajes de Texto (SMS)"
            metric={data.consumption.sms}
            unit="SMS"
            colorFn={getProgressColor}
          />

          {/* EMAIL CARD */}
          <ConsumptionCard 
            icon={<Mail className="h-5 w-5 text-purple-500" />}
            title="Correos Electrónicos"
            metric={data.consumption.email}
            unit="Emails"
            colorFn={getProgressColor}
          />

          {/* WHATSAPP CARD */}
          <ConsumptionCard 
            icon={<MessageCircle className="h-5 w-5 text-green-500" />}
            title="Mensajes de WhatsApp"
            metric={data.consumption.whatsapp}
            unit="Msgs"
            colorFn={getProgressColor}
          />
        </div>

        {/* SECCIÓN 2: LÍMITES DE ASIENTOS (USUARIOS) */}
        <div className="space-y-6">
           <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
             <Users className="h-5 w-5 text-slate-400" /> Licencias de Usuarios
           </h3>
           
           <Card className="shadow-lg border-slate-200 bg-slate-50/50">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                 Ocupación por Rol
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                {Object.entries(data.seats).map(([code, seat]) => (
                   <div key={code} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                         <div>
                            <p className="font-bold text-slate-700 text-sm">{seat.roleName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{code}</p>
                         </div>
                         <Badge variant={seat.percentage >= 100 ? "destructive" : "secondary"}>
                            {seat.used} / {seat.limit}
                         </Badge>
                      </div>
                      
                      {/* Barra simple */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div 
                           className={`h-full rounded-full transition-all duration-500 ${seat.percentage >= 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                           style={{ width: `${Math.min(seat.percentage, 100)}%` }}
                         />
                      </div>
                      
                      {seat.percentage >= 90 && (
                        <p className="text-[10px] text-red-500 mt-1 font-medium flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> Límite alcanzado
                        </p>
                      )}
                   </div>
                ))}

                {Object.keys(data.seats).length === 0 && (
                   <p className="text-sm text-slate-400 italic text-center py-4">No hay límites de roles configurados.</p>
                )}
             </CardContent>
           </Card>
           
           {/* CTA Box */}
           <Card className="bg-primary text-white border-0 shadow-xl overflow-hidden relative">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-secondary rounded-full blur-[40px] opacity-30"></div>
              <CardContent className="p-6 relative z-10">
                 <h4 className="font-bold text-lg mb-2">¿Necesitas más capacidad?</h4>
                 <p className="text-sm text-slate-300 mb-4">
                    Amplía tu plan para agregar más secretarios, testigos o enviar más campañas masivas sin interrupciones.
                 </p>
                 <Button variant="outline" className="w-full border-slate-500 text-slate-200 hover:bg-white hover:text-primary transition-colors">
                    Contactar Ventas <ChevronRight className="ml-1 h-4 w-4"/>
                 </Button>
              </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}

// --- TARJETA "TU PLAN" (Fase P4 del "Gating por Plan") ---
function PlanCard({
  plan,
  groupModules,
}: {
  plan: ActivePlan | null;
  groupModules: (planModules: string[]) => { section: string; items: string[] }[];
}) {
  // Decisión #1 (informe "Gating por Plan"): sin plan asignado = acceso
  // completo sin filtrar. Se muestra tal cual es, nunca como un error ni
  // como "no tienes plan" alarmante.
  if (!plan) {
    return (
      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Sparkles className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-lg">Sin plan asignado todavía</h4>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Tu organización tiene acceso a todos los módulos mientras no se le asigne
              un plan comercial específico. Esto no es un error — es el estado por defecto.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groups = groupModules(plan.modules);

  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-secondary/10 rounded-xl border border-secondary/20">
              <Layers className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Tu plan</p>
              <h4 className="font-black text-slate-800 text-xl">{plan.name}</h4>
            </div>
          </div>
          <Badge className="bg-primary text-white self-start sm:self-auto">
            {plan.modules.length} módulos incluidos
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((group) => (
            <div key={group.section} className="bg-slate-50/60 rounded-xl border border-slate-100 p-3">
              <p className="font-bold text-slate-700 text-sm mb-1.5">{group.section}</p>
              {group.items.length > 0 ? (
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item} className="text-xs text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> Incluido
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- SUBCOMPONENTE REUTILIZABLE PARA TARJETAS DE CONSUMO ---
function ConsumptionCard({ icon, title, metric, unit, colorFn }: any) {
  return (
    <Card className="border-0 shadow-md ring-1 ring-slate-100 overflow-hidden group hover:ring-primary/20 transition-all">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          
          {/* Icono y Título */}
          <div className="p-6 flex items-start gap-4 flex-1">
             <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors border border-slate-100">
               {icon}
             </div>
             <div>
               <h4 className="font-bold text-slate-800 text-lg">{title}</h4>
               <p className="text-sm text-slate-500">
                 Te quedan <span className="font-bold text-slate-700">{metric.remaining.toLocaleString()}</span> {unit} disponibles.
               </p>
             </div>
          </div>

          {/* Estadísticas y Barra */}
          <div className="bg-slate-50/50 p-6 md:w-[280px] border-l border-slate-100 flex flex-col justify-center">
             <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-black text-slate-800">{metric.percentage}%</span>
                <span className="text-xs font-mono text-slate-500 mb-1">
                   {metric.used.toLocaleString()} / {metric.limit.toLocaleString()}
                </span>
             </div>
             
             {/* Custom Progress Bar */}
             <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                   className={`h-full rounded-full transition-all duration-700 ease-out ${colorFn(metric.percentage)}`}
                   style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                />
             </div>

             {metric.percentage >= 90 && (
               <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="h-3 w-3" /> ¡Crítico! Recarga saldo.
               </p>
             )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}