// app/holo/page.tsx
export const dynamic = 'force-dynamic'; // do not prerender
export const runtime = 'nodejs';        // avoid Edge for WebGL / Node APIs
export const revalidate = 0;            // no static cache

import NextDynamic from 'next/dynamic'; // <- alias to avoid name collision

// Client-only panel (contains hooks, stores, WebGL, etc.)
const HoloPanel = NextDynamic(() => import('@/components/holo/HoloPanel'), {
  ssr: false,
});

export default function Page() {
  return <HoloPanel />;
}
