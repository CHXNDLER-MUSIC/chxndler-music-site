// app/opengraph-image.jsx
import { ImageResponse } from "next/og";

// 1200×630 Open Graph image
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  // Brand colors
  const BLUE = "#38B6FF";
  const PINK = "#FC54AF";
  const YELLOW = "#F2EF1D";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          color: "#fff",
          background:
            "linear-gradient(135deg, #0b0719 0%, #2b0f3a 50%, #120a1f 100%)",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        }}
      >
        {/* brand glows */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              `radial-gradient(600px 400px at 15% 20%, ${BLUE}40, transparent 60%),
               radial-gradient(600px 400px at 85% 80%, ${PINK}40, transparent 60%)`,
          }}
        />

        {/* tiny stars */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(1px 1px at 10% 30%, rgba(255,255,255,0.8), transparent 40%), radial-gradient(1px 1px at 30% 70%, rgba(255,255,255,0.7), transparent 40%), radial-gradient(1px 1px at 60% 40%, rgba(255,255,255,0.7), transparent 40%), radial-gradient(1px 1px at 80% 60%, rgba(255,255,255,0.6), transparent 40%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 24,
            padding: 80,
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            CHXNDLER
          </div>

          <div style={{ fontSize: 28, opacity: 0.9 }}>
            Listen • Follow • Enter the Heartverse
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
            {Chip({ label: "Spotify", color: BLUE })}
            {Chip({ label: "Apple Music", color: BLUE })}
            {Chip({ label: "Instagram", color: PINK })}
            {Chip({ label: "TikTok", color: PINK })}
            {Chip({ label: "YouTube", color: PINK })}
          </div>

          <div style={{ marginTop: 40, fontSize: 26, color: YELLOW }}>
            chxndler-music.com
          </div>
        </div>
      </div>
    ),
    size
  );
}

function Chip({ label, color }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "10px 16px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.06)",
        boxShadow: `inset 0 0 0 1px ${color}66`,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          marginRight: 8,
        }}
      />
      <span style={{ fontSize: 24 }}>{label}</span>
    </div>
  );
}
