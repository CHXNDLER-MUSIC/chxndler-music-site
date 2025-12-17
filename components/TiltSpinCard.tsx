"use client";

import React, { forwardRef } from "react";
import { useCardTiltSpin } from "@/hooks/useCardTiltSpin";

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
    },
    ref
  ) => {
    const { style: tiltStyle, handlers } = useCardTiltSpin({
      disabled,
      maxRotateX,
      maxRotateY,
      sensitivity,
      returnDuration,
      enableSpin,
      spinSensitivity,
      onRotationChange,
      onTap: onClick, // Pass onClick as onTap for reliable tap detection
    });

    const combinedStyle: React.CSSProperties = {
      ...tiltStyle,
      ...externalStyle,
    };

    return (
      <div
        ref={ref}
        className={`tilt-spin-card ${className}`}
        style={combinedStyle}
        tabIndex={disabled ? -1 : tabIndex}
        role="img"
        aria-label="Interactive card - drag to rotate, arrow keys to nudge, Escape to reset"
        {...handlers}
      >
        {children}
      </div>
    );
  }
);

TiltSpinCard.displayName = "TiltSpinCard";

export default TiltSpinCard;
