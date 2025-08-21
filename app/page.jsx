export default function Page() {
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
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold md:text-6xl">CHXNDLER • Heartverse</h1>
        <p className="mt-3 max-w-prose text-white/80">
          Minimal site is live. We’ll add email sign-up, previews, and socials next.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {tracks.map((t, i) => (
          <a
            key={i}
            className="group rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur hover:bg-white/10 transition"
            href={t.url}
            target="_blank"
            rel="noreferrer"
          >
            <div className="text-lg font-semibold">{t.title}</div>
            <div className="mt-2 text-sm text-white/70">Open on Spotify →</div>
          </a>
        ))}
      </section>

      <footer className="mt-16 border-t border-white/10 pt-6 text-center text-white/60">
        © {new Date().getFullYear()} CHXNDLER • The Heartverse
      </footer>
    </main>
  );
}
