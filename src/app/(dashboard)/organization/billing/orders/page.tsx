"use client";
import Link from "next/link";
import { CollectionOrdersPanel } from "@/components/billing/collection-orders-panel";

export default function MyCollectionOrdersPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <Link
        className="text-primary underline"
        href="/organization/billing/quotes"
      >
        Volver a cotizaciones
      </Link>
      <CollectionOrdersPanel />
    </div>
  );
}
