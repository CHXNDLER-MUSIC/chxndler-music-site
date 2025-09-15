'use client';

import dynamic from 'next/dynamic';

const HealthDashboard = dynamic(
  () => import('@/components/HealthDashboard'),
  { ssr: false }
);

export default function HealthPage() {
  return <HealthDashboard />;
}