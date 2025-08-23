type EventParams = Record<string, any>;

export function track(event: string, params: EventParams = {}) {
  // GA4
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", event, params);
  } else if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", event, params);
  }

  // Meta Pixel (trackCustom)
  if (typeof window !== "undefined" && (window as any).fbq) {
    try {
      (window as any).fbq("trackCustom", event, params);
    } catch {}
  }
}
