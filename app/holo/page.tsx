// app/holo/page.tsx
export const dynamic = 'force-dynamic'; // do not prerender
export const runtime = 'nodejs';        // avoid Edge for WebGL / Node APIs
export const revalidate = 0;            // no static cache

import HoloPanel from '@/components/holo/HoloPanel'; // <-- import client component directly

export default function Page() {
  return <HoloPanel />;
}
