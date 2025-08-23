"use client";

import React from "react";
import { THEME as T } from "../config/theme";
import { FaSpotify, FaApple, FaYoutube } from "react-icons/fa";

function DockButton({ href, title, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="dock-btn"
      title={title}
    >
      {children}
      <style jsx>{`
        .dock-btn {
          display:flex;
          align-items:center;
          justify-content:center;
          width:50px;
          height:50px;
          border-radius:12px;
          background:${T.colors.surface};
          border:1px solid ${T.colors.borderHud};
          box-shadow:${T.shadow.deepHud},${T.shadow.rimAccent};
          color:${T.colors.text};
          transition:all .2s ease;
          margin:6px 0;
        }
        .dock-btn:hover {
          background:${T.colors.railHover};
          color:${T.colors.accent};
          box-shadow:${T.shadow.deepHover},0 0 12px ${T.colors.accent};
          transform:scale(1.05);
        }
        .dock-btn:active { transform:scale(0.95); }
      `}</style>
    </a>
  );
}

export default function MediaDock({ links }) {
  return (
    <div className="dock">
      <DockButton href={links.spotify} title="Listen on Spotify">
        <FaSpotify size={24} />
      </DockButton>
      <DockButton href={links.apple} title="Listen on Apple Music">
        <FaApple size={24} />
      </DockButton>
      <DockButton href={links.youtube} title="Watch on YouTube">
        <FaYoutube size={24} />
      </DockButton>
      <style jsx>{`
        .dock {
          position:absolute;
          bottom:18vh;   /* adjust to align with cockpit console */
          left:50%;
          transform:translateX(-50%);
          display:flex;
          gap:16px;
          z-index:4;
        }
      `}</style>
    </div>
  );
}
