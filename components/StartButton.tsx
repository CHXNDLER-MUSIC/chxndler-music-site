'use client';

import { forwardRef } from 'react';

type Props = {
  onClick?: () => void;
  /** px — matches the homepage cockpit's fixed START size (140 * 1.02). */
  size?: number;
  /** blue pulse animation (on by default, like the homepage before first click). */
  pulse?: boolean;
  className?: string;
  ariaLabel?: string;
};

/**
 * The exact blue circular CHXNDLER START button from the homepage cockpit
 * (see components/SteeringWheelOverlay.tsx — the `wheel-play chx` variant).
 *
 * Same asset (/elements/start.webp), same class names, same DOM shape, and the
 * `.wheel-play.chx` / `.chx-icon` / `.start-pulse` rules are copied VERBATIM
 * from that component's styled-jsx block so the glow, hover and pulse are
 * pixel-identical. It lives here as its own component so the homepage and the
 * post-tip Heartverse screen share one implementation instead of approximating.
 */
const StartButton = forwardRef<HTMLButtonElement, Props>(function StartButton(
  { onClick, size = 143, pulse = true, className = '', ariaLabel = 'Start' },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      draggable={false}
      onDragStart={(e) => {
        try {
          e.preventDefault();
        } catch {}
      }}
      className={`wheel-play chx no-spotlight${pulse ? ' start-pulse' : ''} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
    >
      <span className="glyph" aria-hidden>
        <img
          src="/elements/start.webp?v=20250915c"
          alt="Start"
          className="chx-icon"
          draggable={false}
          onError={(e) => {
            try {
              const img = e.currentTarget;
              img.onerror = null;
              img.src = '/elements/start.webp';
            } catch {}
          }}
        />
      </span>

      {/* Verbatim from components/SteeringWheelOverlay.tsx so the button is
          identical on the homepage and here. */}
      <style jsx>{`
        .wheel-play {
          position: relative;
          display: grid;
          place-items: center;
          font-size: 22px;
          font-weight: 700;
          color: #00ffd0;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.18);
          transition: transform 0.12s ease, box-shadow 0.18s ease, filter 0.18s ease;
          overflow: visible;
        }
        .wheel-play.chx {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          position: relative;
          cursor: pointer;
          transform: translateZ(0);
          will-change: transform, box-shadow;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .wheel-play.chx::before,
        .wheel-play.chx::after {
          display: none !important;
          content: none !important;
        }
        .chx-icon {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          will-change: transform, filter;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))
            drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))
            drop-shadow(0 0 12px rgba(25, 227, 255, 0.4));
          animation: none;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .wheel-play.chx.start-pulse .chx-icon {
          animation: startPulse 1.9s ease-in-out infinite;
        }
        @keyframes startPulse {
          0%,
          100% {
            transform: scale(1);
            filter: saturate(1.25) brightness(1.1) drop-shadow(0 0 8px #19e3ff)
              drop-shadow(0 0 22px #19e3ff) drop-shadow(0 0 42px #19e3ff);
          }
          50% {
            transform: scale(1.08);
            filter: saturate(1.5) brightness(1.22) drop-shadow(0 0 16px #19e3ff)
              drop-shadow(0 0 40px #19e3ff) drop-shadow(0 0 84px #19e3ff);
          }
        }
        .glyph {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transform: translateY(1px);
          width: 100%;
          height: 100%;
        }
        .wheel-play.chx:hover {
          outline: none;
          transform: scale(1.06) translateZ(0);
          filter: brightness(1.12) saturate(1.2);
        }
        .wheel-play.chx:hover .chx-icon {
          transform: scale(1.04);
          filter: brightness(1.15) saturate(1.3)
            drop-shadow(0 0 8px rgba(25, 227, 255, 0.8))
            drop-shadow(0 0 16px rgba(25, 227, 255, 0.5));
        }
        .wheel-play.chx:active {
          transform: translateY(-1px) scale(0.98) translateZ(0);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3),
            0 0 15px rgba(25, 227, 255, 0.4);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .wheel-play.chx .chx-icon {
          transition: transform 0.12s ease, filter 0.15s ease;
        }
      `}</style>
    </button>
  );
});

export default StartButton;
