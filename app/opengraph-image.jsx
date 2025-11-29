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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0b0b1f",
        }}
      >
        <img
          src="https://chxndler.world/icons/chxndler-og-1200x630.png"
          alt="CHXNDLER - The Heartverse"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    ),
    size
  );
}
