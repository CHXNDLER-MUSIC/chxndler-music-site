import type { Metadata } from 'next';
import { Suspense } from 'react';
import TipExperience from '@/components/tip/TipExperience';

export const metadata: Metadata = {
  title: 'TIP CHXNDLER ♡',
  description: 'Support the music. Tip CHXNDLER and step into the Heartverse.',
  robots: { index: false, follow: false },
};

// The tip flow is fully client-driven (Stripe Elements, anon session). Keep the
// route itself dynamic so it is never statically cached with stale config.
export const dynamic = 'force-dynamic';

export default function TipPage() {
  return (
    <Suspense fallback={null}>
      <TipExperience />
    </Suspense>
  );
}
