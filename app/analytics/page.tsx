import AnalyticsDashboard from "../../components/AnalyticsDashboard";

export const metadata = {
  title: "Analytics Dashboard - CHXNDLER",
  description: "View click analytics and user interaction data.",
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Click Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Track user interactions and click patterns across your site.
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg">
          <AnalyticsDashboard embedded={true} />
        </div>
      </div>
    </div>
  );
}