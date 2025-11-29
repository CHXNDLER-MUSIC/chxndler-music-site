import { Suspense } from "react";
import DashboardApp from "@/components/DashboardApp";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardApp />
    </Suspense>
  );
}
