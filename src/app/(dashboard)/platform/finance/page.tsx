import { BudgetPanel } from "@/components/platform/budget-panel";
import { ClientsPanel, InvoicingPanel, PrepaidPanel } from "@/components/platform/finance-clients-panel";
import { FinanceOverviewPanel } from "@/components/platform/finance-overview-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Fase 6a (visibilidad financiera), 6b (por cliente, saldos prepagos y
// facturación) y 6c (presupuesto con semáforo y proyección del cierre) del
// plan de finanzas y catálogo, 2026-11-07.
export default function FinancePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <p className="text-muted-foreground">
          Ingresos por plan, segmento y tipo; utilidad, saldos y facturación de cada cliente; presupuesto con semáforo y
          proyección del cierre.
        </p>
      </div>
      <Tabs defaultValue="plans">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="plans">Cuánto deja cada plan</TabsTrigger>
          <TabsTrigger value="clients">Por cliente</TabsTrigger>
          <TabsTrigger value="prepaid">Saldos prepagos</TabsTrigger>
          <TabsTrigger value="invoicing">Por facturar</TabsTrigger>
          <TabsTrigger value="budget">Presupuesto</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="pt-4">
          <FinanceOverviewPanel />
        </TabsContent>
        <TabsContent value="clients" className="pt-4">
          <ClientsPanel />
        </TabsContent>
        <TabsContent value="prepaid" className="pt-4">
          <PrepaidPanel />
        </TabsContent>
        <TabsContent value="invoicing" className="pt-4">
          <InvoicingPanel />
        </TabsContent>
        <TabsContent value="budget" className="pt-4">
          <BudgetPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
