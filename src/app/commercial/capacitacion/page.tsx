import Link from 'next/link';
import { TrainingWorkspace } from '@/components/training/training-workspace';

export default function CommercialTrainingPage() {
  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto mb-6 max-w-6xl">
        <Link
          href="/commercial"
          className="text-sm text-primary underline underline-offset-4"
        >
          ← Volver a mi portal comercial
        </Link>
      </div>
      <TrainingWorkspace commercial />
    </main>
  );
}
