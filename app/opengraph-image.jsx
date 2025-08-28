// app/opengraph-image.jsx
import { ImageResponse } from "next/og";

export const runtime = "edge"; // required for OG
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          // Allowed styles only (Satori-safe)
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          color: "white",
          backgroundColor: "#0b0b1f",
          fontSize: 64,
          fontWeight: 700,
        }}
      >
        CHXNDLER — Starship
      </div>
    ),
    size
  );
}
