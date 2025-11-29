import { Suspense } from "react";
import DashboardApp from "@/components/DashboardApp";
import { getTodaySoulPrompt } from "@/lib/getTodaySoulPrompt";

export default async function Page() {
  const todaysPrompt = await getTodaySoulPrompt();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardApp todaysPrompt={todaysPrompt} />
    </Suspense>
  );
}
