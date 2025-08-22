// app/page.jsx
"use client";

import { useEffect, useRef } from "react";

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

  // Track links (simple for now)
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

  // Reusable button (with hover/press animations)
  const Button = ({ href, label, Icon, color }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-flex items-center gap-2 rounded-full border border-white/20
                 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur
                 transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0
                 active:scale-95 hover:bg-white/10 hover:text-white focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-offset-0"
      style={{
        boxShadow: `inset 0 0 0 1px ${color}55, 0 10px 28px -14px ${color}66`,
        '--tw-ring-color': BRAND.yellow,
      }}
      aria-label={label}
    >
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full"
        style={{ color }}
        aria-hidden="true"
      >
        <Icon />
      </span>
      <span>{label}</span>
      <span
        className="ml-1 opacity-70 transition group-hover:opacity-100"
        style={{ color: BRAND.yellow }}
        aria-hidden="true"
      >
        ↗
      </span>

      {/* subtle hover glow */}
      <span
        className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 blur-xl transition group-hover:opacity-40"
        style={{ background: BRAND.yellow + "33" }}
        aria-hidden="true"
      />
    </a>
  );

  // helper to cycle accent colors for track cards
  const accents = [BRAND.pink, BRAND.blue, BRAND.yellow];

  return (
    <div className="relative">
      {/* Starfield sits behind all content */}
      <Starfield colors={[BRAND.pink, BRAND.blue, "#ffffff"]} />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-16">
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

        {/* Tracks (gradient border + hover lift/press) */}
        <section className="grid gap-4 sm:grid-cols-2">
          {tracks.map((t, i) => {
            const a = accents[i % accents.length];
            const b = accents[(i + 1) % accents.length];
            return (
              <div
                key={i}
                className="rounded-2xl p-[1px] transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
                style={{
                  background: `linear-gradient(135deg, ${a}66, ${b}33)`,
                  boxShadow: `0 10px 28px -16px ${a}55`,
                }}
              >
                <a
                  className="block rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition-colors hover:bg-white/10"
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="text-lg font-semibold">{t.title}</div>
                  <div className="mt-2 text-sm text-white/70">
                    Open on Spotify →
                  </div>
                </a>
              </div>
            );
          })}
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-center text-white/60">
          © {new Date().getFullYear()} CHXNDLER
        </footer>
      </main>
    </div>
  );
}

/* ---------------- Starfield (Canvas, no packages) ---------------- */

function Starfield({ colors = ["#ffffff"], count = 180, speed = 0.06 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });

    let w, h, dpr, stars, raf;
    const rand = (min, max) => Math.random() * (max - min) + min;
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];

    function resize() {
      dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    }

    function init() {
      stars = new Array(count).fill(0).map(() => {
        const r = rand(0.6, 1.6);
        return {
          x: rand(0, w),
          y: rand(0, h),
          r,
          vy: rand(speed * 0.5, speed * 2), // gentle drift downward
          vx: rand(-speed, speed) * 0.3,    // slight sideways drift
          color: Math.random() < 0.2 ? pick(colors) : "#ffffff",
          t: rand(0, Math.PI * 2),          // phase for twinkle
          tw: rand(0.002, 0.006),           // twinkle speed
        };
      });
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      for (let s of stars) {
        // update
        s.t += s.tw;
        s.y += s.vy;
        s.x += s.vx;

        // wrap
        if (s.y > h + 5) { s.y = -5; s.x = rand(0, w); }
        if (s.x > w + 5) s.x = -5;
        if (s.x < -5) s.x = w + 5;

        // draw
        const twinkle = 0.5 + 0.5 * Math.sin(s.t); // 0..1
        ctx.globalAlpha = 0.35 + twinkle * 0.65;   // 0.35..1.0
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6 * twinkle;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [colors, count, speed]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
}

/* ---------------- Icons (inline SVG, no packages) ---------------- */

function IconSpotify() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="10" opacity="0.15" />
      <path d="M6 9.5c4-1 8-.8 11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M6.5 12c3.4-.7 6.7-.4 9.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M7 14.3c2.5-.4 5-.2 7 .8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function IconAppleMusic() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M15 4v9.2a3.2 3.2 0 1 1-1.5-2.7V7.5l-5 1.2v6.5a3.2 3.2 0 1 1-1.5-2.7V6.6L15 4z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M14 4v9.2a3.6 3.6 0 1 1-2-3.2V7.2c2 .8 3.8 1.2 6 1.2V11c-2.2 0-4-.5-6-1.3V4z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M13 8h2V6h-2c-1.7 0-3 1.3-3 3v2H8v2h2v5h2v-5h2l.5-2H12V9c0-.6.4-1 1-1z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <rect x="3" y="7" width="18" height="10" rx="3" opacity="0.2" />
      <path d="M10 9.5v5l5-2.5-5-2.5z" />
    </svg>
  );
}
