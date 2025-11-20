import { cookies } from 'next/headers';
import Link from 'next/link';
import JoinUsButton from '@/components/JoinUsButton';
import BookButton from '@/components/BookButton';
import WelcomeHomeForm from '@/components/WelcomeHomeForm';

type Profile = {
  id: string;
  display_name: string | null;
  hearts: number | null;
};

export default async function DashboardWelcomeDisplay() {
  const cookieStore = cookies();
  const token = cookieStore.get('sb-access-token')?.value || '';

  // Logged out view: do not call /api/profile
  if (!token) {
    return (
      <div className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-md border border-white/15 bg-white/5 mx-auto max-w-2xl glow cockpit-glow" style={{
        boxShadow:
          '0 0 40px rgba(252,84,175,0.25), 0 0 90px rgba(56,182,255,0.25), inset 0 0 28px rgba(242,239,29,0.12)'
      }}>
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(252,84,175,.18), rgba(56,182,255,.18))',
          mixBlendMode: 'screen'
        }} />
        <div className="relative">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[0.15em] text-white drop-shadow mb-2">WELCOME TO THE HEARTVERSE {'<3'}</h2>
          <p className="mb-6" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>You're invited into the Heartverse.</p>
          
          {/* Email, Phone, and Heart Signal Form */}
          <WelcomeHomeForm />
          
          <div className="mt-6">
            <JoinUsButton className="inline-flex items-center justify-center rounded-xl px-24 py-4 font-semibold text-black bg-[#38B6FF] hover:brightness-110 transition shadow-[0_0_24px_rgba(56,182,255,0.45)] welcome-home-button min-w-[320px]">
              WELCOME HOME
            </JoinUsButton>
          </div>
        </div>
      </div>
    );
  }

  // Logged in view: ensure profile exists via server-side call to /api/profile
  let profile: Profile | null = null;
  try {
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
      .join('; ');
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/profile` || '/api/profile', {
      headers: { Cookie: cookieHeader },
      // Ensure we don't revalidate too aggressively; this is user-specific
      cache: 'no-store',
    });
    if (res.ok) {
      profile = (await res.json()) as Profile;
    }
  } catch {}

  const name = profile?.display_name ?? 'Pilot';
  const hearts = profile?.hearts ?? 0;

  return (
    <div className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-md border border-white/15 bg-white/5 mx-auto max-w-2xl glow cockpit-glow" style={{
      boxShadow:
        '0 0 40px rgba(252,84,175,0.25), 0 0 90px rgba(56,182,255,0.25), inset 0 0 28px rgba(242,239,29,0.12)'
    }}>
      <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
        background: 'linear-gradient(135deg, rgba(252,84,175,.18), rgba(56,182,255,.18))',
        mixBlendMode: 'screen'
      }} />
      <div className="relative">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[0.12em] text-white drop-shadow mb-2 flex items-center gap-4">
          WELCOME BACK TO THE HEARTVERSE {'<3'}, {name}
          <BookButton />
        </h2>
        <p className="text-white/80 mb-6">You have {hearts} HeartCoins.</p>
        <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold text-black bg-[#FC54AF] hover:brightness-110 transition shadow-[0_0_24px_rgba(252,84,175,0.45)]">
          ENTER THE HEARTVERSE
        </Link>
      </div>
    </div>
  );
}
