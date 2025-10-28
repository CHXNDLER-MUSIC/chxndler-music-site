"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function InlineBrowserModal({
  url,
  title = "",
  onClose,
}: {
  url: string;
  title?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Fallback message if embed is blocked and iframe never completes loading
    const t = window.setTimeout(() => setTimedOut(true), 1800);
    return () => window.clearTimeout(t);
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const content = (
    <div ref={overlayRef} className="ck-inl-overlay" onMouseDown={(e)=>{ if (e.target === overlayRef.current) onClose?.(); }}>
      <div className="ck-inl-shell" role="dialog" aria-modal="true" aria-label={title || "Inline Browser"}>
        <header className="ck-inl-head">
          <div className="ck-inl-title">
            <span className="dot" aria-hidden />
            <span className="text">{title || "Inline Browser"}</span>
          </div>
          <div className="ck-inl-actions">
            <a href={url} target="_blank" rel="noreferrer" className="open-extern">Open in new tab</a>
            <button className="close" onClick={() => onClose?.()} aria-label="Close">✕</button>
          </div>
        </header>
        <div className="ck-inl-body">
          <iframe
            src={url}
            title={title || "inline"}
            referrerPolicy="no-referrer"
            allow="autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
            onLoad={() => setLoaded(true)}
          />
          {!loaded && (
            <div className="ck-inl-loading">
              <div className="spinner" aria-hidden />
              <div className="msg">
                {timedOut ? (
                  <>
                    This site may block embedding. Use “Open in new tab”.
                  </>
                ) : (
                  <>Loading…</>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .ck-inl-overlay{ position:fixed; inset:0; z-index:9999; display:grid; place-items:center; background:rgba(0,0,0,.55); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
        .ck-inl-shell{ width: min(920px, 92vw); height: min(80vh, 760px); border-radius: 16px; overflow:hidden; color:#eaf2ff; background:
          radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
          linear-gradient(180deg, #0b0b0b, #000 64%);
          border:1px solid rgba(255,255,255,.16);
          box-shadow: 0 24px 64px rgba(0,0,0,.6), 0 0 120px rgba(25,227,255,.25), inset 0 2px 0 rgba(255,255,255,.16), inset 0 -6px 14px rgba(0,0,0,.7);
        }
        .ck-inl-head{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.12); }
        .ck-inl-title{ display:flex; align-items:center; gap:8px; font-weight:600; letter-spacing:.02em; }
        .ck-inl-title .dot{ width:10px; height:10px; border-radius:9999px; background: linear-gradient(180deg, #FC54AF, #38B6FF); box-shadow: 0 0 12px #FC54AF, 0 0 22px #38B6FF; }
        .ck-inl-actions{ display:flex; align-items:center; gap:8px; }
        .open-extern{ color:#9ad7ff; font-size:.9rem; text-decoration:underline; opacity:.9; }
        .open-extern:hover{ opacity:1; }
        .close{ appearance:none; border:0; background:rgba(255,255,255,.08); color:#fff; width:32px; height:32px; border-radius:8px; cursor:pointer; }
        .close:hover{ background:rgba(255,255,255,.16); }
        .ck-inl-body{ position:relative; width:100%; height:calc(100% - 48px); }
        .ck-inl-body iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; background:#111; }
        .ck-inl-loading{ position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; background:linear-gradient(180deg, rgba(0,0,0,.5), rgba(0,0,0,.3)); }
        .spinner{ width:28px; height:28px; border-radius:9999px; border:3px solid rgba(255,255,255,.2); border-top-color:#9ad7ff; animation:spin 1s linear infinite; }
        .msg{ color:#d4e8ff; font-size:.95rem; opacity:.9; }
        @keyframes spin { from{ transform:rotate(0) } to{ transform:rotate(360deg) } }
      `}</style>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

