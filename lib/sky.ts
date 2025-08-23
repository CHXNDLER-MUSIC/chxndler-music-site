/** Build per-track sky paths. If missing, we fall back to the intro galaxy. */
export function skyFor(slug?: string) {
  if (!slug) return { key: "_intro", webm: "/skies/_intro-galaxy.webm", mp4: "/skies/_intro-galaxy.mp4" };
  return {
    key: slug,
    webm: `/skies/${slug}.webm`,
    mp4:  `/skies/${slug}.mp4`,
  };
}
export const introSky = { key: "_intro", webm: "/skies/_intro-galaxy.webm", mp4: "/skies/_intro-galaxy.mp4" };
