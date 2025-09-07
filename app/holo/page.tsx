// app/holo/page.tsx
export const dynamic = 'force-dynamic'; // don't prerender
export const runtime = 'nodejs';        // avoid Edge
export const revalidate = 0;            // disable cache

import dynamic from 'next/dynamic';

// Load the client-only panel (WebGL, stores, effects) on the browser
const HoloPanel = dynamic(() => import('@/components/holo/HoloPanel'), {
  ssr: false,
});

export default function Page() {
  return <HoloPanel />;
}
