/**
 * Semantic campaign color system for the /brands/[slug] template.
 *
 * A campaign pitch's background_color/accent_color/secondary_color are
 * treated as bold campaign colors (e.g. Oatly's sky blue + hot pink) that
 * solid editorial sections sit directly on — not a neutral page canvas with
 * a tint. Every derived tone and its correct contrasting text color are
 * computed here once, so no component has to guess whether white or dark
 * text is legible on a given brand's arbitrary color choice.
 */
import type { BrandPitch } from "@/lib/brandPitch";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(num)) throw new Error("not a hex color");
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.round(Math.min(255, Math.max(0, v)));
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}

/** Blend two hex colors — `ratio` is the weight (0-1) of `a`. Falls back to
 * `a` on malformed input rather than crashing the page. */
function mixHex(a: string, b: string, ratio: number): string {
  try {
    const [ar, ag, ab] = hexToRgb(a);
    const [br, bg, bb] = hexToRgb(b);
    return rgbToHex(ar * ratio + br * (1 - ratio), ag * ratio + bg * (1 - ratio), ab * ratio + bb * (1 - ratio));
  } catch {
    return a;
  }
}

function relativeLuminance(hex: string): number {
  try {
    const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
    const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  } catch {
    return 0; // unparsable input — assume dark, which defaults to (legible) white text
  }
}

/** WCAG-luminance-based, not a per-brand assumption — works for any future
 * brand's arbitrary color choice, not just the ones seen so far. */
export function getContrastText(hex: string): string {
  return relativeLuminance(hex) > 0.5 ? "#111111" : "#ffffff";
}

export type PitchPalette = {
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  secondary: string;
  onSecondary: string;
  light: string;
  onLight: string;
  dark: string;
  onDark: string;
};

export function buildPitchPalette(pitch: BrandPitch): PitchPalette {
  // Generic template defaults (not tied to any one brand) — a pitch that
  // omits a color still gets a coherent, legible look.
  const primary = pitch.background_color || "#fbfaf7";
  const accent = pitch.accent_color || "#FC54AF";
  const secondary = pitch.secondary_color || mixHex(accent, primary, 0.45);
  const light = mixHex("#ffffff", primary, 0.6);
  const dark = mixHex("#000000", primary, 0.35);

  return {
    primary,
    onPrimary: getContrastText(primary),
    accent,
    onAccent: getContrastText(accent),
    secondary,
    onSecondary: getContrastText(secondary),
    light,
    onLight: getContrastText(light),
    dark,
    onDark: getContrastText(dark),
  };
}
