type EventParams = Record<string, any>;
export function track(event: string, params: EventParams = {}) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", event, params);
  } else if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", event, params);
  }
}
