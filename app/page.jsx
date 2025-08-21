export default function Page() {
  // --- UPDATE THESE WITH YOUR REAL PROFILES ---
  const socials = [
    { name: "Spotify",   href: "https://open.spotify.com/artist/YOUR_ID" },
    { name: "Instagram", href: "https://instagram.com/YOUR_HANDLE" },
    { name: "TikTok",    href: "https://tiktok.com/@YOUR_HANDLE" },
    { name: "YouTube",   href: "https://youtube.com/@YOUR_HANDLE" },
    // { name: "X / Twitter", href: "https://x.com/YOUR_HANDLE" }, // optional
    // { name: "SoundCloud", href: "https://soundcloud.com/YOUR_HANDLE" }, // optional
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold md:text-6xl">CHXNDLER • Heartverse</h1>
        <p className="mt-3 max-w-prose text-white/80">
          Minimal site is live. We’ll add email sign-up, previews, and more soon.
        </p>

        {/* Social buttons */}
        <nav aria-label="Follow CHXNDLER" className="mt-5 flex flex-wrap gap-3">
          {socials.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium
                         text-white/90 backdrop-blur transition hover:bg-white/10 hover:text-white"
            >
              {s.name} <span aria-hidden>↗</span>
            </a>
          ))}
        </nav>
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
        © {new Date().getFullYear()} CHXNDLER • The Heartverse
      </footer>
    </main>
  );
}
