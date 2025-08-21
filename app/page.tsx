"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ExternalLink, Download, X } from "lucide-react";

type Track = {
  title: string;
  spotifyUrl: string;
  upc?: string;
  isAlbum?: boolean;
  audio?: string;
  cover?: string;
};

/* ---------------------------
   Subscriber Perk: vCard Modal
---------------------------- */
function BusinessCardModal({
  accent,
  onClose,
}: {
  accent: string;
  onClose: () => void;
}) {
  const downloadVCard = () => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:CHXNDLER;;;",
      "FN:CHXNDLER",
      "ORG:Heartverse",
      "TITLE:Artist & Producer",
      "EMAIL;TYPE=INTERNET:info@chxndler-music.com",
      "URL:https://chxndler-music.com",
      "NOTE:Thanks for joining the Heartverse.",
      "END:VCARD",
    ].join("\n");
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CHXNDLER.vcf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[99] flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.97 }}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/20 p-1 text-white/70 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-sm uppercase tracking-widest text-white/60">
          Subscriber Perk
        </div>
        <h3 className="mt-1 text-2xl font-bold">CHXNDLER • Business Card</h3>
        <div
          className="mt-4 rounded-2xl border border-white/10 p-4"
          style={{ background: `${accent}22` }}
        >
          <div className="text-lg font-semibold">CHXNDLER</div>
          <div className="text-white/70">Artist & Producer • Heartverse</div>
          <div className="mt-3 text-sm text-white/80">info@chxndler-music.com</div>
          <div className="text-sm text-white/80">https://chxndler-music.com</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={downloadVCard}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-black"
          >
            <Download className="h-4 w-4" /> Download vCard
          </button>
          <a
            href="mailto:info@chxndler-music.com"
            className="rounded-xl border border-white/30 px-4 py-2"
          >
            Email me
          </a>
          <a
            href="https://open.spotify.com/artist"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/30 px-4 py-2"
          >
            Spotify
          </a>
        </div>
        <p className="mt-3 text-xs text-white/60">
          Tip: On iPhone/Android, opening the .vcf adds me to Contacts.
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ---------------------------
   Home Page
---------------------------- */
export default function Page() {
  // 1) Your tracks
  const tracks = React.useMemo<Track[]>(
    () => [
      {
        title: "GAME BOY HEART (ゲームボーイの心)",
        spotifyUrl: "https://open.spotify.com/track/5VypE0QkaggJemaNG6sMsF",
        upc: "199513634854",
      },
      {
        title: "KID FOREVER (永遠の子供)",
        spotifyUrl: "https://open.spotify.com/track/5X27jqHBvMBsDvvFixeZdN",
        upc: "199513621168",
      },
      {
        title: "BRAIN FREEZE",
        spotifyUrl: "https://open.spotify.com/track/5ou8AyA71rLFK6Ysxr2CpT",
        upc: "199516264522",
      },
      {
        title: "WE’RE JUST FRIENDS (mickey jas Remix)",
        spotifyUrl: "https://open.spotify.com/track/28wYsy2LrfVUT5glavy7hJ",
        upc: "199095978704",
      },
      {
        title: "BE MY BEE",
        spotifyUrl: "https://open.spotify.com/track/12iLygYksfcZ3nv6NkrnEr",
        upc: "199097084779",
      },
      {
        title: "WE’RE JUST FRIENDS",
        spotifyUrl: "https://open.spotify.com/track/2IffMAupdw2alpsISKFs8y",
        upc: "197508953065",
      },
      {
        title: "PARIS",
        spotifyUrl: "https://open.spotify.com/track/2luPTqZK9w5fJ30T4rLZut",
        upc: "198877034423",
      },
      {
        title: "POKÉMON",
        spotifyUrl: "https://open.spotify.com/track/7uzO8MyTy8402703kP2Xuk",
        upc: "199338892811",
      },
      {
        title: "ALIEN (House Party)",
        spotifyUrl: "https://open.spotify.com/track/0b5y0gHMf3wLYX69B8S6g4",
        upc: "198668852113",
      },
      {
        title: "WE’RE JUST FRIENDS (DMVRCO Remix)",
        spotifyUrl: "https://open.spotify.com/track/1WfJUtDFUiz0rUdlGfLQBA",
        upc: "197727859407",
      },
      {
        title: "BABY",
        spotifyUrl: "https://open.spotify.com/track/3UEVjChARWDbY4ruOIbIl3",
        upc: "199517872245",
      },
      {
        title: "OCEAN GIRL",
        spotifyUrl:
          "https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ",
        upc: "199509838990",
        isAlbum: true,
      },
    ],
    []
  );

  // 2) Per-song background themes
  const themes = React.useMemo(
    () => [
      {
        accent: "#FC54AF",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 20% 0%, rgba(252,84,175,0.30), transparent 55%), linear-gradient(180deg, #0b0014 0%, #1a0032 50%, #070414 100%)",
      },
      {
        accent: "#38B6FF",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 80% -10%, rgba(56,182,255,0.25), transparent 55%), linear-gradient(180deg, #06111f 0%, #0a1b2e 50%, #02070f 100%)",
      },
      {
        accent: "#38B6FF",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 50% -10%, rgba(56,182,255,0.20), transparent 55%), linear-gradient(180deg, #04121a 0%, #08202b 50%, #02090f 100%)",
      },
      {
        accent: "#FC54AF",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 15% 10%, rgba(252,84,175,0.25), transparent 55%), linear-gradient(180deg, #1a0020 0%, #2a0030 50%, #0a0010 100%)",
      },
      {
        accent: "#F2EF1D",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 70% 0%, rgba(242,239,29,0.25), transparent 55%), linear-gradient(180deg, #200e01 0%, #2a1804 50%, #120800 100%)",
      },
      {
        accent: "#FC54AF",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 25% -10%, rgba(252,84,175,0.22), transparent 55%), linear-gradient(180deg, #120014 0%, #1a0120 50%, #070414 100%)",
      },
      {
        accent: "#38B6FF",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 30% 0%, rgba(56,182,255,0.22), transparent 55%), linear-gradient(180deg, #0b0b1e 0%, #0d1230 50%, #050812 100%)",
      },
      {
        accent: "#F2EF1D",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 80% -10%, rgba(242,239,29,0.20), transparent 55%), linear-gradient(180deg, #140e02 0%, #1a1305 50%, #0a0802 100%)",
      },
      {
        accent: "#b8ff72",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 60% 0%, rgba(184,255,114,0.20), transparent 55%), linear-gradient(180deg, #15001a 0%, #240035 50%, #0a0014 100%)",
      },
      {
        accent: "#a78bfa",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 10% 0%, rgba(167,139,250,0.20), transparent 55%), linear-gradient(180deg, #0e0020 0%, #180033 50%, #070414 100%)",
      },
      {
        accent: "#FFC0CB",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 65% -10%, rgba(255,192,203,0.25), transparent 55%), linear-gradient(180deg, #1f0019 0%, #2b0030 50%, #0d0010 100%)",
      },
      {
        accent: "#38B6FF",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        gradient:
          "radial-gradient(900px 600px at 75% -10%, rgba(56,182,255,0.30), transparent 55%), linear-gradient(180deg, #031b2e 0%, #051a35 50%, #000814 100%)",
      },
    ],
    []
  );

  // 3) Player & form state
  const [current, setCurrent] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [nlEmail, setNlEmail] = React.useState("");
  const [nlStatus, setNlStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [showCard, setShowCard] = React.useState(false);

  // Replace with your real Formspree ID (e.g., "xyzzabcd")
  const FORMSPREE_ID = "https://formspree.io/f/xgvzjbvd";

  // Optional: map titles -> short MP3 previews in /public/previews
  const previews = React.useMemo<Record<string, string>>(
    () => ({
      // "GAME BOY HEART (ゲームボーイの心)": "/previews/game-boy-heart.mp3",
      // "KID FOREVER (永遠の子供)": "/previews/kid-forever.mp3",
    }),
    []
  );

  // Try to autoplay a local preview when the track changes
  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const src = previews[tracks[current].title];
    if (src) {
      a.src = src;
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }, [current, previews, tracks]);

  // Allow the map to set the current track
  React.useEffect(() => {
    const handler = (e: any) => {
      if (typeof e.detail === "number") setCurrent(e.detail);
    };
    window.addEventListener("SET_TRACK_INDEX", handler as any);
    return () => window.removeEventListener("SET_TRACK_INDEX", handler as any);
  }, []);

  async function submitNewsletter(e: React.FormEvent) {
    e.preventDefault();
    if (!nlEmail) return;
    setNlStatus("loading");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: nlEmail, source: "chxndler-music.com" }),
      });
      if (res.ok) {
        setNlStatus("success");
        setNlEmail("");
        setShowCard(true);
      } else {
        setNlStatus("error");
      }
    } catch {
      setNlStatus("error");
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      {/* Background crossfade per-song */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: `url(${themes[current].image})` }}
          />
          <div
            className="absolute inset-0"
            style={{ background: themes[current].gradient }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: `inset 0 0 220px ${themes[current].accent}40` }}
          />
        </motion.div>
      </AnimatePresence>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold md:text-6xl">
            CHXNDLER • Heartverse
          </h1>
          <p className="mt-2 max-w-prose text-white/80">
            Fly your ship to planets (one per song). Docking switches the
            current track and the galaxy theme. Tap a planet or use WASD /
            Arrow keys.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="md:col-span-3">
            <HeartverseMap items={tracks} themes={themes} />
          </div>
          <div className="md:col-span-2">
            <Player
              title={tracks[current].title}
              upc={tracks[current].upc}
              spotifyUrl={tracks[current].spotifyUrl}
              accent={themes[current].accent}
              audioRef={audioRef}
              playing={playing}
              setPlaying={setPlaying}
            />
          </div>
        </section>

        {/* Mailing list: unlocks vCard */}
        <section className="mt-10 mx-auto max-w-3xl">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-2xl font-semibold">Join the mailing list</h3>
            <p className="mt-2 max-w-prose text-white/70">
              New drops, show announcements, and Heartverse updates. No spam.
              Subscribing unlocks my digital business card.
            </p>
            <form
              onSubmit={submitNewsletter}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={nlEmail}
                onChange={(e) => setNlEmail(e.target.value)}
                className="flex-1 rounded-xl border border-white/20 bg-black/30 p-3 outline-none placeholder:text-white/40"
                placeholder="your@email.com"
              />
              <button
                disabled={nlStatus === "loading"}
                className="rounded-2xl bg-white px-5 py-3 text-black disabled:opacity-60"
              >
                {nlStatus === "loading" ? "Sending…" : "Subscribe"}
              </button>
            </form>
            {nlStatus === "success" && (
              <div className="mt-3 text-sm text-emerald-300">
                Check your inbox to confirm — and grab the card!
              </div>
            )}
            {nlStatus === "error" && (
              <div className="mt-3 text-sm text-rose-300">
                Something went wrong — try again or DM me.
              </div>
            )}
            {/* Honeypot anti-spam */}
            <input
              type="text"
              name="_gotcha"
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-white/60">
        © {new Date().getFullYear()} CHXNDLER • The Heartverse
      </footer>

      <AnimatePresence>
        {showCard && (
          <BusinessCardModal
            accent={themes[current].accent}
            onClose={() => setShowCard(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------
   Heartverse Map (spaceship)
---------------------------- */
function HeartverseMap({ items, themes }: { items: Track[]; themes: any[] }) {
  const [ship, setShip] = React.useState({ x: 50, y: 50 });
  const keys = React.useRef<Record<string, boolean>>({});

  // planet positions
  const positions = React.useMemo(() => {
    const N = items.length;
    return items.map((_, i) => {
      const ring = i % 3;
      const radius = 18 + ring * 10;
      const theta = (i / N) * Math.PI * 2 + ring * 0.6;
      const x = 50 + Math.cos(theta) * radius;
      const y = 50 + Math.sin(theta) * radius * 0.8;
      return { x, y };
    });
  }, [items.length]);

  // keyboard controls
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const id = setInterval(() => {
      const step = 1.2;
      setShip((p) => {
        let { x, y } = p;
        if (keys.current["ArrowLeft"] || keys.current["a"] || keys.current["A"])
          x -= step;
        if (
          keys.current["ArrowRight"] ||
          keys.current["d"] ||
          keys.current["D"]
        )
          x += step;
        if (keys.current["ArrowUp"] || keys.current["w"] || keys.current["W"])
          y -= step;
        if (
          keys.current["ArrowDown"] ||
          keys.current["s"] ||
          keys.current["S"]
        )
          y += step;
        x = Math.max(4, Math.min(96, x));
        y = Math.max(4, Math.min(96, y));
        return { x, y };
      });
    }, 30);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // docking detection -> set track
  React.useEffect(() => {
    const threshold = 6; // % distance
    let nearest = -1;
    let best = 999;
    positions.forEach((p, i) => {
      const dx = p.x - ship.x;
      const dy = p.y - ship.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    const inDock = best <= threshold ? nearest : null;
    if (inDock !== null) {
      window.dispatchEvent(new CustomEvent("SET_TRACK_INDEX", { detail: inDock }));
    }
  }, [ship, positions]);

  const jumpTo = (i: number) => {
    const p = positions[i];
    setShip({ x: p.x, y: p.y });
    window.dispatchEvent(new CustomEvent("SET_TRACK_INDEX", { detail: i }));
  };

  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
      {/* planets */}
      {items.map((item, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${positions[i].x}%`,
            top: `${positions[i].y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <button onClick={() => jumpTo(i)} className="group relative">
            <div
              className="absolute -inset-4 rounded-full opacity-40 blur-xl"
              style={{
                background: (themes[i % themes.length]?.accent || "#fff") + "55",
              }}
            />
            <div
              className="h-8 w-8 rounded-full border border-white/30 bg-black/50 backdrop-blur-md"
              style={{
                boxShadow: `0 0 12px ${
                  (themes[i % themes.length]?.accent || "#fff") + "60"
                }`,
              }}
            />
          </button>
          <div className="mt-2 w-max -translate-x-1/2 text-xs text-white/80">
            {item.title}
          </div>
        </div>
      ))}

      {/* ship */}
      <div
        className="absolute"
        style={{
          left: `${ship.x}%`,
          top: `${ship.y}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="relative">
          <div className="absolute -inset-6 rounded-full bg-white/30 opacity-30 blur-xl" />
          <div className="h-6 w-10 rotate-45 rounded-lg border border-white/40 bg-white/80 mix-blend-screen" />
        </div>
      </div>

      <div className="absolute bottom-3 right-4 text-xs text-white/60">
        WASD / Arrows to fly • Click a planet to jump
      </div>
    </div>
  );
}

/* ---------------------------
   Player
---------------------------- */
function Player({
  title,
  upc,
  spotifyUrl,
  accent,
  audioRef,
  playing,
  setPlaying,
}: {
  title: string;
  upc?: string;
  spotifyUrl?: string;
  accent: string;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  playing: boolean;
  setPlaying: (v: boolean) => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 flex-shrink-0 rounded-2xl"
          style={{ background: `${accent}44` }}
        />
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-white/60">
            {playing ? "Now Playing" : "Ready to Stream"}
          </div>
          <div className="truncate text-lg font-semibold">{title}</div>
          {upc && <div className="text-xs text-white/50">UPC {upc}</div>}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-3">
          <button
            className="rounded-2xl bg-white px-4 py-2 text-black"
            onClick={() => {
              const a = audioRef.current;
              if (!a) return;
              if (a.paused) {
                a.play().catch(() => {});
                setPlaying(true);
              } else {
                a.pause();
                setPlaying(false);
              }
            }}
          >
            {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {playing ? "Pause" : "Play"}
          </button>
          <div className="h-2 flex-1 rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: playing ? "60%" : "20%", background: accent }}
            />
          </div>
        </div>
        <audio ref={audioRef as any} onEnded={() => setPlaying(false)} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        {spotifyUrl && (
          <a
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/30 px-3 py-2 text-center"
            href={spotifyUrl}
          >
            Open on Spotify <ExternalLink className="ml-1 inline h-4 w-4" />
          </a>
        )}
        <button
          className="rounded-xl border border-white/30 px-3 py-2 text-center"
          onClick={() => {
            const a = audioRef.current;
            if (a) {
              a.pause();
              setPlaying(false);
            }
          }}
        >
          Stop Preview
        </button>
      </div>
    </div>
  );
}
