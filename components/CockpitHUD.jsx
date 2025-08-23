import React from "react";

const Icon = {
  Spotify: ({ size=16 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm4.5 14.3a.9.9 0 01-1.2.3A12.8 12.8 0 008.9 16a.9.9 0 11-.5-1.7 14.5 14.5 0 016.9.7.9.9 0 01.7 1.3zm1.6-3.2a1 1 0 01-1.3.5 15.9 15.9 0 00-8-1 .9.9 0 11-.3-1.8 17.7 17.7 0 019 .9 1 1 0 01.6 1.4zm.2-3.4a1 1 0 01-1.3.5 19.4 19.4 0 00-9.9-1.2 1 1 0 11-.4-1.9 21.2 21.2 0 0110.8 1.3 1 1 0 01.8 1.3z" />
    </svg>
  ),
  Apple: ({ size=16 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M16.5 13.5c0-2.4 2-3.2 2-3.2a5.2 5.2 0 00-4.1-2.2c-1.8-.2-3.2 1-4 1s-2-.9-3.4-.9A5.5 5.5 0 003 12.2c0 3.3 2.2 7.6 4.9 7.6 1.1 0 1.9-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.4-.9 3.3-2a8.6 8.6 0 001.4-2.7s-2.1-.9-2.1-3.6zM14.9 5.2A2.7 2.7 0 0015.7 3 3.1 3.1 0 0013.4 4a3 3 0 00.7 2.2 2.7 2.7 0 000-1z" />
    </svg>
  ),
};

function IconButton({ title, href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title={title}
       className="ck-mini-btn"
       onMouseDown={(e)=>e.currentTarget.style.transform="scale(0.96)"} onMouseUp={(e)=>e.currentTarget.style.transform="none"}>
      {children}
      <style jsx>{`
        .ck-mini-btn{
          display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;
          background:rgba(28,34,48,.55); color:#e8f1ff; border:1px solid rgba(255,255,255,.16);
          box-shadow:0 10px 24px rgba(0,0,0,.36), inset 0 0 10px rgba(56,182,255,.16);
          backdrop-filter:blur(6px); transition:background .18s,box-shadow .18s,transform .12s;
        }
        .ck-mini-btn:hover{ background:rgba(255,255,255,.22); box-shadow:0 12px 30px rgba(0,0,0,.44), 0 0 18px rgba(252,84,175,.20) }
      `}</style>
    </a>
  );
}

function ControlButton({ title, onClick, children }) {
  return (
    <button className="ck-btn" title={title} onClick={onClick}
      onMouseDown={(e)=>e.currentTarget.style.transform="scale(0.97)"} onMouseUp={(e)=>e.currentTarget.style.transform="none"}>
      {children}
      <style jsx>{`
        .ck-btn{
          padding:7px 10px; min-width:40px; font-size:12px; font-weight:800; color:#fff; cursor:pointer;
          background:radial-gradient(120% 120% at 50% -10%, rgba(56,182,255,.18), rgba(252,84,175,.18));
          border:1px solid rgba(255,255,255,.16); border-radius:12px;
          box-shadow:0 10px 24px rgba(0,0,0,.36), inset 0 0 10px rgba(56,182,255,.16);
          backdrop-filter:blur(6px); transition:background .18s, box-shadow .18s, transform .12s;
        }
        .ck-btn:hover{ background:rgba(255,255,255,.22); box-shadow:0 12px 30px rgba(0,0,0,.44), 0 0 20px rgba(252,84,175,.20) }
      `}</style>
    </button>
  );
}

function CoverImage({ PATHS, src, alt, cacheKey }) {
  const [okSrc, setOkSrc] = React.useState(src);
  React.useEffect(()=>{
    const q = cacheKey ? "?v=" + encodeURIComponent(cacheKey) : "";
    setOkSrc(src + q);
  },[src, cacheKey]);
  return (
    <div className="ck-cover-frame" title={alt}>
      <img src={okSrc} alt={alt} onError={()=>setOkSrc(PATHS.logoFallback)} className="ck-cover" />
      <span className="ck-cover-reflection" />
      <style jsx>{`
        .ck-cover-frame{position:relative;width:56px;height:56px;border-radius:10px;background:rgba(10,12,18,.7);
          border:1px solid rgba(255,255,255,.12); box-shadow:inset 0 0 12px rgba(56,182,255,.18), 0 8px 20px rgba(0,0,0,.45); overflow:hidden;}
        .ck-cover{width:100%;height:100%;object-fit:cover;filter:saturate(1.02) contrast(1.02)}
        .ck-cover-reflection{position:absolute;top:0;left:0;right:0;height:28%;
          background:linear-gradient(to bottom, rgba(255,255,255,.22), rgba(255,255,255,0));pointer-events:none;}
      `}</style>
    </div>
  );
}

export default function CockpitHUD({
  PATHS, LINKS, POS, BUILD_TAG,
  track, playing, ready,
  onPrev, onToggle, onNext,
  audioRef
}) {
  const hudStyle = { width: `min(${POS.hud.widthVw}vw, ${POS.hud.maxPx}px)`, top: `${POS.hud.topVh}vh` };

  return (
    <>
      <div className="ck-hud-wrap" style={hudStyle}>
        <div className="ck-hud">
          <span className="ck-bolt ck-bolt-left" />
          <span className="ck-bolt ck-bolt-right" />

          <div className="ck-row">
            <CoverImage PATHS={PATHS} src={track.cover} alt={track.title} cacheKey={track.id} />
            <div className="ck-flex1">
              <div className="ck-title-row">
                <div className="ck-title">{track.title}</div>
                <div className="ck-title-buttons">
                  <IconButton title="Spotify" href={LINKS.spotify}><Icon.Spotify /></IconButton>
                  <IconButton title="Apple Music" href={LINKS.apple}><Icon.Apple /></IconButton>
                </div>
              </div>

              <div className="ck-row ck-gap">
                <ControlButton title="Previous" onClick={onPrev}>◀</ControlButton>
                <ControlButton title={playing ? "Pause" : "Play"} onClick={onToggle}>
                  {playing ? "Pause" : ready ? "Play" : "Enable sound"}
                </ControlButton>
                <ControlButton title="Next" onClick={onNext}>▶</ControlButton>

                <div className="ck-lights">
                  <span className={playing ? "ck-light ck-play" : "ck-light ck-idle"} />
                  <span className="ck-light ck-sync" />
                </div>
              </div>

              <div className="ck-progress"><div className={playing ? "ck-progress-fill ck-progress-on" : "ck-progress-fill"} /></div>
            </div>
          </div>

          <audio ref={audioRef} preload="metadata" />
        </div>
      </div>

      <div className="ck-badge">{BUILD_TAG}</div>

      <style jsx>{`
        .ck-hud-wrap{ position:absolute; left:50%; transform:translateX(-50%); perspective:1000px; z-index:5; }
        .ck-hud{
          position:relative; border-radius:18px; padding:10px 12px; transform:rotateX(1.8deg);
          background:linear-gradient(180deg, rgba(18,22,32,.62), rgba(18,22,32,.36));
          border:1px solid rgba(255,255,255,.10);
          box-shadow:0 8px 30px rgba(0,0,0,.5), inset 0 0 18px rgba(56,182,255,.16), 0 0 22px rgba(252,84,175,.16);
          backdrop-filter:blur(8px); overflow:hidden;
        }
        .ck-bolt{ position:absolute; top:-5px; width:9px; height:9px; border-radius:999px; background:rgba(255,255,255,.35);
          box-shadow:0 0 10px rgba(255,255,255,.38); animation:boltGlow 2.8s infinite; }
        .ck-bolt-left{ left:14px; } .ck-bolt-right{ right:14px; animation-delay:.9s; }
        @keyframes boltGlow{0%,100%{opacity:.65}50%{opacity:1}}

        .ck-row{display:flex;align-items:center;gap:10px}
        .ck-gap{margin-top:6px;gap:8px}
        .ck-flex1{flex:1;min-width:0}

        .ck-title-row{display:flex; align-items:center; justify-content:space-between; gap:8px}
        .ck-title{font-size:14px; font-weight:800; letter-spacing:.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
        .ck-title-buttons{display:flex; align-items:center; gap:6px}

        .ck-lights{display:flex; align-items:center; gap:6px; margin-left:6px}
        .ck-light{width:7px; height:7px; border-radius:999px; display:inline-block}
        .ck-idle{background:rgba(255,255,255,.30)}
        .ck-play{background:#FC54AF; box-shadow:0 0 12px rgba(252,84,175,.6)}
        .ck-sync{background:#38B6FF; box-shadow:0 0 10px rgba(56,182,255,.55)}

        .ck-progress{margin-top:6px; height:5px; border-radius:999px; background:rgba(255,255,255,.10); overflow:hidden}
        .ck-progress-fill{height:100%; width:0%; border-radius:999px;
          background:linear-gradient(90deg, rgba(56,182,255,.9), rgba(252,84,175,.9));
          box-shadow:0 0 12px rgba(56,182,255,.35); transition:width 600ms ease}
        .ck-progress-on{width:38%}

        .ck-badge{position:absolute; bottom:6px; left:10px; font-size:11px; font-weight:800; color:rgba(255,255,255,.75); text-shadow:0 2px 10px rgba(0,0,0,.6)}
      `}</style>
    </>
  );
}
