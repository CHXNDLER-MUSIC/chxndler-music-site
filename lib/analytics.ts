const KEY = 'chx_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = ([1e7]+-1e3+-4e3+-8e3+-1e11 as any).replace(/[018]/g, (c: string) =>
      (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
    );
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function track(
  event_type: string,
  data: { page?: string; referrer?: string; song_slug?: string; payload?: any } = {}
) {
  if (typeof window === 'undefined') return;

  const session_id = getOrCreateSessionId();
  const page = data.page || window.location.pathname + window.location.search;
  const referrer = data.referrer || document.referrer || '';

  fetch('/api/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      session_id,
      event_type,
      page,
      referrer,
      song_slug: data.song_slug,
      payload: data.payload ?? null,
    }),
  }).catch(() => {});
}

export function trackPageView() {
  track('page_view');
}