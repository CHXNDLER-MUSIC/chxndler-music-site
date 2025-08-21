// app/page.jsx
export default function Page() {
  // Brand colors
  const BRAND = {
    yellow: "#F2EF1D",
    pink:   "#FC54AF",
    blue:   "#38B6FF",
  };

  // --- LISTEN (streaming) ---
  const listen = [
    {
      name: "Spotify",
      href: "https://open.spotify.com/artist/6O2eoUA8ZWY0lwjsa3E3Yo?si=Qfg-xrMVSEu6wTvuJqs9eQ",
      color: BRAND.blue,
      icon: IconSpotify,
    },
    {
      name: "Apple Music",
      href: "https://music.apple.com/us/artist/chxndler/1660901437",
      color: BRAND.blue,
      icon: IconAppleMusic,
    },
  ];

  // --- FOLLOW (social) ---
  const follow = [
    { name: "Instagram", href: "https://www.instagram.com/chxndler_music/", color: BRAND.pink, icon: IconInstagram },
    { name: "TikTok",    href: "https://www.tiktok.com/@chxndler_music",    color: BRAND.pink, icon: IconTikTok },
    { name: "Facebook",  href: "https://www.facebook.com/CHXNDLEROfficial", color: BRAND.pink, icon: IconFacebook },
    { name: "YouTube",   href: "https://www.youtube.com/@chxndler_music",   color: BRAND.pink, icon: IconYouTube },
  ];

  const tracks = [
    { title: "GAME BOY HEART (ゲームボーイの心)", url: "https://open.spotify.com/track/5VypE0QkaggJemaNG6sMsF" },
    { title: "KID FOREVER (永遠の子供)",          url: "https://open.spotify.com/track/5X27jqHBvMBsDvvFixeZdN" },
    { title: "BRAIN FREEZE",                      url: "https://open.spotify.com/track/5ou8AyA71rLFK6Ysxr2CpT" },
    { title: "WE’RE JUST FRIENDS (mickey jas Remix)", url: "https://open.spotify.com/track/28wYsy2LrfVUT5glavy7hJ" },
    { title: "BE MY BEE",                         url: "https://open.spotify.com/track/12iLygYksfcZ3nv6NkrnEr" },
    { title: "WE’RE JUST FRIENDS",                url: "https://open.spotify.com/track/2IffMAupdw2alpsISKFs8y" },
    { title: "PARIS",                             url: "https://open.spotify.com/track/2luPTqZK9w5fJ30T4rLZut" },
    { title: "POKÉMON",                           url: "https://open.spotify.com/track/7uzO8MyTy8402703kP2Xuk" },
    { title: "ALIEN (House Party)",               url: "https://open.spotify.com/track/0b5y0gHMf3wLYX69B8S6g4" },
    { title: "WE’RE JUST FRIENDS (DMVRCO Remix)", url: "https://open.spotify.com/track/1WfJUtDFUiz0rUdlGfLQBA" },
    { title: "BABY",                              url: "https://open.spotify.com/track/3UEVjChARWDbY4ruOIbIl3" },
    { title: "OCEAN GIRL",                        url: "https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ" },
  ];

  // Reusable button component
  const Button = ({ href, label, Icon, color }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-flex items-center gap-2 rounded-full border border-white/20
                 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur
                 transition hover:bg-white/10 hover:text-white"
      style={{
        boxShadow: `inset 0 0 0 1px ${color}55, 0 0 18px ${color}26`,
      }}
    >
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full"
        style={{ color }}
        aria-hidden
      >
        <Icon />
      </span>
      <span>{label}</span>
      <span
        className="ml-1 opacity-70 transition group-hover:opacity-100"
        style={{ color: BRAND.yellow }}
        aria-hidden
      >
        ↗
      </span>
      {/* hover glow */}
      <span
        className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 blur-xl transition group-hover:opacity-40"
        style={{ background: BRAND.yellow + "33" }}
        aria-hidden
      />
    </a>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold md:text-6xl">CHXNDLER</h1>

        {/* LISTEN */}
        <div className="mt-6">
          <h2 className="mb-2 text-sm uppercase tracking-widest text-white/60">Listen</h2>
          <nav className="flex flex-wrap gap-3">
            {listen.map((s) => (
              <Button key={s.name} href={s.href} label={s.name} Icon={s.icon} color={s.color} />
            ))}
          </nav>
        </div>

        {/* FOLLOW */}
        <div className="mt-6">
          <h2 className="mb-2 text-sm uppercase tracking-widest text-white/60">Follow Me</h2>
          <nav className="flex flex-wrap gap-3">
            {follow.map((s) => (
              <Button key={s.name} href={s.href} label={s.name} Icon={s.icon} color={s.color} />
            ))}
          </nav>
        </div>
      </header>

      {/* Tracks grid */}
      <section className="grid gap-4 sm:grid-cols-2">
        {tracks.map((t, i) => (
          <a
            key={i}
            className="group rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur
                       transition hover:bg-white/10"
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="text-lg font-semibold">{t.title}</div>
            <div className="mt-2 text-sm text-white/70 group-hover:text-white/90">
              Open on Spotify →
            </div>
          </a>
        ))}
      </section>

      <footer className="mt-16 border-t border-white/10 pt-6 text-center text-white/60">
        © {new Date().getFullYear()} CHXNDLER
      </footer>
    </main>
  );
}

/* ---------------- Icons (inline SVG, no packages) ---------------- */

function IconSpotify() {
  // circle with three curved lines (simple, recognizable)
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <path d="M6 9.5c4-1 8-.8 11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M6.5 12c3.4-.7 6.7-.4 9.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M7 14.3c2.5-.4 5-.2 7 .8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function IconAppleMusic() {
  // beamed music note
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M15 4v9.2a3.2 3.2 0 1 1-1.5-2.7V7.5l-5 1.2v6.5a3.2 3.2 0 1 1-1.5-2.7V6.6L15 4z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTikTok() {
  // simple musical note with slight offset tail
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M14 4v9.2a3.6 3.6 0 1 1-2-3.2V7.2c2 .8 3.8 1.2 6 1.2V11c-2.2 0-4-.5-6-1.3V4z" />
    </svg>
  );
}

function IconFacebook() {
  // simple 'f' in a circle
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="10" />
      <path d="M13 8h2V6h-2c-1.7 0-3 1.3-3 3v2H8v2h2v5h2v-5h2l.5-2H12V9c0-.6.4-1 1-1z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconYouTube() {
  // play triangle inside rounded rectangle
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <rect x="3" y="7" width="18" height="10" rx="3" opacity="0.2" />
      <path d="M10 9.5v5l5-2.5-5-2.5z" />
    </svg>
  );
}
