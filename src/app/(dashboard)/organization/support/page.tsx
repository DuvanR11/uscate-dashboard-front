import { SupportBoard } from "@/components/platform/support-board";
import { PressSupportAccess } from "@/components/dashboard/organization/press-support-access";
export default function SupportPage() {
  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      {/* Zyron Prensa (2026-11-08): solo aparece en organizaciones de prensa. */}
      <PressSupportAccess />
      <SupportBoard />
    </div>
  );
}
