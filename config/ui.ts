// config/ui.ts
export const BRAND = { yellow: "#F2EF1D", pink: "#FC54AF", blue: "#38B6FF" };

export const glow = {
  base: "shadow-[0_0_12px_rgba(255,255,255,0.35)]",
  pulse: "animate-[pulse_2.2s_ease-in-out_infinite]",
  ring: "ring-1 ring-white/10",
};

export const cockpit = {
  // keeps cover art small + embedded
  cover: {
    width: 180,          // px
    tilt: 6,             // deg
    hologramOpacity: 0.55,
    glass: "bg-white/4 backdrop-blur-md border border-white/10",
  },
  // global button styling
  btn: {
    radius: "rounded-2xl",
    pad: "px-4 py-2",
    font: "font-medium tracking-wide",
    on:  "brightness-110",
    off: "opacity-80 hover:opacity-100",
  },
  // z-index rails so nothing overlaps wrong
  z: { hud: 40, dash: 30, holo: 25, stars: 10 },
};
