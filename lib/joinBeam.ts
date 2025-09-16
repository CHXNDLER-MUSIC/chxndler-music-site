// Shared constants and helpers for aligning the Join hub beam and panels

export const BEAM_TOP_RATIO = 0.26; // beam top offset from hub top, relative to size
export const BEAM_WIDTH_RATIO = 2.0; // beam width relative to hub size
export const BEAM_HEIGHT_RATIO = 0.5; // beam height relative to hub size
export const BEAM_LEFT_OFFSET_RATIO = -0.5; // beam left offset relative to hub size

export function beamTopPx(size: number): number {
  return Math.round(size * BEAM_TOP_RATIO);
}

export function beamBottomOffsetPx(size: number): number {
  // Distance from hub bottom to beam top
  return Math.round(size - size * BEAM_TOP_RATIO);
}

export function beamWidthPx(size: number): number {
  return Math.round(size * BEAM_WIDTH_RATIO);
}

export function beamHeightPx(size: number): number {
  return Math.round(size * BEAM_HEIGHT_RATIO);
}

export function beamLeftPx(size: number): number {
  return Math.round(size * BEAM_LEFT_OFFSET_RATIO);
}

