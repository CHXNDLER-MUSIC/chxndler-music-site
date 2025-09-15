"use client";
import React from "react";

type Source = { src: string; type?: string };

type Props = {
  src?: string;                  // optional single source
  srcMp4?: string;               // convenience for MP4
  srcWebm?: string;              // convenience for WebM
  sources?: Source[];            // explicit sources array (overrides src/srcMp4/srcWebm)
  poster?: string;               // poster image to show until intersecting
  autoPlay?: boolean;            // defaults true (muted to allow autoplay)
  muted?: boolean;               // defaults true
  loop?: boolean;                // defaults true
  controls?: boolean;            // defaults false
  playsInline?: boolean;         // defaults true
  preload?: "none" | "metadata" | "auto"; // defaults to "metadata" per request
  className?: string;
  style?: React.CSSProperties;
  onIntersect?: () => void;      // fires once when it becomes visible
  rootMargin?: string;           // IntersectionObserver root margin
  threshold?: number | number[]; // IntersectionObserver threshold
};

/**
 * Lazy loads a <video> when it intersects the viewport.
 * - Shows poster until intersecting
 * - Uses preload="metadata" once activated
 */
export default function LazyVideo({
  src,
  srcMp4,
  srcWebm,
  sources,
  poster,
  autoPlay = true,
  muted = true,
  loop = true,
  controls = false,
  playsInline = true,
  preload = "metadata",
  className,
  style,
  onIntersect,
  rootMargin = "200px 0px", // start a bit early
  threshold = 0.01,
}: Props) {
  const [active, setActive] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const intersectedRef = React.useRef(false);

  React.useEffect(() => {
    if (intersectedRef.current) return; // already intersected
    const el = containerRef.current;
    if (!el || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      // No IO support → activate immediately
      intersectedRef.current = true;
      setActive(true);
      try { onIntersect && onIntersect(); } catch {}
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          intersectedRef.current = true;
          setActive(true);
          try { onIntersect && onIntersect(); } catch {}
          io.disconnect();
          break;
        }
      }
    }, { root: null, rootMargin, threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [onIntersect, rootMargin, threshold]);

  const resolvedSources: Source[] = React.useMemo(() => {
    if (Array.isArray(sources) && sources.length) return sources;
    const out: Source[] = [];
    if (srcMp4) out.push({ src: srcMp4, type: "video/mp4" });
    if (srcWebm) out.push({ src: srcWebm, type: "video/webm" });
    if (src) out.push({ src });
    return out;
  }, [sources, src, srcMp4, srcWebm]);

  return (
    <div ref={containerRef} className={className} style={style}>
      {active ? (
        <video
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          playsInline={playsInline as any}
          preload={preload}
          poster={poster}
          // prevent some default interactions on mobile browsers
          controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
          disablePictureInPicture
          // @ts-ignore - Safari specific
          disableRemotePlayback
        >
          {resolvedSources.map((s, i) => (
            <source key={i} src={s.src} {...(s.type ? { type: s.type } : {})} />
          ))}
        </video>
      ) : (
        poster ? (
          // Use <img> for consistent poster display prior to activation
          <img src={poster} alt="video poster" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          // Fallback empty box maintains layout
          <div />
        )
      )}
    </div>
  );
}

