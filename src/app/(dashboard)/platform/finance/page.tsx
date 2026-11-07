import { FinanceOverviewPanel } from "@/components/platform/finance-overview-panel";

// Fase 6a del plan de finanzas y catálogo (2026-11-07): visibilidad financiera.
export default function FinancePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <p className="text-muted-foreground">
          Ingresos por plan, segmento y tipo; costo variable por organización y
          por módulo; margen de contribución por plan y por mes.
        </p>
      </div>
      <FinanceOverviewPanel />
    </div>
  );
}
