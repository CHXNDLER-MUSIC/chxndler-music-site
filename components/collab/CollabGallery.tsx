"use client";

import { useEffect, useMemo, useState } from "react";
import ArtistReleaseDetail from "@/components/brand-pitch/ArtistReleaseDetail";
import { BrandAudioProvider, useBrandAudio } from "@/components/brand-pitch/BrandAudioContext";
import MediaViewerModal from "@/components/brand-pitch/MediaViewerModal";
import SkyVideoBackground from "@/components/brand-pitch/SkyVideoBackground";
import { releaseAudioSrc, releaseNowPlaying, type ArtistRelease } from "@/components/brand-pitch/artistRelease";
import { COLLAB_CATALOG_FILTERS, filterCollabCatalog } from "@/lib/collabCatalog.mjs";
import { playCollabClickSound } from "@/components/collab/playCollabClickSound";
import CollabRequestForm from "@/components/collab/CollabRequestForm";

type Tab = "collabs" | "video" | "complete";
type SelectedItem = {
  id: string;
  release: ArtistRelease;
  coverUrl?: string | null;
  audioUrl?: string;
  instrumentalUrl?: string | null;
  lyricsUrl?: string | null;
  meaningUrl?: string | null;
  backgroundUrl?: string | null;
  backgroundIsVideo?: boolean;
  from: Tab;
};

const TAB_LABELS: Record<Tab, string> = { collabs: "Open for Collab", video: "Video Needed", complete: "Complete" };

function placeholderCover(title: string) {
  const text = title.replace(/[&<>]/g, " ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#21101f"/><stop offset="1" stop-color="#08080b"/></linearGradient></defs><rect width="1000" height="1000" fill="url(#g)"/><circle cx="500" cy="420" r="270" fill="none" stroke="#ff3ea5" stroke-opacity=".25" stroke-width="2"/><text x="500" y="445" fill="#ff3ea5" font-family="Arial,sans-serif" font-size="54" font-weight="700" letter-spacing="8" text-anchor="middle">CHXNDLER</text><text x="500" y="545" fill="#fff" font-family="Arial,sans-serif" font-size="58" font-weight="800" text-anchor="middle">${text.toUpperCase()}</text><text x="500" y="920" fill="#ffffff80" font-family="Arial,sans-serif" font-size="22" letter-spacing="6" text-anchor="middle">COVER ART COMING SOON</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function CollabGallery({
  artistReleases,
  unreleasedSongs,
  invitedSongSlug = null,
  defaultView = "collabs",
  invitedEmail = "",
  musicVideos,
  invitedDisplayName = "",
  canViewFeatures = true,
}: {
  artistReleases: ArtistRelease[];
  unreleasedSongs: ArtistRelease[];
  invitedSongSlug?: string | null;
  defaultView?: "collabs" | "video";
  invitedEmail?: string;
  musicVideos: Array<{ id: string; song_id: string; public_concept: string; public_status: string; songs?: { title: string; slug: string } }>;
  invitedDisplayName?: string;
  canViewFeatures?: boolean;
}) {
  return (
    <BrandAudioProvider>
      <CollabGalleryContent artistReleases={artistReleases} unreleasedSongs={unreleasedSongs} invitedSongSlug={invitedSongSlug} defaultView={defaultView} invitedEmail={invitedEmail} musicVideos={musicVideos} invitedDisplayName={invitedDisplayName} canViewFeatures={canViewFeatures} />
    </BrandAudioProvider>
  );
}

function CollabGalleryContent({
  artistReleases,
  unreleasedSongs,
  invitedSongSlug,
  defaultView,
  invitedEmail,
  musicVideos,
  invitedDisplayName,
  canViewFeatures,
}: {
  artistReleases: ArtistRelease[];
  unreleasedSongs: ArtistRelease[];
  invitedSongSlug: string | null;
  defaultView: "collabs" | "video";
  invitedEmail: string;
  musicVideos: Array<{ id: string; song_id: string; public_concept: string; public_status: string; songs?: { title: string; slug: string } }>;
  invitedDisplayName: string;
  canViewFeatures: boolean;
}) {
  const [category, setCategory] = useState<"features" | "videos">(canViewFeatures && defaultView !== "video" ? "features" : "videos");
  const [tab, setTab] = useState<Tab>(defaultView);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [requestProject, setRequestProject] = useState<string | null>(null);
  const audio = useBrandAudio();

  const items = useMemo<SelectedItem[]>(() => {
    if (!canViewFeatures || category !== "features") return [];
    const catalog = [...artistReleases, ...unreleasedSongs].filter((song, index, rows) => rows.findIndex(other => other.databaseId === song.databaseId) === index);
    const songs = filterCollabCatalog(catalog, tab);
    return songs.map((release) => ({
      id: `${tab}:${release.slug}`,
      from: tab,
      audioUrl: release.audioUrl,
      release,
    }));
  }, [tab, artistReleases, unreleasedSongs, canViewFeatures, category]);

  useEffect(() => {
    if (!invitedSongSlug) return;
    const release = [...artistReleases, ...unreleasedSongs].find(song => song.slug === invitedSongSlug);
    if (release) setSelected({ id: `invite:${release.slug}`, from: "collabs", release, audioUrl: release.audioUrl });
  }, [invitedSongSlug, artistReleases, unreleasedSongs]);

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
    playCollabClickSound();
    audio.pause();
    setSelected(item);
    const src = item.audioUrl ?? (item.release.audioAvailable === false ? "" : releaseAudioSrc(item.release.slug));
    if (src) audio.play(item.id, src, releaseNowPlaying(item.release));
  };

  const closeDetail = () => {
    playCollabClickSound();
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
        <div className="collab-heading-actions">
          <span>COLLABORATIONS</span>
        </div>
      </header>

      <div className="collab-category-tabs" role="tablist" aria-label="Collaboration categories">
        {canViewFeatures && <button type="button" role="tab" aria-selected={category === "features"} onClick={() => setCategory("features")}>Music Features</button>}
        <button type="button" role="tab" aria-selected={category === "videos"} onClick={() => setCategory("videos")}>Music Videos</button>
      </div>
      {category === "features" && <div className="collab-tabs" role="tablist" aria-label="Music feature filters">
        {COLLAB_CATALOG_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            data-tab={value}
            aria-selected={tab === value}
            onClick={() => {
              playCollabClickSound();
              closeDetail();
              setTab(value as Tab);
            }}
          >
            {TAB_LABELS[value]}
          </button>
        ))}
      </div>}

      {category === "videos" && (musicVideos.length > 0 ? <section className="collab-video-opportunities" aria-label="Music video opportunities">
        <div><p className="collab-video-kicker">MUSIC VIDEOS</p><h2>Bring a song to life.</h2></div>
        <div className="collab-video-grid">{musicVideos.map(project => {
          const song = [...artistReleases, ...unreleasedSongs].find(item => item.slug === project.songs?.slug);
          return <article className="collab-video-card" key={project.id}>
            <img src={song?.coverArt || placeholderCover(project.songs?.title || "Music video")} alt={`${project.songs?.title || "Song"} artwork`} />
            <div><span className="collab-video-status">{project.public_status}</span><h3>{project.songs?.title || "CHXNDLER song"}</h3><p>{project.public_concept}</p>
              {song?.audioUrl && <audio controls preload="none" src={song.audioUrl} aria-label={`Preview ${song.title}`} />}
              {song && <button type="button" onClick={() => setRequestProject(project.id)}>Request to collaborate ↗</button>}
            </div>
          </article>;
        })}</div>
      </section> : <div className="collab-empty"><p>NO MUSIC VIDEO PROJECTS YET.</p><span>Check back soon for new video opportunities.</span></div>)}

      {category === "features" && (items.length ? (
        <section className="collab-grid" aria-label={TAB_LABELS[tab]}>
          {items.map((item, index) => (
            <button
              className={`collab-cover collab-cover-${index % 7}${item.release.audioAvailable === false ? " collab-cover-unavailable" : ""}`}
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
                  <img
                    src={item.release.coverArt}
                    alt={`${item.release.title} cover art`}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = placeholderCover(item.release.title);
                    }}
                  />
                  {item.audioUrl && <span className="collab-cover-mark" aria-hidden="true">▶</span>}
                </>
              )}
              {item.release.releaseDate && <span className="collab-release-date">Release date · {new Date(`${item.release.releaseDate}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>}
              {!!item.release.collaborationOpportunities?.length && <span className="collab-opportunity-badges">{item.release.collaborationOpportunities.map(value => <span key={value} data-opportunity={value}>{value === "feature" ? "Open for Feature" : value === "video" ? "Video Needed" : "Open for Remix"}</span>)}</span>}
            </button>
          ))}
        </section>
      ) : (
        <div className="collab-empty">
          <p>NO SONGS IN THIS VIEW YET.</p>
        <span>{tab === "collabs" ? "No songs are currently marked Ready for Collab." : tab === "video" ? "No collaboration-ready songs currently need a music video." : "No final or released songs yet."}</span>
        </div>
      ))}

      {category === "features" && tab === "collabs" && <div className="collab-extra-cta"><a href={`mailto:info@chxndler-music.com?subject=${encodeURIComponent("Have something else in mind?")}`}>Have something else in mind? <span aria-hidden="true">↗</span></a></div>}

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
            audioSrcOverride={selected.release.audioAvailable === false ? "" : selected.audioUrl}
            instrumentalSrcOverride={null}
            audioIdOverride={selected.id}
            lyricsUrlOverride={undefined}
            showLyricsSection={false}
            showInstrumentalControl={false}
            meaningUrlOverride={null}
            showCollabRequest={selected.release.readyForCollab === true}
            showStreamingLinks={selected.release.isReleased === true}
            invitedName={invitedDisplayName}
            invitedEmail={invitedEmail}
          />
        </MediaViewerModal>
      )}

      {requestProject && (() => {
        const project = musicVideos.find(item => item.id === requestProject);
        const song = project && [...artistReleases, ...unreleasedSongs].find(item => item.databaseId === project.song_id);
        return project && song ? <CollabRequestForm songId={project.song_id} title={song.title} artwork={song.coverArt} invitedName={invitedDisplayName} invitedEmail={invitedEmail} initialContributionType="Music Video" videoProjectId={project.id} close={() => setRequestProject(null)} /> : null;
      })()}

      <style jsx>{`
        .collab-page{min-height:100vh;background:#08080b;color:#fff;padding:clamp(1rem,3vw,3rem);}
        .collab-heading{display:flex;justify-content:space-between;align-items:center;margin:0 auto 1.1rem;max-width:1600px;color:#ff3ea5;font-size:.7rem;font-weight:800;letter-spacing:.28em}
        .collab-heading-actions{display:flex;align-items:center;gap:1rem}
        .collab-extra-cta{max-width:1600px;margin:1.5rem auto 0;display:flex;justify-content:center}
        .collab-extra-cta a{display:inline-flex;align-items:center;gap:.4rem;border:1px solid rgba(255,62,165,.55);border-radius:999px;padding:.7rem 1rem;color:#fff;text-decoration:none;font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;transition:background .2s,border-color .2s}
        .collab-extra-cta a:hover{background:rgba(255,62,165,.12);border-color:#ff3ea5}
        .collab-extra-cta a:focus-visible{outline:2px solid #ff3ea5;outline-offset:3px}
        .collab-wordmark{color:#fff;text-decoration:none;font-size:.8rem;letter-spacing:.18em}
        .collab-category-tabs{display:flex;gap:.5rem;max-width:900px;margin:0 auto 1rem;padding:.25rem;border:1px solid rgba(255,255,255,.09);border-radius:999px;background:rgba(255,255,255,.035)}
        .collab-category-tabs button{flex:1;border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.58);padding:.8rem;font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
        .collab-category-tabs button[aria-selected="true"]{background:rgba(255,62,165,.14);color:#ff62b0;box-shadow:inset 0 0 0 1px rgba(255,62,165,.38)}
        .collab-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));max-width:900px;margin:0 auto 1.5rem;padding:.25rem;border-radius:999px;background:rgba(255,255,255,.055)}
        .collab-tabs button{border:0;border-radius:999px;background:transparent;color:var(--tab-color);opacity:.7;padding:.75rem .5rem;font-size:.7rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase;cursor:pointer;transition:background .2s,color .2s,opacity .2s}
        .collab-tabs button[data-tab="collabs"]{--tab-color:#ff3ea5}
        .collab-tabs button[data-tab="video"]{--tab-color:#69e0c0}
        .collab-tabs button[data-tab="complete"]{--tab-color:#83c9ff}
        .collab-tabs button[aria-selected="true"]{background:color-mix(in srgb,var(--tab-color) 23%,#17171a);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--tab-color) 38%,transparent);color:var(--tab-color);opacity:1}
        .collab-tabs button:hover:not([aria-selected="true"]){opacity:1}
        .collab-video-opportunities{max-width:1600px;margin:0 auto 2rem;padding:1.2rem;border:1px solid rgba(255,62,165,.22);background:linear-gradient(120deg,rgba(255,62,165,.08),rgba(255,255,255,.02))}
        .collab-video-kicker{margin:0;color:#ff3ea5;font-size:.62rem;font-weight:900;letter-spacing:.22em}.collab-video-opportunities h2{margin:.35rem 0 1rem;font-size:1.35rem;font-weight:900}
        .collab-video-grid{display:grid;gap:.8rem}.collab-video-card{display:grid;grid-template-columns:6rem 1fr;gap:1rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.25);padding:.75rem}.collab-video-card>img{width:6rem;aspect-ratio:1;object-fit:cover}.collab-video-card h3{margin:.35rem 0;font-size:1rem;font-weight:800}.collab-video-card p{margin:.4rem 0;color:rgba(255,255,255,.65);font-size:.85rem;white-space:pre-wrap}.collab-video-status{color:#ff77bb;font-size:.58rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.collab-video-card audio{display:block;width:min(100%,22rem);height:2rem;margin:.7rem 0}.collab-video-card button{display:inline-block;border:1px solid rgba(255,62,165,.55);border-radius:999px;background:transparent;padding:.55rem .8rem;color:#ff3ea5;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
        .collab-tabs button:focus-visible,.collab-back:focus-visible{outline:2px solid #ff3ea5;outline-offset:2px}
        .collab-grid{max-width:1600px;margin:0 auto;columns:2;column-gap:clamp(.55rem,1vw,1rem)}
        .collab-cover{position:relative;display:block;width:100%;break-inside:avoid;margin:0 0 clamp(.55rem,1vw,1rem);padding:0;border:1px solid rgba(255,255,255,.12);border-radius:3px;overflow:hidden;background:#121216;cursor:pointer;text-align:left}
        .collab-release-date{position:absolute;right:.65rem;top:.65rem;padding:.45rem .6rem;border:1px solid rgba(255,62,165,.35);border-radius:999px;background:rgba(8,8,11,.82);color:#ff9bcc;font-size:.62rem;font-weight:800;letter-spacing:.04em;backdrop-filter:blur(8px)}
        .collab-opportunity-badges{position:absolute;left:.6rem;right:.6rem;bottom:.6rem;display:flex;flex-wrap:wrap;gap:.3rem;pointer-events:none}.collab-opportunity-badges span{border-radius:999px;padding:.3rem .5rem;background:rgba(8,8,11,.78);font-size:.56rem;font-weight:800;letter-spacing:.025em;backdrop-filter:blur(6px)}.collab-opportunity-badges [data-opportunity="feature"]{color:#ff78bd}.collab-opportunity-badges [data-opportunity="video"]{color:#69e0c0}.collab-opportunity-badges [data-opportunity="remix"]{color:#83c9ff}
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
        @media(min-width:760px){.collab-video-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(min-width:1100px){.collab-grid{columns:4}}
        @media(max-width:520px){.collab-tabs button{font-size:.57rem;letter-spacing:.08em;padding:.7rem .25rem}.collab-heading{font-size:.58rem}}
        @media(prefers-reduced-motion:reduce){.collab-cover img,.collab-tabs button{transition:none}}
      `}</style>
    </main>
  );
}
