import { redirect } from "next/navigation";
import Link from "next/link";
import { getApiUser, isAdminUser } from "@/lib/apiAuth";
import AdminTabs from "@/components/admin/AdminTabs";

export default async function AdminHome() {
  const auth = await getApiUser();
  if (!auth) redirect("/signin?next=%2Fadmin");
  if (!isAdminUser(auth.user)) redirect("/");

  return <main className="min-h-screen bg-[#09090c] px-5 py-8 text-white sm:px-10 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-xs font-bold tracking-[.2em] text-white/45">CHXNDLER.WORLD</Link>
      <header className="my-10">
        <p className="text-xs font-bold tracking-[.28em] text-[#ff3ea5]">ADMIN</p>
        <h1 className="mt-2 text-4xl font-black">Studio backend</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/55">Track song release status and manage outreach from the song catalog.</p>
      </header>
      <AdminTabs />
    </div>
  </main>;
}
