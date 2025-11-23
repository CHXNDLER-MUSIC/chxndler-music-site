import DashboardApp from "@/components/DashboardApp";
import { getTodaySoulPrompt } from "@/lib/getTodaySoulPrompt";

export default async function Page() {
  const todaysPrompt = await getTodaySoulPrompt();

  return (
    <>
      <DashboardApp todaysPrompt={todaysPrompt} />
    </>
  );
}
