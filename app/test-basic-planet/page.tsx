'use client';

import dynamic from 'next/dynamic';

const BasicPlanetScene = dynamic(
  () => import('@/components/BasicPlanetScene'),
  { ssr: false }
);

export default function TestBasicPlanetPage() {
  return (
    <main className="w-screen h-screen bg-black">
      <BasicPlanetScene />
    </main>
  );
}