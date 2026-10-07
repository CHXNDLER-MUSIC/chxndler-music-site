"use client";

import React, { createContext, forwardRef, useContext, useEffect, useMemo, useRef } from "react";
import { useCardTiltSpin } from "@/hooks/useCardTiltSpin";

/** Imperative controls for a caller that needs to drive rotation from
 * outside a drag gesture (e.g. a tap-to-flip button adding 180deg) without
 * desyncing the hook's own running rotation total. */
export interface TiltSpinCardControls {
  addSpinRotation: (deltaDegrees: number) => void;
}

/** Live tilt of the nearest TiltSpinCard — lets children (e.g. TradingCardFace's
 * holo shine) react to how the card is being held. */
export interface TiltSpinCardTilt {
  rotateX: number;
  rotateY: number;
  maxRotateX: number;
  maxRotateY: number;
  enableSpin: boolean;
  isInteracting: boolean;
}

const TiltContext = createContext<TiltSpinCardTilt | null>(null);

export function useTiltSpinCardTilt(): TiltSpinCardTilt | null {
  return useContext(TiltContext);
}

interface TiltSpinCardProps {
  children: React.ReactNode;
  disabled?: boolean;
  maxRotateX?: number;
  maxRotateY?: number;
  sensitivity?: number;
  returnDuration?: number;
  enableSpin?: boolean;
  spinSensitivity?: number;
  onRotationChange?: (rotation: number) => void;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  tabIndex?: number;
  /** Optional: receives { addSpinRotation } once mounted so a parent can
   * add rotation (e.g. a flip) without desyncing the drag baseline. */
  controlsRef?: React.MutableRefObject<TiltSpinCardControls | null>;
}

/**
 * TiltSpinCard - A wrapper component that adds 2.5D drag-to-spin interaction
 *
 * Features:
 * - Drag left/right to rotate Y axis (±18deg default) or spin 360° in spin mode
 * - Drag up/down to rotate X axis (±10deg default)
 * - Smooth spring animation back to center on release
 * - Keyboard accessible (arrow keys to nudge, Escape to reset)
 * - Works on desktop and mobile
 * - Does not interfere with page scroll
 */
export const TiltSpinCard = forwardRef<HTMLDivElement, TiltSpinCardProps>(
  (
    {
      children,
      disabled = false,
      maxRotateX = 10,
      maxRotateY = 18,
      sensitivity = 0.3,
      returnDuration = 400,
      enableSpin = false,
      spinSensitivity = 0.5,
      onRotationChange,
      className = "",
      style: externalStyle,
      onClick,
      tabIndex = 0,
      controlsRef,
    },
    ref
  ) => {
    // Track if onTap already fired to prevent double-calling onClick
    const tapFiredRef = useRef(false);

    const handleTap = () => {
      tapFiredRef.current = true;
      onClick?.();
      // Reset after a short delay to allow for next interaction
      setTimeout(() => { tapFiredRef.current = false; }, 100);
    };

    const { style: tiltStyle, handlers, wasDragged, addSpinRotation, tiltState } = useCardTiltSpin({
      disabled,
      maxRotateX,
      maxRotateY,
      sensitivity,
      returnDuration,
      enableSpin,
      spinSensitivity,
      onRotationChange,
      onTap: handleTap, // Pass wrapped handler for reliable tap detection
    });

    useEffect(() => {
      if (controlsRef) controlsRef.current = { addSpinRotation };
    }, [controlsRef, addSpinRotation]);

    const tilt = useMemo<TiltSpinCardTilt>(() => ({
      rotateX: tiltState.rotateX,
      rotateY: tiltState.rotateY,
      maxRotateX,
      maxRotateY,
      enableSpin,
      isInteracting: tiltState.isInteracting,
    }), [tiltState.rotateX, tiltState.rotateY, tiltState.isInteracting, maxRotateX, maxRotateY, enableSpin]);

    const combinedStyle: React.CSSProperties = {
      ...tiltStyle,
      ...externalStyle,
    };

    // Backup click handler in case onTap doesn't fire (but skip if onTap already handled it)
    const handleClick = () => {
      if (onClick && !wasDragged() && !tapFiredRef.current) {
        onClick();
      }
    };

    return (
      <div
        ref={ref}
        className={`tilt-spin-card ${className}`}
        style={combinedStyle}
        tabIndex={disabled ? -1 : tabIndex}
        role="img"
        aria-label="Interactive card - drag to rotate, arrow keys to nudge, Escape to reset"
        onClick={handleClick}
        {...handlers}
      >
        <TiltContext.Provider value={tilt}>{children}</TiltContext.Provider>
      </div>
    );
  }
);

TiltSpinCard.displayName = "TiltSpinCard";

export default TiltSpinCard;
