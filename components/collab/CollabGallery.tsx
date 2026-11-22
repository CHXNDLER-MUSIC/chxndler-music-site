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
type VideoReleaseTab = "released" | "unreleased";
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
  const [category, setCategory] = useState<"features" | "videos">(canViewFeatures && (defaultView !== "video" || musicVideos.length === 0) ? "features" : "videos");
  const [tab, setTab] = useState<Tab>(defaultView);
  const [videoReleaseTab, setVideoReleaseTab] = useState<VideoReleaseTab>("released");
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [requestProject, setRequestProject] = useState<string | null>(null);
  const [showOtherIdeaPicker, setShowOtherIdeaPicker] = useState(false);
  const [otherIdeaType, setOtherIdeaType] = useState<"Songwriting" | "Other" | "">("");
  const audio = useBrandAudio();

  const items = useMemo<SelectedItem[]>(() => {
    if (!canViewFeatures || category !== "features") return [];
    const catalog = [...artistReleases, ...unreleasedSongs].filter((song, index, rows) => rows.findIndex(other => other.databaseId === song.databaseId) === index);
    const filteredCatalog = filterCollabCatalog(catalog, tab).filter(song => {
      if (tab !== "video") return true;
      const released = song.isReleased === true || song.audioStatus === "Final" || song.audioStatus === "Released";
      return videoReleaseTab === "released" ? released : !released && song.readyForCollab !== true;
    });
    const songs = filteredCatalog.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }) || a.slug.localeCompare(b.slug),
    );
    return songs.map((release) => ({
      id: `${tab}:${release.slug}`,
      from: tab,
      audioUrl: release.audioUrl,
      release,
    }));
  }, [tab, videoReleaseTab, artistReleases, unreleasedSongs, canViewFeatures, category]);
  const videoSongs = useMemo(() => {
    const catalog = [...artistReleases, ...unreleasedSongs]
      .filter((song, index, rows) => rows.findIndex(other => other.databaseId === song.databaseId || other.slug === song.slug) === index)
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }));
    return catalog.map(release => {
      const project = musicVideos.find(item => item.song_id === release.databaseId || item.songs?.slug === release.slug);
      return {
        release,
        status: release.videoEmbedUrl ? "Video released" : project?.public_status?.trim() || "Visual treatment open",
        concept: project?.public_concept?.trim() || release.videoConcept?.trim() || "",
      };
    });
  }, [artistReleases, unreleasedSongs, musicVideos]);

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
  ) : undefined;

  return (
    <main className="collab-page">
      <header className="collab-heading" style={{ justifyContent: "space-between", letterSpacing: "normal" }}>
        <a className="collab-wordmark" href="/">CHXNDLER</a>
        <button type="button" onClick={async () => { await fetch("/api/collab/logout", { method: "POST" }); window.location.assign("/collab"); }} className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold tracking-normal text-white/65 transition hover:border-[#FD52AF]/50 hover:text-white">Switch artist</button>
      </header>

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

      {category === "features" && tab === "video" && <div className="collab-release-tabs" role="tablist" aria-label="Video needed release status">
        {([ ["released", "Released"], ["unreleased", "Unreleased"] ] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={videoReleaseTab === value} onClick={() => setVideoReleaseTab(value)}>{label}</button>)}
      </div>}

      {category === "videos" && <section className="collab-video-opportunities" aria-label="Music video ideas for every song">
        <div><p className="collab-video-kicker">MUSIC VIDEOS</p><h2>Bring any song to life.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Explore the songs, their visual concepts, and the kind of feeling each video could bring to life.</p></div>
        <div className="collab-video-grid">{videoSongs.map(({ release, status, concept }) => <article className="collab-video-card" key={release.slug}>
          <img src={release.coverArt || placeholderCover(release.title)} alt={`${release.title} artwork`} />
          <div><span className="collab-video-status">{status}</span><h3>{release.title}</h3>
            <p className="collab-video-kicker !mb-1 !text-[.58rem]">SONG CONTEXT</p><p>{release.oneLiner || `${release.title} is ready for a visual interpretation.`}</p>
            <p className="collab-video-kicker !mb-1 !mt-4 !text-[.58rem]">VIDEO CONCEPT</p><p>{concept || `The visual direction is open. Pitch a story, mood, or visual world that fits ${release.title}.`}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[.62rem] font-bold uppercase tracking-wider text-white/55"><span className="rounded-full border border-white/10 px-2.5 py-1">{release.isReleased ? "Released song" : "Unreleased song"}</span>{release.releaseDate && <span className="rounded-full border border-white/10 px-2.5 py-1">Release · {new Date(`${release.releaseDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>}</div>
            {release.audioUrl && <audio className="mt-4 w-full" controls preload="none" src={release.audioUrl} aria-label={`Preview ${release.title}`} />}
          </div>
        </article>)}</div>
      </section>}

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
                      const image = event.currentTarget;
                      if (item.release.cardArt && image.dataset.cardFallback !== "true") {
                        image.dataset.cardFallback = "true";
                        image.src = item.release.cardArt;
                        return;
                      }
                      if (image.dataset.genericFallback !== "true") {
                        image.dataset.genericFallback = "true";
                        image.src = "/covers/CHXNDLER.webp";
                        return;
                      }
                      image.onerror = null;
                      image.src = placeholderCover(item.release.title);
                    }}
                  />
                  {item.audioUrl && <span className="collab-cover-mark" aria-hidden="true">▶</span>}
                </>
              )}
              {!item.release.readyForCollab && item.release.releaseDate && <span className="collab-release-date">Release date · {new Date(`${item.release.releaseDate}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>}
              {(item.release.readyForCollab || !!item.release.collaborationOpportunities?.length) && <span className="collab-opportunity-badges">{item.release.readyForCollab && <span data-opportunity="collab">Open for Collab</span>}{item.release.collaborationOpportunities?.map(value => <span key={value} data-opportunity={value}>{value === "feature" ? "Open for Feature" : value === "video" ? "Video Needed" : "Open for Remix"}</span>)}</span>}
            </button>
          ))}
        </section>
      ) : (
        <div className="collab-empty">
          <p>NO SONGS IN THIS VIEW YET.</p>
        <span>{tab === "collabs" ? "No songs are currently marked Ready for Collab." : tab === "video" ? videoReleaseTab === "unreleased" ? "No unreleased songs outside Open for Collab currently need a music video." : "No released songs currently need a music video." : "No final or released songs yet."}</span>
        </div>
      ))}

      {category === "features" && tab === "collabs" && !invitedSongSlug && <div className="collab-extra-cta"><button type="button" onClick={() => { setOtherIdeaType(""); setShowOtherIdeaPicker(true); }}>Have something else in mind? <span aria-hidden="true">↗</span></button></div>}

      {showOtherIdeaPicker && <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) { setShowOtherIdeaPicker(false); setOtherIdeaType(""); } }}><section role="dialog" aria-modal="true" aria-labelledby="other-idea-title" className="max-h-[92dvh] w-full max-w-[48rem] overflow-y-auto rounded-t-3xl border border-white/[.12] bg-[#101014] px-5 pb-6 pt-6 text-white shadow-2xl sm:rounded-3xl sm:px-9 sm:pb-8 sm:pt-8"><header className="mb-6 text-center sm:mb-7"><img src="/elements/logo.webp" alt="CHXNDLER" className="mx-auto mb-4 h-14 w-52 object-contain"/><h2 id="other-idea-title" className="text-2xl font-black leading-tight tracking-tight sm:text-3xl"><span className="block">COLLABORATE ON</span><span className="mt-1 block text-[#ff3ea5]">SOMETHING ELSE</span></h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/60">Choose how you&apos;d like to collaborate. You don&apos;t need to choose an existing song.</p></header><div className="grid gap-3 sm:grid-cols-2"><button type="button" aria-pressed={otherIdeaType === "Songwriting"} onClick={() => setOtherIdeaType("Songwriting")} className={otherIdeaType === "Songwriting" ? "rounded-xl border border-[#ff3ea5] bg-[#ff3ea5]/10 p-4 text-left" : "rounded-xl border border-white/10 bg-white/[.03] p-4 text-left hover:border-white/25"}><span aria-hidden="true" className="mb-3 inline-grid h-10 w-10 place-items-center rounded-xl bg-[#ff3ea5]/10 text-[#ff3ea5]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span><span className="block font-bold text-white">Write a song from scratch</span><span className="mt-1 block text-xs leading-5 text-white/55">Share a songwriting idea for something new.</span></button><button type="button" aria-pressed={otherIdeaType === "Other"} onClick={() => setOtherIdeaType("Other")} className={otherIdeaType === "Other" ? "rounded-xl border border-[#ff3ea5] bg-[#ff3ea5]/10 p-4 text-left" : "rounded-xl border border-white/10 bg-white/[.03] p-4 text-left hover:border-white/25"}><span aria-hidden="true" className="mb-3 inline-grid h-10 w-10 place-items-center rounded-xl bg-[#ff3ea5]/10 text-[#ff3ea5]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6m-5 4h4m-2-20a7 7 0 0 0-4 12.75c.8.55 1 1.15 1 1.75h6c0-.6.2-1.2 1-1.75A7 7 0 0 0 12 2Z"/></svg></span><span className="block font-bold text-white">Explain a concept</span><span className="mt-1 block text-xs leading-5 text-white/55">Describe your idea, story, or creative direction.</span></button></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setShowOtherIdeaPicker(false); setOtherIdeaType(""); }} className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/70">Cancel</button><button type="button" disabled={!otherIdeaType} onClick={() => setShowOtherIdeaPicker(false)} className="rounded-full bg-[#ff3ea5] px-5 py-3 text-sm font-extrabold text-black disabled:opacity-40">Continue →</button></div></section></div>}
      {!showOtherIdeaPicker && otherIdeaType && <CollabRequestForm songId="" title={otherIdeaType === "Songwriting" ? "A NEW SONG" : "YOUR CONCEPT"} artwork="" invitedName={invitedDisplayName} invitedEmail={invitedEmail} initialContributionType={otherIdeaType} initialMessage={otherIdeaType === "Songwriting" ? "I’d like to write a song from scratch. Here’s my idea: " : "I’d like to explain a concept: "} close={() => setOtherIdeaType("")} />}

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
            showCollabRequest={selected.from !== "complete"}
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
        .collab-heading{display:flex;justify-content:center;align-items:center;margin:0 auto 1.1rem;max-width:1600px;color:#ff3ea5;font-size:.7rem;font-weight:800;letter-spacing:.28em}
        .collab-extra-cta{max-width:1600px;margin:1.5rem auto 0;display:flex;justify-content:center}
        .collab-extra-cta a,.collab-extra-cta button{display:inline-flex;align-items:center;gap:.4rem;border:1px solid #ff3ea5;border-radius:999px;padding:.7rem 1rem;background:#ff3ea5;color:#100910;text-decoration:none;font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;transition:background .2s,border-color .2s,transform .2s;box-shadow:0 0 20px rgba(255,62,165,.2)}
        .collab-extra-cta a:hover,.collab-extra-cta button:hover{background:#ff66b8;border-color:#ff66b8;transform:translateY(-1px)}
        .collab-extra-cta a:focus-visible,.collab-extra-cta button:focus-visible{outline:2px solid #ff3ea5;outline-offset:3px}
        .collab-wordmark{color:#ff3ea5;text-decoration:none;font-size:.8rem;letter-spacing:.18em}
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
        .collab-release-tabs{display:flex;justify-content:center;gap:.5rem;max-width:900px;margin:-.75rem auto 1.5rem}
        .collab-release-tabs button{border:1px solid rgba(105,224,192,.3);border-radius:999px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.62);padding:.55rem 1rem;font-size:.66rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
        .collab-release-tabs button[aria-selected="true"]{border-color:rgba(105,224,192,.65);background:rgba(105,224,192,.14);color:#69e0c0}
        .collab-release-tabs button:focus-visible{outline:2px solid #69e0c0;outline-offset:2px}
        .collab-video-opportunities{max-width:1600px;margin:0 auto 2rem;padding:1.2rem;border:1px solid rgba(255,62,165,.22);background:linear-gradient(120deg,rgba(255,62,165,.08),rgba(255,255,255,.02))}
        .collab-video-kicker{margin:0;color:#ff3ea5;font-size:.62rem;font-weight:900;letter-spacing:.22em}.collab-video-opportunities h2{margin:.35rem 0 1rem;font-size:1.35rem;font-weight:900}
        .collab-video-grid{display:grid;gap:.8rem}.collab-video-card{display:grid;grid-template-columns:6rem 1fr;gap:1rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.25);padding:.75rem}.collab-video-card>img{width:6rem;aspect-ratio:1;object-fit:cover}.collab-video-card h3{margin:.35rem 0;font-size:1rem;font-weight:800}.collab-video-card p{margin:.4rem 0;color:rgba(255,255,255,.65);font-size:.85rem;white-space:pre-wrap}.collab-video-status{color:#ff77bb;font-size:.58rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.collab-video-card audio{display:block;width:min(100%,22rem);height:2rem;margin:.7rem 0}.collab-video-card button{display:inline-block;border:1px solid rgba(255,62,165,.55);border-radius:999px;background:transparent;padding:.55rem .8rem;color:#ff3ea5;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
        .collab-tabs button:focus-visible,.collab-back:focus-visible{outline:2px solid #ff3ea5;outline-offset:2px}
        .collab-grid{max-width:1600px;margin:0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(.55rem,1vw,1rem)}
        .collab-cover{position:relative;display:block;width:100%;margin:0;padding:0;border:1px solid rgba(255,255,255,.12);border-radius:3px;overflow:hidden;background:#121216;cursor:pointer;text-align:left}
        .collab-release-date{position:absolute;right:.65rem;top:.65rem;padding:.45rem .6rem;border:1px solid rgba(255,62,165,.35);border-radius:999px;background:rgba(8,8,11,.82);color:#ff9bcc;font-size:.62rem;font-weight:800;letter-spacing:.04em;backdrop-filter:blur(8px)}
        .collab-opportunity-badges{position:absolute;left:.6rem;right:.6rem;bottom:.6rem;display:flex;flex-wrap:wrap;gap:.3rem;pointer-events:none}.collab-opportunity-badges span{border-radius:999px;padding:.3rem .5rem;background:rgba(8,8,11,.78);font-size:.56rem;font-weight:800;letter-spacing:.025em;backdrop-filter:blur(6px)}.collab-opportunity-badges [data-opportunity="feature"]{color:#ff78bd}.collab-opportunity-badges [data-opportunity="video"]{color:#69e0c0}.collab-opportunity-badges [data-opportunity="remix"]{color:#83c9ff}
        .collab-cover img{display:block;width:100%;height:auto;transition:transform .5s cubic-bezier(.2,.7,.2,1),filter .3s}
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
        @media(min-width:700px){.collab-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.collab-tabs button{font-size:.8rem}}
        @media(min-width:760px){.collab-video-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(min-width:1100px){.collab-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
        @media(max-width:520px){.collab-tabs button{font-size:.57rem;letter-spacing:.08em;padding:.7rem .25rem}.collab-heading{font-size:.58rem}}
        @media(prefers-reduced-motion:reduce){.collab-cover img,.collab-tabs button{transition:none}}
      `}</style>
    </main>
  );
}
