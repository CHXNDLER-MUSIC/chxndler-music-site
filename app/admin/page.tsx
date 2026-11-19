import { redirect } from "next/navigation";
import Link from "next/link";
import { getApiUser, isAdminUser } from "@/lib/apiAuth";
import AdminTabs from "@/components/admin/AdminTabs";

export default async function AdminHome() {
  const auth = await getApiUser();
  if (!auth) redirect("/signin?next=%2Fadmin");
  if (!isAdminUser(auth.user)) return <main className="grid min-h-screen place-items-center bg-[#09090c] px-6 text-white">
    <section className="max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <p className="text-xs font-black tracking-[.28em] text-[#ff3ea5]">ADMIN ACCESS</p>
      <h1 className="mt-4 text-2xl font-black">This account isn’t authorized.</h1>
      <p className="mt-3 text-sm leading-6 text-white/60">You’re signed in as <strong className="text-white">{auth.user.email || "an account without an email"}</strong>. Sign in with the admin account to open this page.</p>
      <Link href="/signin?next=%2Fadmin" className="mt-6 inline-flex rounded-full border border-[#ff3ea5]/60 px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-white hover:bg-[#ff3ea5]/10">Continue to admin sign in</Link>
    </section>
  </main>;

  return <main className="min-h-screen bg-[#09090c] px-5 py-8 text-white sm:px-10 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-xs font-bold tracking-[.2em] text-white/45">ENTER THE HEARTVERSE</Link>
      <header className="my-10">
        <p className="text-xs font-bold tracking-[.28em] text-[#ff3ea5]">ADMIN</p>
        <h1 className="mt-2 text-4xl font-black">Task tracker</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/55">One place for CHXNDLER STUDIO, CHXNDLER, and unreleased song work.</p>
      </header>
      <AdminTabs />
    </div>
  </main>;
}
