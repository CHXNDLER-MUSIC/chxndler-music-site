import DashboardApp from "@/components/DashboardApp";
import DashboardWelcomeDisplay from "@/components/DashboardWelcomeDisplay";

export default function DashboardPage() {
  return (
    <>
      <div className="pt-6 px-4">
        <DashboardWelcomeDisplay />
      </div>
      <DashboardApp />
    </>
  );
}

