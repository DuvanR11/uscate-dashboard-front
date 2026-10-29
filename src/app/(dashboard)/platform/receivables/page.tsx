import { MonthlyClosePanel } from "@/components/platform/monthly-close-panel";
import { ReceivablesBoard } from "@/components/platform/receivables-board";

export default function ReceivablesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <ReceivablesBoard />
      <MonthlyClosePanel />
    </div>
  );
}
