'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { GuideView } from '@/components/help/guide-view';
import { useHelpGuides } from '@/hooks/use-help-guides';
import type { Guide } from '@/lib/help-guides';
import content from '@/content/ayuda/guias.json';

const GUIDES = content.guides as Guide[];

export default function HelpGuidePage() {
  const params = useParams<{ slug: string }>();
  const { canRead } = useHelpGuides();
  const guide = GUIDES.find((g) => g.slug === params?.slug);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Link href="/ayuda" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Centro de ayuda
      </Link>
      {guide && canRead(guide) ? (
        <GuideView guide={guide} />
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
          Esta guía no está disponible para tu cuenta. En el centro de ayuda están las que puedes usar.
        </p>
      )}
    </div>
  );
}
