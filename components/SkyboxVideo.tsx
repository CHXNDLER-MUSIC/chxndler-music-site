"use client";
import React, { useRef, useState } from "react";
import { sfx } from "@/lib/sfx";
import { DEBUG_MEDIA, dlog } from "@/lib/debug";

export default function SkyboxVideo({
  brightness = 0.95,
  srcWebm,
  // Default to empty to avoid 404 when sky videos are missing
  srcMp4 = "",
  videoKey,
  offsetY = "2vh",
  flySignal,
  onFlyStart,
  onFlyEnd,
  allowWarp = false,
  onBasePlaying,
  holdLightspeed = false,
  readyToReveal = false,
  minDurationMs = 1200,
  onWarpSfxEnd,
  youtubeUrl,
  lightspeedYoutubeUrl,
}:{
  brightness?: number;
  srcWebm?: string;
  srcMp4?: string;
  videoKey?: string;
  offsetY?: number | string; // shift video vertically, e.g. "-6vh" or -40 (px)
  flySignal?: number; // increment to trigger brief zoom/fly effect
  onFlyStart?: () => void;
  onFlyEnd?: () => void;
  allowWarp?: boolean; // if false, disables warp sfx/overlay even when flySignal changes
  onBasePlaying?: () => void; // fires when base sky video is playing (useful after warp)
  holdLightspeed?: boolean; // if true, keep lightspeed overlay visible until readyToReveal becomes true
  readyToReveal?: boolean;  // when holdLightspeed, hide overlay when this becomes true
  minDurationMs?: number;   // minimum duration the lightspeed overlay should remain visible
  onWarpSfxEnd?: () => void; // callback after warp SFX finishes
  youtubeUrl?: string;      // optional YouTube URL to use as background instead of MP4
  lightspeedYoutubeUrl?: string; // optional YouTube URL for lightspeed overlay instead of local MP4
}) {
  // Default to visible to avoid missing sky if loadeddata doesn't fire
  const [ready, setReady] = useState(true);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  const translateY = typeof offsetY === "number" ? `${offsetY}px` : offsetY;
  const [flying, setFlying] = useState(false);
  // Ensure warp overlay is visible on first paint when allowed,
  // preventing a brief flash of the base video (e.g., BABY YouTube) before warp starts
  const [showLightspeed, setShowLightspeed] = useState(!!allowWarp);
  const baseRef = useRef<HTMLVideoElement|null>(null);
  const lsRef = useRef<HTMLVideoElement|null>(null);
  const basePlayNotified = React.useRef<string | null>(null);
  const lsTimerRef = useRef<number | undefined>(undefined);
  const lsStartRef = useRef<number | null>(null);
  const flyEndCalledRef = useRef(false);
  const firstRunRef = useRef(true);
  const warpSoundPlayingRef = useRef(false);
  // Track when warp audio has finished (for coordinating with visual timing)
  const warpAudioFinishedRef = useRef(false);
  // Track when min duration timer has elapsed
  const minDurationElapsedRef = useRef(false);
  // Stable ref for onWarpSfxEnd callback
  const onWarpSfxEndRef = useRef(onWarpSfxEnd);
  React.useEffect(() => { onWarpSfxEndRef.current = onWarpSfxEnd; }, [onWarpSfxEnd]);
  // Track if onWarpSfxEnd has been called (prevent double calls)
  const warpSfxEndCalledRef = useRef(false);

  // Helper to check if we should fire onWarpSfxEnd (both audio and visual must be done)
  const maybeFireWarpSfxEnd = () => {
    if (warpSfxEndCalledRef.current) return; // Already called
    if (!warpAudioFinishedRef.current) return; // Audio not done yet
    if (!minDurationElapsedRef.current) return; // Visual not done yet
    warpSfxEndCalledRef.current = true;
    try { onWarpSfxEndRef.current && onWarpSfxEndRef.current(); } catch {}
  };
  // Stable refs for callback props to avoid effect thrash on each render
  const onFlyEndRef = useRef(onFlyEnd);
  const onBasePlayingRef = useRef(onBasePlaying);
  React.useEffect(() => { onFlyEndRef.current = onFlyEnd; }, [onFlyEnd]);
  React.useEffect(() => { onBasePlayingRef.current = onBasePlaying; }, [onBasePlaying]);
  // Compute YouTube autoplay embed if provided
  const { ytEmbedUrl, ytThumbUrl } = React.useMemo(() => {
    try {
      if (!youtubeUrl) {
        return { ytEmbedUrl: null as string | null, ytThumbUrl: null as string | null };
      }
      const { toAutoplayingYouTubeEmbed, parseYouTubeId } = require("@/lib/youtube");
      const embed = toAutoplayingYouTubeEmbed(String(youtubeUrl));
      const id = parseYouTubeId(String(youtubeUrl));
      const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
      return { ytEmbedUrl: embed, ytThumbUrl: thumb };
    } catch (err) {
      console.error('[SkyboxVideo] Error computing embed:', err);
      return { ytEmbedUrl: null, ytThumbUrl: null };
    }
  }, [youtubeUrl]);

  // Log only when youtubeUrl actually changes
  const prevYoutubeUrlRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (youtubeUrl !== prevYoutubeUrlRef.current) {
      if (DEBUG_MEDIA) dlog('[SkyboxVideo] youtubeUrl changed:', { from: prevYoutubeUrlRef.current, to: youtubeUrl, ytEmbedUrl });
      prevYoutubeUrlRef.current = youtubeUrl;
    }
  }, [youtubeUrl, ytEmbedUrl]);
  const [ytReady, setYtReady] = React.useState(false);
  // Lightspeed YouTube embed (optional)
  const { lsYtEmbedUrl, lsYtThumbUrl } = React.useMemo(() => {
    try {
      if (!lightspeedYoutubeUrl) return { lsYtEmbedUrl: null as string | null, lsYtThumbUrl: null as string | null };
      const { toAutoplayingYouTubeEmbed, parseYouTubeId } = require("@/lib/youtube");
      const embed = toAutoplayingYouTubeEmbed(String(lightspeedYoutubeUrl));
      const id = parseYouTubeId(String(lightspeedYoutubeUrl));
      const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
      return { lsYtEmbedUrl: embed, lsYtThumbUrl: thumb };
    } catch { return { lsYtEmbedUrl: null, lsYtThumbUrl: null }; }
  }, [lightspeedYoutubeUrl]);
  const [lsYtReady, setLsYtReady] = React.useState(false);
  
  // When using YouTube for the base sky, only signal base-playing after the warp overlay hides
  React.useEffect(() => {
    if (!ytEmbedUrl) return;
    if (!ytReady) return;
    if (showLightspeed) return;
    const key = String(videoKey || 'yt');
    if (basePlayNotified.current === key) return;
    basePlayNotified.current = key;
    try { onBasePlayingRef.current && onBasePlayingRef.current(); } catch {}
  }, [ytEmbedUrl, ytReady, showLightspeed, videoKey]);
  
  // Reduce video preloading on constrained devices (mobile/save-data/slow link)
  const lightMode = React.useMemo(() => {
    try {
      const conn: any = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
      const saveData = !!conn?.saveData;
      const effType: string = String(conn?.effectiveType || '').toLowerCase();
      const slowLink = effType.includes('2g') || effType.includes('3g');
      const isSmallScreen = typeof window !== 'undefined' ? (window.innerWidth <= 768) : false;
      return saveData || slowLink || isSmallScreen;
    } catch { return false; }
  }, []);
  
  // Brief zoom/blur to simulate flying to another world
  // Do not trigger on initial mount; only on subsequent flySignal changes
  const flyInitRef = React.useRef(false);
  React.useEffect(() => {
    if (DEBUG_MEDIA) dlog('🎬 SkyboxVideo flySignal effect:', { flySignal, allowWarp, showLightspeed });
    if (!flyInitRef.current) { flyInitRef.current = true; return; }
    if (typeof flySignal !== 'number') return;
    if (!allowWarp) return; // Don't trigger warp effect if warp is disabled
    if (warpSoundPlayingRef.current) return; // Prevent double warp sounds
    // Brief camera zoom/blur
    setFlying(true);
    const t = setTimeout(() => setFlying(false), 700);

    // Trigger lightspeed overlay clip
    try {
      setShowLightspeed(true);
      lsStartRef.current = Date.now();
      // Reset coordination refs for new warp
      warpAudioFinishedRef.current = false;
      minDurationElapsedRef.current = false;
      warpSfxEndCalledRef.current = false;
      const v = lsRef.current;
      if (v) { try { v.currentTime = 0; } catch {} void v.play().catch(()=>{}); }
      // Check if warp sound was already played externally (e.g., by Start button)
      const warpAlreadyPlayed = typeof window !== 'undefined' && (window as any).__WARP_SOUND_PLAYED;
      if (warpAlreadyPlayed) {
        // Clear the flag for next warp
        (window as any).__WARP_SOUND_PLAYED = false;
        // Warp was already played - just wait for its duration (~2.5s) then mark as finished
        warpSoundPlayingRef.current = true;
        setTimeout(() => {
          warpSoundPlayingRef.current = false;
          warpAudioFinishedRef.current = true;
          maybeFireWarpSfxEnd();
        }, 2500); // Approximate warp.mp3 duration
      } else {
        // Play warp sound normally with slight delay to sync with lightspeed video
        setTimeout(() => {
          try {
            warpSoundPlayingRef.current = true;
            sfx.playAndWait('warp', 0.7).then(() => {
              warpSoundPlayingRef.current = false;
              warpAudioFinishedRef.current = true;
              maybeFireWarpSfxEnd();
            }).catch(() => {
              warpSoundPlayingRef.current = false;
              warpAudioFinishedRef.current = true;
              maybeFireWarpSfxEnd();
            });
          } catch {
            warpSoundPlayingRef.current = false;
            warpAudioFinishedRef.current = true;
            maybeFireWarpSfxEnd();
          }
        }, 100);
      }
      flyEndCalledRef.current = false;
      if (onFlyStart) try { onFlyStart(); } catch {}
      if (!holdLightspeed) {
        if (lsTimerRef.current !== undefined) window.clearTimeout(lsTimerRef.current);
        // Timed lightspeed overlay when not holding for readiness
        lsTimerRef.current = window.setTimeout(() => {
          setShowLightspeed(false);
          lsTimerRef.current = undefined;
          if (!flyEndCalledRef.current && onFlyEndRef.current) { try { onFlyEndRef.current(); } catch {} }
          flyEndCalledRef.current = true;
          // Mark min duration as elapsed and check if we can fire onWarpSfxEnd
          minDurationElapsedRef.current = true;
          maybeFireWarpSfxEnd();
        }, Math.max(0, minDurationMs));
      } else {
        // When holding for readiness, ensure overlay remains until readyToReveal becomes true
        if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; }
      }
    } catch {}

    return () => { clearTimeout(t); if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; } };
  }, [flySignal, allowWarp, showLightspeed, holdLightspeed, minDurationMs, lsYtEmbedUrl]);

  // Disable auto warp on initial page open unless allowWarp is true
  React.useEffect(() => {
    if (!allowWarp) { firstRunRef.current = false; return; }
    if (!firstRunRef.current) return;
    if (warpSoundPlayingRef.current) return; // Prevent double warp sounds
    firstRunRef.current = false;
    try {
      setShowLightspeed(true);
      lsStartRef.current = Date.now();
      // Reset coordination refs for new warp
      warpAudioFinishedRef.current = false;
      minDurationElapsedRef.current = false;
      warpSfxEndCalledRef.current = false;
      // Start lightspeed overlay video only when using local MP4 overlay
      if (!lsYtEmbedUrl) {
        const v = lsRef.current;
        if (v) { try { v.currentTime = 0; } catch {} void v.play().catch(()=>{}); }
      }
      // Check if warp sound was already played externally (e.g., by Start button)
      const warpAlreadyPlayed2 = typeof window !== 'undefined' && (window as any).__WARP_SOUND_PLAYED;
      if (warpAlreadyPlayed2) {
        // Clear the flag for next warp
        (window as any).__WARP_SOUND_PLAYED = false;
        // Warp was already played - just wait for its duration (~2.5s) then mark as finished
        warpSoundPlayingRef.current = true;
        setTimeout(() => {
          warpSoundPlayingRef.current = false;
          warpAudioFinishedRef.current = true;
          maybeFireWarpSfxEnd();
        }, 2500); // Approximate warp.mp3 duration
      } else {
        // Play warp sound normally with slight delay to sync with lightspeed video
        setTimeout(() => {
          try {
            warpSoundPlayingRef.current = true;
            sfx.playAndWait('warp', 0.7).then(() => {
              warpSoundPlayingRef.current = false;
              warpAudioFinishedRef.current = true;
              maybeFireWarpSfxEnd();
            }).catch(() => {
              warpSoundPlayingRef.current = false;
              warpAudioFinishedRef.current = true;
              maybeFireWarpSfxEnd();
            });
          } catch {
            warpSoundPlayingRef.current = false;
            warpAudioFinishedRef.current = true;
            maybeFireWarpSfxEnd();
          }
        }, 100);
      }
      if (!holdLightspeed) {
        if (lsTimerRef.current !== undefined) window.clearTimeout(lsTimerRef.current);
        lsTimerRef.current = window.setTimeout(() => {
          setShowLightspeed(false);
          lsTimerRef.current = undefined;
          // Mark min duration as elapsed and check if we can fire onWarpSfxEnd
          minDurationElapsedRef.current = true;
          maybeFireWarpSfxEnd();
        }, Math.max(0, minDurationMs));
      } else {
        if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; }
      }
    } catch {}
    return () => { if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; } };
  }, [allowWarp, holdLightspeed, minDurationMs, lsYtEmbedUrl]);

  // When holding overlay, hide it as soon as readyToReveal is true
  React.useEffect(() => {
    if (!holdLightspeed) return;
    if (!showLightspeed) return;
    if (!readyToReveal) return;
    const startedAt = lsStartRef.current || Date.now();
    const elapsed = Date.now() - startedAt;
    const remain = Math.max(0, minDurationMs - elapsed);
    if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; }
    lsTimerRef.current = window.setTimeout(() => {
      setShowLightspeed(false);
      lsTimerRef.current = undefined;
      if (!flyEndCalledRef.current && onFlyEndRef.current) { try { onFlyEndRef.current(); } catch {} }
      flyEndCalledRef.current = true;
      // Mark min duration as elapsed and check if we can fire onWarpSfxEnd
      minDurationElapsedRef.current = true;
      maybeFireWarpSfxEnd();
    }, remain);
  }, [holdLightspeed, readyToReveal, showLightspeed, minDurationMs]);

  // Pause base sky video while lightspeed overlay is active
  React.useEffect(() => {
    try {
      const base = baseRef.current;
      if (!base) return;
      if (showLightspeed) {
        base.pause();
      } else {
        // resume base silently and start loading if not already
        if (!hasStartedLoading) {
          setHasStartedLoading(true);
        }
        void base.play().catch(()=>{});
      }
    } catch {}
  }, [showLightspeed, hasStartedLoading]);

  // Start loading video as soon as videoKey changes (preload)
  React.useEffect(() => {
    const base = baseRef.current;
    if (!base || !videoKey) return;
    
    // Start loading the new video immediately
    try {
      base.load(); // Force reload with new source
      setHasStartedLoading(true);
      // Start preloading
      base.preload = 'auto';
    } catch {}
  }, [videoKey]);

  // Notify when the base sky starts playing (once per videoKey)
  React.useEffect(() => {
    const base = baseRef.current;
    if (!base) return;
    const key = String(videoKey || '');
    const onPlaying = () => {
      if (showLightspeed) return; // ignore while overlay is visible
      if (basePlayNotified.current === key) return;
      basePlayNotified.current = key;
      try { if (DEBUG_MEDIA) dlog('Skybox base video onplaying', { key, srcMp4 }); onBasePlayingRef.current && onBasePlayingRef.current(); } catch {}
    };
    base.addEventListener('playing', onPlaying);
    return () => { base.removeEventListener('playing', onPlaying); };
  }, [videoKey, showLightspeed, srcMp4]);

  return (
    /* z-10 so it's above any page bg image; HUD slots are z>=30 */
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      <div className="h-full w-full">
        {/* Base background: YouTube iframe (if provided) else MP4/webm */}
        {ytEmbedUrl ? (
          <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            {/* Poster image for instant paint while iframe initializes */}
            {ytThumbUrl && !ytReady ? (
              <div
                aria-hidden
                style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: '177.78vh', height: '100vh', minWidth: '100vw', minHeight: '56.25vw',
                  filter: `brightness(${brightness})${flying ? ' saturate(1.1) blur(1.2px)' : ''}`,
                }}
              >
                <img src={ytThumbUrl}
                     alt=""
                     style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : null}
            {/* 16:9 cover sizing */}
            <div
              style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '177.78vh', height: '100vh', minWidth: '100vw', minHeight: '56.25vw',
                opacity: showLightspeed ? 0 : 1,
                filter: `brightness(${brightness})${flying ? ' saturate(1.1) blur(1.2px)' : ''}`,
                transition: 'opacity 300ms ease, transform 650ms ease, filter 650ms ease',
              }}
            >
              <iframe
                key={`yt-${videoKey || 'home'}`}
                src={ytEmbedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="Background video"
                loading="eager"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ display: 'block', border: 0, width: '100%', height: '100%' }}
                onLoad={() => { setYtReady(true); }}
              />
            </div>
          </div>
        ) : (
          <video
            ref={baseRef}
            key={`vid-${videoKey || 'home'}`}
            autoPlay muted loop playsInline preload={lightMode ? 'metadata' : 'auto'} controls={false}
            // Prevent any default interactions that could open the video URL
            // on some mobile browsers when tapping during/after warp
            controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
            disablePictureInPicture
            // @ts-ignore: Safari-specific remote playback disable
            disableRemotePlayback
            tabIndex={-1}
            // Removed manual loop handling - let native loop attribute handle seamless looping
            onLoadStart={() => setHasStartedLoading(true)}
            onLoadedData={() => setReady(true)}
            onCanPlay={() => setReady(true)}
            onCanPlayThrough={() => setReady(true)}
            onPlaying={() => setReady(true)} // Ensure video stays visible during playback
            className="h-full w-full object-cover"
            style={{
              opacity: (ready && !showLightspeed) ? 1 : 0,
              transition: showLightspeed ? 'opacity 300ms ease, transform 650ms ease, filter 650ms ease' : 'transform 650ms ease, filter 650ms ease', // Only transition opacity during warp
              filter: `brightness(${brightness})${flying ? ' saturate(1.1) blur(1.2px)' : ''}`,
              transform: `translateY(${translateY}) scale(${flying ? 1.12 : 1})`,
              pointerEvents: 'none'
            }}
          >
            {/* Prefer MP4 first to avoid 404s if WebM is missing */}
            {srcMp4 ? <source src={srcMp4} type="video/mp4" /> : null}
            {srcWebm ? <source src={srcWebm} type="video/webm" /> : null}
          </video>
        )}

        {/* Lightspeed transition overlay (pre-mounted for instant playback; opacity toggled) */}
        {/* Lightspeed overlay: YouTube iframe if provided, else local MP4 */}
        {lsYtEmbedUrl ? (
          <div className="absolute inset-0" style={{ pointerEvents: 'none', opacity: showLightspeed ? 1 : 0, transition: 'opacity 220ms ease' }}>
            {/* Poster until iframe ready */}
            {lsYtThumbUrl && !lsYtReady ? (
              <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '177.78vh', height: '100vh', minWidth: '100vw', minHeight: '56.25vw' }}>
                <img src={lsYtThumbUrl} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', filter: `brightness(${Math.max(0.9, brightness)})` }} />
              </div>
            ) : null}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '177.78vh', height: '100vh', minWidth: '100vw', minHeight: '56.25vw' }}>
              <iframe
                src={lsYtEmbedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="Lightspeed"
                loading="eager"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ display: 'block', border: 0, width: '100%', height: '100%', filter: `brightness(${Math.max(0.9, brightness)})` }}
                onLoad={() => setLsYtReady(true)}
              />
            </div>
          </div>
        ) : (
          /* CSS-based warp effect — no local MP4 exists, avoid 404 for /skies/lightspeed.mp4 */
          <div
            className="absolute inset-0 h-full w-full"
            style={{
              opacity: showLightspeed ? 0.8 : 0,
              transition: 'opacity 220ms ease',
              pointerEvents: 'none',
              background: 'radial-gradient(circle at center, rgba(252, 84, 175, 0.3) 0%, rgba(252, 84, 175, 0.1) 50%, transparent 100%)',
              animation: showLightspeed ? 'pulse 0.6s ease-in-out infinite alternate' : 'none'
            }}
          />
        )}

      </div>
    </div>
  );
}
