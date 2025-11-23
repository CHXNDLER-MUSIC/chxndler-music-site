export type ElementKey = "water" | "heart" | "lightning" | "darkness";

export const ELEMENT_STYLES: Record<ElementKey, {
  coreColor: string;
  rimColor: string;
  innerGlow: string;
}> = {
  water: {
    coreColor: "#38B6FF",
    rimColor: "#1E6FA3",
    innerGlow: "#9BDEFF",
  },
  heart: {
    coreColor: "#FC54AF",
    rimColor: "#B32473",
    innerGlow: "#FFD1EC",
  },
  lightning: {
    coreColor: "#F2EF1D",
    rimColor: "#E0C91C",
    innerGlow: "#FFFFC2",
  },
  darkness: {
    coreColor: "#000000",
    rimColor: "#111111",
    innerGlow: "#141526",
  },
};