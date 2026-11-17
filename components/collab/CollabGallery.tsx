"use client";

import { useEffect, useMemo, useState } from "react";
import ArtistReleaseDetail from "@/components/brand-pitch/ArtistReleaseDetail";
import { BrandAudioProvider, useBrandAudio } from "@/components/brand-pitch/BrandAudioContext";
import MediaViewerModal from "@/components/brand-pitch/MediaViewerModal";
import SkyVideoBackground from "@/components/brand-pitch/SkyVideoBackground";
import { releaseAudioId, releaseAudioSrc, releaseNowPlaying, type ArtistRelease } from "@/components/brand-pitch/artistRelease";

export type CollabProject = {
  id: string;
  title: string;
  coverUrl: string | null;
  audioUrl: string | null;
  lyricsUrl: string | null;
  backgroundUrl: string | null;
  backgroundIsVideo: boolean;
};

type Tab = "collabs" | "released" | "unreleased";
type SelectedItem = {
  id: string;
  release: ArtistRelease;
  coverUrl?: string | null;
  audioUrl?: string;
  lyricsUrl?: string | null;
  backgroundUrl?: string | null;
  backgroundIsVideo?: boolean;
  from: Tab;
};

const TAB_LABELS: Record<Tab, string> = {
  collabs: "Open for Collab",
  released: "Artist Releases",
  unreleased: "Unreleased",
};

function placeholderCover(title: string) {
  const text = title.replace(/[&<>]/g, " ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#21101f"/><stop offset="1" stop-color="#08080b"/></linearGradient></defs><rect width="1000" height="1000" fill="url(#g)"/><circle cx="500" cy="420" r="270" fill="none" stroke="#ff3ea5" stroke-opacity=".25" stroke-width="2"/><text x="500" y="445" fill="#ff3ea5" font-family="Arial,sans-serif" font-size="54" font-weight="700" letter-spacing="8" text-anchor="middle">CHXNDLER</text><text x="500" y="545" fill="#fff" font-family="Arial,sans-serif" font-size="58" font-weight="800" text-anchor="middle">${text.toUpperCase()}</text><text x="500" y="920" fill="#ffffff80" font-family="Arial,sans-serif" font-size="22" letter-spacing="6" text-anchor="middle">COVER ART COMING SOON</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function CollabGallery({
  projects,
  artistReleases,
  unreleasedSongs,
}: {
  projects: CollabProject[];
  artistReleases: ArtistRelease[];
  unreleasedSongs: ArtistRelease[];
}) {
  return (
    <BrandAudioProvider>
      <CollabGalleryContent projects={projects} artistReleases={artistReleases} unreleasedSongs={unreleasedSongs} />
    </BrandAudioProvider>
  );
}

function CollabGalleryContent({
  projects,
  artistReleases,
  unreleasedSongs,
}: {
  projects: CollabProject[];
  artistReleases: ArtistRelease[];
  unreleasedSongs: ArtistRelease[];
}) {
  const [tab, setTab] = useState<Tab>("collabs");
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const audio = useBrandAudio();

  const items = useMemo<SelectedItem[]>(() => {
    if (tab === "collabs") {
      return projects.map((project) => ({
        id: `collab:${project.id}`,
        from: tab,
        coverUrl: project.coverUrl,
        audioUrl: project.audioUrl || undefined,
        lyricsUrl: project.lyricsUrl,
        backgroundUrl: project.backgroundUrl,
        backgroundIsVideo: project.backgroundIsVideo,
        release: {
          slug: `collab-${project.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title: project.title,
          artist: "CHXNDLER × COLLABORATOR",
          coverArt: project.coverUrl || placeholderCover(project.title),
          spotifyUrl: "",
          appleMusicUrl: "",
          youtubeUrl: "",
          videoEmbedUrl: null,
          cardArt: null,
          skyVideoUrl: null,
        },
      }));
    }

    const songs = tab === "released" ? artistReleases : unreleasedSongs;
    return songs.map((release) => ({
      id: `${tab}:${release.slug}`,
      from: tab,
      audioUrl: release.audioUrl,
      release,
    }));
  }, [tab, projects, artistReleases, unreleasedSongs]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        audio.pause();
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, audio]);

  const openItem = (item: SelectedItem) => {
    audio.pause();
    setSelected(item);
    const src = item.audioUrl ?? (item.from === "collabs" || (item.from === "unreleased" && item.release.audioAvailable === false) ? "" : releaseAudioSrc(item.release.slug));
    if (src) audio.play(item.id, src, releaseNowPlaying(item.release));
  };

  const closeDetail = () => {
    audio.pause();
    setSelected(null);
  };

  const modalBackground = selected?.backgroundUrl ? (
    <div className="collab-modal-background">
      {selected.backgroundIsVideo ? (
        <video src={selected.backgroundUrl} autoPlay muted loop playsInline />
      ) : (
        <img src={selected.backgroundUrl} alt="" />
      )}
      <div className="collab-modal-scrim" />
    </div>
  ) : selected?.release.skyVideoUrl ? (
    <SkyVideoBackground url={selected.release.skyVideoUrl} />
  ) : selected ? (
    <div className="collab-modal-background">
      <img src={selected.release.coverArt} alt="" />
      <div className="collab-modal-scrim" />
    </div>
  ) : undefined;

  return (
    <main className="collab-page">
      <header className="collab-heading">
        <a className="collab-wordmark" href="/">CHXNDLER</a>
        <span>COLLABORATIONS</span>
      </header>

      <div className="collab-tabs" role="tablist" aria-label="Music and collaboration categories">
        {(["collabs", "released", "unreleased"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => {
              closeDetail();
              setTab(value);
            }}
          >
            {TAB_LABELS[value]}
          </button>
        ))}
      </div>

      {items.length ? (
        <section className="collab-grid" aria-label={TAB_LABELS[tab]}>
          {items.map((item, index) => (
            <button
              className={`collab-cover collab-cover-${index % 7}${(item.from === "collabs" && !item.audioUrl) || (item.from === "unreleased" && item.release.audioAvailable === false) ? " collab-cover-unavailable" : ""}`}
              key={item.id}
              onClick={() => openItem(item)}
              aria-label={`Open ${item.release.title}`}
            >
              {item.coverUrl === null ? (
                <span className="collab-cover-placeholder">
                  <strong>{item.release.title}</strong>
                  <small>Cover art coming soon</small>
                </span>
              ) : (
                <>
                  <img src={item.release.coverArt} alt={`${item.release.title} cover art`} />
                  {item.audioUrl && <span className="collab-cover-mark" aria-hidden="true">▶</span>}
                </>
              )}
            </button>
          ))}
        </section>
      ) : (
        <div className="collab-empty">
          <p>{tab === "unreleased" ? "NO UNRELEASED TRACKS YET." : tab === "released" ? "NO ARTIST RELEASES YET." : "THE ARTWORK IS ON ITS WAY."}</p>
          <span>{tab === "collabs" ? "Cover art uploaded to the Collabs folder will appear here." : "Tracks appear here as they are added to the CHXNDLER catalog."}</span>
        </div>
      )}

      {selected && (
        <MediaViewerModal
          open
          onClose={closeDetail}
          label={selected.release.title}
          kind={TAB_LABELS[selected.from]}
          accent="#ff3ea5"
          maxWidthClassName="max-w-[76rem]"
          background={modalBackground}
          header={
            <div className="pr-[3rem] -mt-[0.25rem] sm:-mt-[0.5rem] min-h-[2.5rem] flex items-center">
              <button type="button" onClick={closeDetail} className="collab-back">
                <span aria-hidden="true">←</span> Back to {TAB_LABELS[selected.from]}
              </button>
            </div>
          }
        >
          <ArtistReleaseDetail
            key={selected.id}
            release={selected.release}
            audioSrcOverride={selected.from === "collabs" ? selected.audioUrl ?? "" : selected.release.audioAvailable === false ? "" : selected.audioUrl}
            audioIdOverride={selected.id}
            lyricsUrlOverride={selected.from === "collabs" ? selected.lyricsUrl : undefined}
          />
        </MediaViewerModal>
      )}

      <style jsx>{`
        .collab-page{min-height:100vh;background:#08080b;color:#fff;padding:clamp(1rem,3vw,3rem);}
        .collab-heading{display:flex;justify-content:space-between;align-items:center;margin:0 auto 1.1rem;max-width:1600px;color:#ff3ea5;font-size:.7rem;font-weight:800;letter-spacing:.28em}
        .collab-wordmark{color:#fff;text-decoration:none;font-size:.8rem;letter-spacing:.18em}
        .collab-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));max-width:760px;margin:0 auto 1.5rem;padding:.25rem;border-radius:999px;background:rgba(255,255,255,.055)}
        .collab-tabs button{border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.48);padding:.75rem .5rem;font-size:.7rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase;cursor:pointer;transition:background .2s,color .2s}
        .collab-tabs button[aria-selected="true"]{background:rgba(255,255,255,.14);color:#fff}
        .collab-tabs button:focus-visible,.collab-back:focus-visible{outline:2px solid #ff3ea5;outline-offset:2px}
        .collab-grid{max-width:1600px;margin:0 auto;columns:2;column-gap:clamp(.55rem,1vw,1rem)}
        .collab-cover{position:relative;display:block;width:100%;break-inside:avoid;margin:0 0 clamp(.55rem,1vw,1rem);padding:0;border:1px solid rgba(255,255,255,.12);border-radius:3px;overflow:hidden;background:#121216;cursor:pointer;text-align:left}
        .collab-cover img{display:block;width:100%;height:auto;transition:transform .5s cubic-bezier(.2,.7,.2,1),filter .3s}
        .collab-cover-unavailable img{filter:grayscale(1);opacity:.48}
        .collab-cover-unavailable .collab-cover-placeholder{filter:grayscale(1);opacity:.58}
        .collab-cover-unavailable:hover img,.collab-cover-unavailable:focus-visible img{filter:grayscale(1) brightness(.8)}
        .collab-cover-placeholder{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.25rem;padding:1.5rem;background:radial-gradient(circle at 50% 42%,rgba(255,62,165,.13),transparent 52%),linear-gradient(145deg,#20111d,#09090c);color:#fff;text-align:center}
        .collab-cover-placeholder strong{max-width:90%;font-size:clamp(1rem,2vw,1.75rem);line-height:1.08;text-transform:uppercase;letter-spacing:.08em}
        .collab-cover-placeholder small{color:rgba(255,255,255,.45);font-size:.62rem;font-weight:700;letter-spacing:.19em;text-transform:uppercase}
        .collab-cover:hover img,.collab-cover:focus-visible img{transform:scale(1.025);filter:brightness(.82)}
        .collab-cover:focus-visible{outline:2px solid #ff3ea5;outline-offset:3px}
        .collab-cover-mark{position:absolute;right:.8rem;bottom:.8rem;display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:50%;background:rgba(8,8,11,.72);color:#fff;opacity:0;transition:opacity .2s}
        .collab-cover:hover .collab-cover-mark,.collab-cover:focus-visible .collab-cover-mark{opacity:1}
        .collab-empty{min-height:70vh;display:grid;align-content:center;justify-items:center;text-align:center;color:#fff}
        .collab-empty p{font-size:clamp(1.3rem,4vw,2.4rem);font-weight:800;letter-spacing:.08em;margin:0 0 .6rem}
        .collab-empty span{color:#999;font-size:.9rem}
        .collab-back{display:inline-flex;align-items:center;gap:.5rem;border:0;background:none;color:rgba(255,255,255,.72);font-size:.75rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:color .2s}
        .collab-back:hover{color:#fff}
        .collab-modal-background{position:absolute;inset:0;overflow:hidden;display:grid;place-items:center}
        .collab-modal-background img,.collab-modal-background video{width:100%;height:100%;object-fit:cover;filter:blur(4px);transform:scale(1.04);opacity:.68}
        .collab-modal-background img[src]{filter:blur(5px);}
        .collab-modal-scrim{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(16,16,20,.46),rgba(16,16,20,.78) 45%,rgba(16,16,20,.9))}
        @media(min-width:700px){.collab-grid{columns:3}.collab-tabs button{font-size:.8rem}}
        @media(min-width:1100px){.collab-grid{columns:4}}
        @media(max-width:520px){.collab-tabs button{font-size:.57rem;letter-spacing:.08em;padding:.7rem .25rem}}
        @media(prefers-reduced-motion:reduce){.collab-cover img,.collab-tabs button{transition:none}}
      `}</style>
    </main>
  );
}
