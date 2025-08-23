"use client";

import React from "react";
import { THEME as T } from "../config/theme";

function ControlButton({ onClick, children, title }) {
  return (
    <button
      className="ck-btn"
      onClick={onClick}
      title={title}
    >
      {children}
      <style jsx>{`
        .ck-btn {
          display:inline-flex;align-items:center;justify-content:center;
          border-radius:${T.radii.btn}px;
          background:${T.colors.surface};color:${T.colors.text};
          border:1px solid ${T.colors.borderHud};
          box-shadow:${T.shadow.deepHud},${T.shadow.innerHud};
          padding:6px 10px;margin:0 3px;
          font-size:13px;cursor:pointer;
          transition:background .2s,box-shadow .2s,transform .12s;
        }
        .ck-btn:hover {
          background:${T.colors.railHover};
          box-shadow:${T.shadow.deepHover},${T.shadow.rimAccentHover};
        }
        .ck-btn:active { transform:scale(.94); }
      `}</style>
    </button>
  );
}

function CoverImage({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      className="ck-cover"
    />
  );
}

export default function CockpitHUD({
  PATHS,
  POS,
  BUILD_TAG,
  track,
  playing,
  ready,
  onPrev,
  onToggle,
  onNext,
  audioRef,
}) {
  return (
    <div
      className="ck-hud"
      style={{
        top: `${POS.hud.topVh}vh`,
        width: `${POS.hud.widthVw}vw`,
        maxWidth: POS.hud.maxPx + "px",
      }}
    >
      <div className="ck-title-row">
        <div className="ck-title">{track.title}</div>
      </div>

      <div className="ck-main">
        <CoverImage src={track.cover || PATHS.logoFallback} alt={track.title} />
        <div className="ck-controls">
          <ControlButton onClick={onPrev} title="Previous">⏮</ControlButton>
          <ControlButton onClick={onToggle} title="Play / Pause">
            {playing ? "⏸" : ready ? "▶️" : "…"}
          </ControlButton>
          <ControlButton onClick={onNext} title="Next">⏭</ControlButton>
        </div>
      </div>

      <div className="ck-progress">
        <audio ref={audioRef} preload="auto" />
      </div>

      <div className="ck-footer">{BUILD_TAG}</div>

      <style jsx>{`
        .ck-hud {
          position:absolute;left:50%;transform:translateX(-50%);
          background:${T.colors.hudTop};
          border:1px solid ${T.colors.borderHud};
          border-radius:${T.radii.hud}px;
          box-shadow:${T.shadow.deepHud},${T.shadow.innerHud};
          backdrop-filter:${T.blur.hud};
          color:${T.colors.text};
          padding:12px 16px;
          z-index:5;
        }
        .ck-title-row {
          display:flex;align-items:center;justify-content:center;
          font-weight:600;font-size:15px;margin-bottom:8px;
        }
        .ck-main {
          display:flex;align-items:center;justify-content:center;
          gap:12px;margin-bottom:10px;
        }
        .ck-cover {
          width:${T.sizes.cover.w}px;
          height:${T.sizes.cover.h}px;
          object-fit:cover;
          border-radius:${T.radii.cover}px;
          box-shadow:${T.shadow.innerPrimary},${T.shadow.rimAccent};
        }
        .ck-controls {
          display:flex;align-items:center;justify-content:center;
        }
        .ck-progress {
          height:4px;background:${T.colors.progressTrack};
          border-radius:3px;overflow:hidden;margin:6px 0;
        }
        .ck-footer {
          font-size:10px;opacity:.6;text-align:right;margin-top:4px;
        }
      `}</style>
    </div>
  );
}
