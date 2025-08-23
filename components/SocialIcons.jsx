import React from "react";

const Icon = {
  Instagram: ({ size=18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  TikTok: ({ size=18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M21 8.5c-2 0-4-1-5.3-2.7V17a5 5 0 11-3-4.6V5h3a6.7 6.7 0 005.3 2.5V8.5z" />
    </svg>
  ),
  YouTube: ({ size=18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M23 12s0-3.2-.4-4.7a3.1 3.1 0 00-2.2-2.2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.4.6A3.1 3.1 0 001.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a3.1 3.1 0 002.2 2.2c1.5.6 8.4.6 8.4.6s6.9 0 8.4-.6a3.1 3.1 0 002.2-2.2c.4-1.5.4-4.7.4-4.7zM10 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  ),
};

function IconButton({ title, href, style, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title={title} className="ck-icon-btn" style={style}
       onMouseDown={(e)=>e.currentTarget.style.transform="scale(0.96)"} onMouseUp={(e)=>e.currentTarget.style.transform="none"}>
      {children}
      <style jsx>{`
        .ck-icon-btn {
          position:absolute; z-index:6; display:inline-flex; align-items:center; justify-content:center;
          border-radius:14px; color:#e8f1ff;
          background:rgba(28,34,48,.55);
          border:1px solid rgba(255,255,255,.16);
          box-shadow:0 12px 28px rgba(0,0,0,.40), inset 0 0 14px rgba(56,182,255,.16), 0 0 18px rgba(252,84,175,.12);
          backdrop-filter:blur(6px); transition:box-shadow .18s, background .18s, transform .12s;
        }
        .ck-icon-btn:hover{ background:rgba(255,255,255,.22); box-shadow:0 14px 38px rgba(0,0,0,.46), 0 0 22px rgba(56,182,255,.24); }
      `}</style>
    </a>
  );
}

export default function SocialIcons({ LINKS, POS }) {
  const s = POS.console;
  const size = s.sizePx;
  const left = `calc(${s.xVw}vw - ${size/2}px)`;
  return (
    <>
      <IconButton title="Instagram" href={LINKS.instagram}
        style={{ left, top:`calc(${s.igYVh}vh - ${size/2}px)`, width:size, height:size }}>
        <Icon.Instagram size={22} />
      </IconButton>
      <IconButton title="TikTok" href={LINKS.tiktok}
        style={{ left, top:`calc(${s.ttYVh}vh - ${size/2}px)`, width:size, height:size }}>
        <Icon.TikTok size={22} />
      </IconButton>
      <IconButton title="YouTube" href={LINKS.youtube}
        style={{ left, top:`calc(${s.ytYVh}vh - ${size/2}px)`, width:size, height:size }}>
        <Icon.YouTube size={22} />
      </IconButton>
    </>
  );
}
