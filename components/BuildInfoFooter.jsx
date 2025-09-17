"use client";

import { buildInfo } from "../lib/buildInfo";

export default function BuildInfoFooter() {
  const d = new Date(buildInfo.date);
  const time = isNaN(d.getTime()) ? buildInfo.date : d.toLocaleString();

  return (
    <div
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 9999,
        padding: "0.25rem 0.5rem",
        background: "rgba(31,41,55,0.75)",
        color: "#e5e7eb",
        fontSize: "0.7rem",
        borderRadius: "0.25rem",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        letterSpacing: "0.02em",
        display: "flex",
        gap: "0.45rem",
        alignItems: "center",
        backdropFilter: "blur(6px)",
      }}
      title={`Built ${buildInfo.date} (${buildInfo.env})`}
    >
      <span>{buildInfo.env.toUpperCase()}</span>
      <span>•</span>
      <span>#{buildInfo.sha}</span>
      <span>•</span>
      <span>{time}</span>
      {buildInfo.branch !== 'unknown' && (
        <>
          <span>•</span>
          <span>{buildInfo.branch}</span>
        </>
      )}
    </div>
  );
}

