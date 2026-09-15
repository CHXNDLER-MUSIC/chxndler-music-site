// One smooth-scroll helper shared by the nav and both hero CTAs, so
// "HEAR THE WORK" / "START A PROJECT" / nav links all behave identically and
// all respect prefers-reduced-motion the same way (native CSS
// `scroll-behavior: smooth` doesn't reliably defer to that preference across
// browsers, so this checks it directly rather than relying on CSS alone).
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}
