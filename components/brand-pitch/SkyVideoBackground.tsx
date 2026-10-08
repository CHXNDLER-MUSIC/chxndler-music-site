"use client";

import React, { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { parseYouTubeId, toAutoplayingYouTubeEmbed } from "@/lib/youtube";

/**
 * A song's cockpit sky video as a dimmed, muted, looping backdrop that
 * fills whatever box it's placed in (MediaViewerModal's `background` slot).
 * Same embed + poster approach as SkyboxVideo: the YouTube thumbnail shows
 * until the iframe loads, then the video fades in. Reduced-motion users get
 * the still frame only.
 *
 * Layout uses grid stacking and container units rather than absolute
 * positioning: `container-type: size` also keeps the oversized 16:9 iframe
 * from affecting the height of the box it sits in.
 */
export default function SkyVideoBackground({ url }: { url: string }) {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  const { embedUrl, thumbUrl } = useMemo(() => {
    const id = parseYouTubeId(url);
    return {
      embedUrl: toAutoplayingYouTubeEmbed(url),
      thumbUrl: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
    };
  }, [url]);

  if (!embedUrl && !thumbUrl) return null;

  // 16:9 "cover" sizing: at least as wide and as tall as the box.
  const coverSize: React.CSSProperties = {
    flex: "none",
    width: "max(100cqw, 177.78cqh)",
    height: "max(100cqh, 56.25cqw)",
  };

  return (
    <div aria-hidden="true" className="pointer-events-none grid h-full w-full overflow-hidden" style={{ containerType: "size" }}>
      {thumbUrl && (
        <div className="[grid-area:1/1] flex items-center justify-center overflow-hidden">
          <img
            src={thumbUrl}
            alt=""
            className="object-cover"
            style={{ ...coverSize, opacity: ready && !reduceMotion ? 0 : 1, transition: "opacity 400ms ease" }}
            data-no-lazy=""
          />
        </div>
      )}
      {embedUrl && !reduceMotion && (
        <div className="[grid-area:1/1] flex items-center justify-center overflow-hidden">
          <iframe
            src={embedUrl}
            title="Background video"
            allow="autoplay; encrypted-media; picture-in-picture"
            tabIndex={-1}
            onLoad={() => setReady(true)}
            style={{ ...coverSize, border: 0, opacity: ready ? 1 : 0, transition: "opacity 600ms ease" }}
          />
        </div>
      )}
      {/* Scrim — keeps the title, lyrics and controls readable over any sky. */}
      <div
        className="[grid-area:1/1]"
        style={{ background: "linear-gradient(to bottom, rgba(16,16,20,0.6), rgba(16,16,20,0.82) 45%, rgba(16,16,20,0.92))" }}
      />
    </div>
  );
}
