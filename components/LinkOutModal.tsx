"use client";
import React from "react";
import { createPortal } from "react-dom";

export default function LinkOutModal({
  title = "Open Link",
  href,
  onClose,
  accent = "#38B6FF",
  iconSrc,
  message,
}: {
  title?: string;
  href: string;
  onClose: () => void;
  accent?: string; // glow color
  iconSrc?: string; // optional brand icon
  message?: string; // optional helper message
}) {
  const content = (
    <div className="ck-link-overlay" onMouseDown={(e)=>{ if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="ck-link-shell" role="dialog" aria-modal="true" aria-label={title}>
        <header className="ck-link-head">
          <div className="ck-link-title">
            <span className="dot" aria-hidden />
            <span className="text">{title}</span>
          </div>
          <div className="ck-link-actions">
            <a href={href} target="_blank" rel="noreferrer" className="open-extern">Open in new tab</a>
            <button className="close" onClick={() => onClose?.()} aria-label="Close">✕</button>
          </div>
        </header>
        <div className="ck-link-body">
          {iconSrc ? (
            <img src={iconSrc} alt="" className="brand-icon" />
          ) : (
            <div className="brand-icon-fallback" />
          )}
          <div className="msg">{message || "This site cannot be embedded. Use the button below."}</div>
          <a href={href} target="_blank" rel="noreferrer" className="cta" aria-label={`Open ${title}`}>
            Open {title}
          </a>
        </div>
      </div>
      <style jsx>{`
        .ck-link-overlay{ position:fixed; inset:0; z-index:9999; display:grid; place-items:center; background:rgba(0,0,0,.55); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
        .ck-link-shell{ width: min(520px, 92vw); border-radius: 16px; overflow:hidden; color:#eaf2ff; background:
          radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
          linear-gradient(180deg, #0b0b0b, #000 64%);
          border:1px solid rgba(255,255,255,.16);
          box-shadow: 0 24px 64px rgba(0,0,0,.6), 0 0 120px rgba(25,227,255,.25), inset 0 2px 0 rgba(255,255,255,.16), inset 0 -6px 14px rgba(0,0,0,.7);
        }
        .ck-link-head{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.12); }
        .ck-link-title{ display:flex; align-items:center; gap:8px; font-weight:600; letter-spacing:.02em; }
        .ck-link-title .dot{ width:10px; height:10px; border-radius:9999px; background: linear-gradient(180deg, #FC54AF, ${accent}); box-shadow: 0 0 12px #FC54AF, 0 0 22px ${accent}; }
        .ck-link-actions{ display:flex; align-items:center; gap:8px; }
        .open-extern{ color:#9ad7ff; font-size:.9rem; text-decoration:underline; opacity:.9; }
        .open-extern:hover{ opacity:1; }
        .close{ appearance:none; border:0; background:rgba(255,255,255,.08); color:#fff; width:32px; height:32px; border-radius:8px; cursor:pointer; }
        .close:hover{ background:rgba(255,255,255,.16); }
        .ck-link-body{ padding:22px 18px 26px; display:flex; flex-direction:column; align-items:center; gap:16px; }
        .brand-icon{ width:74px; height:74px; object-fit:contain; filter: drop-shadow(0 0 22px ${accent}); }
        .brand-icon-fallback{ width:74px; height:74px; border-radius:16px; background: radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%), rgba(25,227,255,.25); box-shadow: 0 0 22px ${accent}; }
        .msg{ color:#d4e8ff; opacity:.9; text-align:center; }
        .cta{ display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 18px; border-radius:12px; color:#001018; background: linear-gradient(180deg, #D6F3FF, #9AD7FF); box-shadow: 0 8px 22px rgba(25,227,255,.22); font-weight:700; }
        .cta:hover{ filter: brightness(1.05); }
      `}</style>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(content, document.body);
}

