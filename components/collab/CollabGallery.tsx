"use client";

import { useEffect, useState } from "react";

export type CollabProject = {
  id: string;
  title: string;
  coverUrl: string;
  audioUrl: string | null;
  lyricsUrl: string | null;
  backgroundUrl: string | null;
  backgroundIsVideo: boolean;
};

export default function CollabGallery({ projects }: { projects: CollabProject[] }) {
  const [selected, setSelected] = useState<CollabProject | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!selected?.lyricsUrl) {
      setLyrics("");
      return;
    }
    let active = true;
    fetch(selected.lyricsUrl)
      .then((response) => response.ok ? response.text() : "")
      .then((text) => { if (active) setLyrics(text); })
      .catch(() => { if (active) setLyrics(""); });
    return () => { active = false; };
  }, [selected]);

  useEffect(() => {
    if (!selected) setPlaying(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  return (
    <main className="collab-page">
      <header className="collab-heading">
        <a className="collab-wordmark" href="/">CHXNDLER</a>
        <span>COLLABORATIONS</span>
      </header>

      {projects.length ? (
        <section className="collab-grid" aria-label="Cover art collaborations">
          {projects.map((project, index) => (
            <button
              className={`collab-cover collab-cover-${index % 7}`}
              key={project.id}
              onClick={() => setSelected(project)}
              aria-label={`Open ${project.title}${project.audioUrl ? ", play track and read lyrics" : ""}`}
            >
              <img src={project.coverUrl} alt={`${project.title} cover art`} />
              <span className="collab-cover-mark" aria-hidden="true">{project.audioUrl ? "▶" : "↗"}</span>
            </button>
          ))}
        </section>
      ) : (
        <div className="collab-empty">
          <p>THE ARTWORK IS ON ITS WAY.</p>
          <span>Cover art uploaded to the Collabs folder will appear here.</span>
        </div>
      )}

      {selected && (
        <div className="collab-viewer" role="dialog" aria-modal="true" aria-label={`${selected.title} listening view`} onClick={() => setSelected(null)}>
          {selected.backgroundUrl && (selected.backgroundIsVideo
            ? <video className="collab-viewer-bg" src={selected.backgroundUrl} autoPlay muted loop playsInline />
            : <img className="collab-viewer-bg" src={selected.backgroundUrl} alt="" />)}
          <div className="collab-viewer-shade" />
          <button className="collab-close" onClick={() => setSelected(null)} aria-label="Close">×</button>
          <div className="collab-listening" onClick={(event) => event.stopPropagation()}>
            <img className="collab-listening-cover" src={selected.coverUrl} alt={`${selected.title} cover art`} />
            <div className="collab-track-info">
              <span className="collab-eyebrow">CHXNDLER × COLLABORATOR</span>
              <h1>{selected.title}</h1>
              {selected.audioUrl ? (
                <audio
                  controls
                  autoPlay
                  src={selected.audioUrl}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  className="collab-audio"
                />
              ) : <p className="collab-no-audio">A sonic collaboration</p>}
              {selected.lyricsUrl && (
                <div className="collab-lyrics" aria-live="polite">
                  {lyrics ? lyrics.replace(/\[[^\]]+\]/g, "").split(/\r?\n/).filter(Boolean).map((line, i) => <p key={`${i}-${line}`}>{line}</p>) : <p className="collab-lyrics-loading">Lyrics loading…</p>}
                </div>
              )}
              {!selected.lyricsUrl && <p className="collab-lyrics-loading">Lyrics will appear here when uploaded.</p>}
              <span className="collab-playing-state">{playing ? "NOW PLAYING" : ""}</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .collab-page{min-height:100vh;background:#08080b;color:#fff;padding:clamp(1rem,3vw,3rem);}
        .collab-heading{display:flex;justify-content:space-between;align-items:center;margin:0 auto 1.25rem;max-width:1600px;color:#ff3ea5;font-size:.7rem;font-weight:800;letter-spacing:.28em}
        .collab-wordmark{color:#fff;text-decoration:none;font-size:.8rem;letter-spacing:.18em}
        .collab-grid{max-width:1600px;margin:0 auto;columns:2;column-gap:clamp(.55rem,1vw,1rem)}
        .collab-cover{position:relative;display:block;width:100%;break-inside:avoid;margin:0 0 clamp(.55rem,1vw,1rem);padding:0;border:1px solid rgba(255,255,255,.12);border-radius:3px;overflow:hidden;background:#121216;cursor:pointer;text-align:left}
        .collab-cover img{display:block;width:100%;height:auto;transition:transform .5s cubic-bezier(.2,.7,.2,1),filter .3s}
        .collab-cover:hover img,.collab-cover:focus-visible img{transform:scale(1.025);filter:brightness(.82)}
        .collab-cover:focus-visible{outline:2px solid #ff3ea5;outline-offset:3px}
        .collab-cover-mark{position:absolute;right:.8rem;bottom:.8rem;display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:50%;background:rgba(8,8,11,.72);color:#fff;opacity:0;transition:opacity .2s}
        .collab-cover:hover .collab-cover-mark,.collab-cover:focus-visible .collab-cover-mark{opacity:1}
        .collab-empty{min-height:70vh;display:grid;align-content:center;justify-items:center;text-align:center;color:#fff}
        .collab-empty p{font-size:clamp(1.3rem,4vw,2.4rem);font-weight:800;letter-spacing:.08em;margin:0 0 .6rem}
        .collab-empty span{color:#999;font-size:.9rem}
        .collab-viewer{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:auto;background:#08080b}
        .collab-viewer-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(5px);opacity:.5;transform:scale(1.04)}
        .collab-viewer-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,5,8,.9),rgba(5,5,8,.62) 55%,rgba(5,5,8,.77));backdrop-filter:blur(12px)}
        .collab-close{position:fixed;z-index:2;top:1.1rem;right:1.1rem;width:2.7rem;height:2.7rem;border:0;border-radius:50%;background:#ffffff20;color:#fff;font-size:1.6rem;cursor:pointer}
        .collab-listening{position:relative;z-index:1;width:min(1050px,100%);display:grid;grid-template-columns:minmax(220px,.9fr) minmax(250px,1fr);align-items:center;gap:clamp(1.5rem,5vw,4rem);padding:clamp(1.25rem,5vw,3.5rem)}
        .collab-listening-cover{width:100%;height:auto;max-height:70vh;object-fit:contain;box-shadow:0 1.5rem 5rem #0009}
        .collab-track-info{max-height:76vh;overflow:auto}
        .collab-eyebrow{color:#ff3ea5;font-size:.7rem;font-weight:800;letter-spacing:.3em}
        .collab-track-info h1{margin:.6rem 0 1rem;font-size:clamp(1.6rem,4vw,3rem);line-height:1.02;text-transform:uppercase}
        .collab-audio{width:100%;height:42px;filter:invert(1) hue-rotate(180deg);opacity:.9}
        .collab-no-audio,.collab-lyrics-loading{color:#aaa;font-size:.85rem}
        .collab-lyrics{margin-top:1.5rem;line-height:1.75;color:#eee;font-size:1rem;white-space:pre-wrap}
        .collab-lyrics p{margin:.2rem 0}
        .collab-playing-state{display:block;min-height:1rem;margin-top:1.2rem;color:#ff3ea5;font-size:.65rem;letter-spacing:.24em;font-weight:800}
        @media(min-width:700px){.collab-grid{columns:3}}
        @media(min-width:1100px){.collab-grid{columns:4}}
        @media(max-width:650px){.collab-listening{grid-template-columns:1fr;gap:1.3rem;max-width:480px;padding:4.2rem 1.25rem 2rem}.collab-listening-cover{max-height:35vh;width:auto;max-width:100%;justify-self:center}.collab-track-info{max-height:45vh}.collab-viewer-shade{background:linear-gradient(180deg,rgba(5,5,8,.78),rgba(5,5,8,.94))}}
        @media(prefers-reduced-motion:reduce){.collab-cover img{transition:none}}
      `}</style>
    </main>
  );
}
