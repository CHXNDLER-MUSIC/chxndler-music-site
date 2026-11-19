import { getApiUser, isAdminUser } from "@/lib/apiAuth";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import BrandNavigation from "@/components/admin/BrandNavigation";

export default async function AdminHome() {
  const auth = await getApiUser();
  if (!auth || !isAdminUser(auth.user)) return <AdminLoginForm signedInEmail={auth?.user.email || ""} />;

  return <main className="admin-dashboard min-h-screen px-5 py-8 text-white sm:px-10 sm:py-12" style={{ background: "#09090c" }}>
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex justify-center">
        <BrandNavigation />
      </header>
      <AdminTabs />
    </div>
  </main>;
}
