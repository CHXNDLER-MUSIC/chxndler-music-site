'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function NotFoundInner() {
  const searchParams = useSearchParams();
  // TODO: keep or recreate whatever logic was using searchParams here

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Lost in the Heartverse</h1>
        <p className="opacity-80">
          The page you are looking for drifted off into space
        </p>
      </div>
    </main>
  );
}

export default function NotFoundPage() {
  return (
    <Suspense fallback={null}>
      <NotFoundInner />
    </Suspense>
  );
}

