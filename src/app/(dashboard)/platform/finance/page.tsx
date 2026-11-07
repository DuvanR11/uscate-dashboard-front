import { BudgetPanel } from "@/components/platform/budget-panel";
import { FinanceOverviewPanel } from "@/components/platform/finance-overview-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Fase 6a (visibilidad financiera) y 6c (presupuesto con semáforo y
// proyección del cierre) del plan de finanzas y catálogo, 2026-11-07.
export default function FinancePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <p className="text-muted-foreground">
          Ingresos por plan, segmento y tipo; costo variable por organización y
          por módulo; margen de contribución por plan y por mes; presupuesto
          con semáforo y proyección del cierre.
        </p>
      </div>
      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Cuánto deja cada plan</TabsTrigger>
          <TabsTrigger value="budget">Presupuesto</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="pt-4">
          <FinanceOverviewPanel />
        </TabsContent>
        <TabsContent value="budget" className="pt-4">
          <BudgetPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
