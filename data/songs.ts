export type Song = {
  id: string;
  title: string;
  oneLiner: string;
  coverUrl?: string;
  planet: {
    radius: number; // 0.2–1.4
    color: string;
    orbitRadius: number; // 1–6
    orbitSpeed: number; // radians/sec
    tilt: number; // radians
    textureUrl?: string;
  };
};

export const songs: Song[] = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    oneLiner: "Love flows back like the tide.",
    coverUrl: "/cover/ocean-girl-cover.png",
    planet: { radius: 1.1, color: "#38B6FF", orbitRadius: 2.6, orbitSpeed: 0.45, tilt: 0.22 },
  },
  { id: "alone", title: "Alone", oneLiner: "Echoes in a quiet room.", planet: { radius: 0.8, color: "#000000", orbitRadius: 3.4, orbitSpeed: 0.32, tilt: 0.15 } },
  { id: "baby", title: "Baby", oneLiner: "Sugar-glow neon lullaby.", planet: { radius: 0.9, color: "#FC54AF", orbitRadius: 2.1, orbitSpeed: 0.55, tilt: 0.18 } },
  { id: "be-my-bee", title: "Be My Bee", oneLiner: "Buzzing hearts align.", planet: { radius: 0.7, color: "#FC54AF", orbitRadius: 4.2, orbitSpeed: 0.28, tilt: 0.2 } },
  { id: "night-drive", title: "Night Drive", oneLiner: "City lights on chrome.", planet: { radius: 0.85, color: "#33E9FF", orbitRadius: 5.2, orbitSpeed: 0.25, tilt: 0.1 } },
  { id: "starlight", title: "Starlight", oneLiner: "Skies sing in cyan.", planet: { radius: 0.6, color: "#5BE6FF", orbitRadius: 1.6, orbitSpeed: 0.75, tilt: 0.12 } },
  { id: "horizon", title: "Horizon", oneLiner: "Sun meets sea.", planet: { radius: 1.0, color: "#29D9FF", orbitRadius: 2.9, orbitSpeed: 0.4, tilt: 0.25 } },
  { id: "afterglow", title: "Afterglow", oneLiner: "Warm neon fades.", planet: { radius: 0.7, color: "#47E4FF", orbitRadius: 3.8, orbitSpeed: 0.36, tilt: 0.14 } },
  { id: "midnight", title: "Midnight", oneLiner: "The city’s heartbeat.", planet: { radius: 0.95, color: "#6FF7FF", orbitRadius: 2.3, orbitSpeed: 0.52, tilt: 0.2 } },
  { id: "tidal", title: "Tidal", oneLiner: "Currents pull close.", planet: { radius: 0.65, color: "#3DF5FF", orbitRadius: 4.8, orbitSpeed: 0.27, tilt: 0.18 } },
  { id: "drift", title: "Drift", oneLiner: "Waves of weightless time.", planet: { radius: 0.75, color: "#8BF9FF", orbitRadius: 3.1, orbitSpeed: 0.42, tilt: 0.16 } },
];
