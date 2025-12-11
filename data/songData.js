export const songs = [
  { title: "OCEAN GIRL", element: "WATER" },
  { title: "LITTLE BLACK HEART", element: "DARKNESS" },
  { title: "BE MY BEE", element: "HEART" },
  { title: "WE'RE JUST FRIENDS", element: "LIGHTNING" },
  { title: "DEEP WATERS", element: "WATER" },
  { title: "SHADOW DANCE", element: "DARKNESS" },
  { title: "LOVE FREQUENCY", element: "HEART" },
  { title: "ELECTRIC SOUL", element: "LIGHTNING" },
  { title: "TIDAL WAVES", element: "WATER" },
  { title: "MIDNIGHT VOID", element: "DARKNESS" },
  { title: "HEARTBEAT", element: "HEART" },
  { title: "THUNDER STORM", element: "LIGHTNING" }
];

export const elementalPlanets = [
  {
    name: "HEART",
    color: "#FC54AF",
    position: { x: 4, y: 0, z: 0 }
  },
  {
    name: "WATER", 
    color: "#38B6FF",
    position: { x: -4, y: 0, z: 0 }
  },
  {
    name: "LIGHTNING",
    color: "#F2EF1D", 
    position: { x: 0, y: 0, z: 4 }
  },
  {
    name: "DARKNESS",
    color: "#1a001f",
    position: { x: 0, y: 0, z: -4 }
  }
];

export const getSongsForElement = (elementName) => {
  return songs.filter(song => song.element === elementName);
};