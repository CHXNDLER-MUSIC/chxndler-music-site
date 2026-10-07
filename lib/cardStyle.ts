// Shared trading-card geometry. Card art is 716×1000 — real trading-card
// proportions (63×88mm) — so every card view uses this exact shape.
export const CARD_ASPECT_RATIO = "63 / 88";

// 3mm corner radius on a 63×88mm card, as % of width / % of height so the
// corners stay circular at any rendered size.
export const CARD_CORNER_RADIUS = "4.76% / 3.41%";

// For a card <img> inside a positioned box of any shape: the image keeps its
// own card proportions, scales to the largest size that fits, centers itself,
// and rounds its real corners. Parent must be `position: relative` with a size.
export const CARD_THUMB_IMG_STYLE = {
  position: "absolute",
  inset: 0,
  margin: "auto",
  width: "auto",
  height: "auto",
  maxWidth: "100%",
  maxHeight: "100%",
  borderRadius: CARD_CORNER_RADIUS,
} as const;
