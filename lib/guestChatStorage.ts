// Lightweight local persistence for guest (logged-out) chat messages.
// Ensures guest messages remain visible when the chat panel is closed/reopened
// even if the server fetch fails or the admin key is unavailable.

type StoredMessage = {
  // Guest identity key used for scoping entries
  gk: string; // guest key
  un: string; // username (display name)
  msg: string; // message text
  ca: string; // created_at ISO string
  dk?: string | null; // dedupe_key
  cn?: string | null; // client_nonce
  id?: string | null; // server id, if reconciled
  sys?: boolean; // is_system flag
};

const LS_KEY = 'heart_signal_local_messages_v1';
const MAX_PER_GUEST = 200; // keep a reasonable cap per guest
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function safeGet(): StoredMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((it) => it && typeof it === 'object');
  } catch {
    return [];
  }
}

function safeSet(all: StoredMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(all.slice(-1000)));
  } catch {
    // ignore quota or serialization errors
  }
}

function guestKey(guestId?: string | null, guestName?: string | null): string {
  const id = (guestId || '').trim();
  const nm = (guestName || '').trim();
  return id ? `gid:${id}` : (nm ? `gn:${nm}` : 'guest:unknown');
}

export function makeGuestKey(guestId?: string | null, guestName?: string | null): string {
  return guestKey(guestId, guestName);
}

export function loadGuestMessages(gk: string, max: number = 100): StoredMessage[] {
  const now = Date.now();
  const all = safeGet();
  const filtered = all.filter((m) => m.gk === gk && (now - Date.parse(m.ca)) <= MAX_AGE_MS);
  // return newest last (ascending by created_at)
  return filtered.sort((a, b) => Date.parse(a.ca) - Date.parse(b.ca)).slice(-max);
}

export function saveGuestMessage(params: {
  guestKey: string;
  username: string;
  message: string;
  createdAtISO: string;
  dedupeKey?: string | null;
  clientNonce?: string | null;
  isSystem?: boolean;
}) {
  const { guestKey, username, message, createdAtISO, dedupeKey, clientNonce, isSystem } = params;
  const all = safeGet();

  // Prune old entries for this guest first
  const now = Date.now();
  const pruned = all.filter((m) => (now - Date.parse(m.ca)) <= MAX_AGE_MS);

  // Keep last MAX_PER_GUEST for this guest after inserting
  const next: StoredMessage = {
    gk: guestKey,
    un: username,
    msg: message,
    ca: createdAtISO,
    dk: dedupeKey || null,
    cn: clientNonce || null,
    id: null,
    sys: Boolean(isSystem),
  };

  pruned.push(next);

  // Enforce cap per guest
  const perGuest: StoredMessage[] = pruned.filter((m) => m.gk === guestKey);
  if (perGuest.length > MAX_PER_GUEST) {
    const excess = perGuest.length - MAX_PER_GUEST;
    let removed = 0;
    // Remove oldest for this guest
    pruned.sort((a, b) => Date.parse(a.ca) - Date.parse(b.ca));
    for (let i = 0; i < pruned.length && removed < excess; i++) {
      const it = pruned[i];
      if (it.gk === guestKey) {
        pruned.splice(i, 1);
        removed++;
        i--;
      }
    }
  }

  safeSet(pruned);
}

export function updateGuestMessage(
  gk: string,
  matcher: { dedupeKey?: string | null; clientNonce?: string | null },
  updates: { id?: string | null; createdAtISO?: string | null }
) {
  const all = safeGet();
  let changed = false;
  for (let i = 0; i < all.length; i++) {
    const m = all[i];
    if (m.gk !== gk) continue;
    const matchesDK = matcher.dedupeKey && m.dk && m.dk === matcher.dedupeKey;
    const matchesCN = matcher.clientNonce && m.cn && m.cn === matcher.clientNonce;
    if (matchesDK || matchesCN) {
      if (typeof updates.id !== 'undefined') m.id = updates.id;
      if (updates.createdAtISO) m.ca = updates.createdAtISO;
      all[i] = m;
      changed = true;
    }
  }
  if (changed) safeSet(all);
}

export function toNormalizedMessages(
  rows: StoredMessage[]
): Array<{
  id: string | null;
  user_id: string | null;
  username: string;
  message: string;
  message_type: 'message' | 'join' | 'leave';
  created_at: string;
  dedupe_key?: string | null;
  client_nonce?: string | null;
  user_profile: { name: string; element: 'alien'; avatar_badge_id: null; profile_image_url: null };
}> {
  return rows.map((r) => ({
    id: r.id || null,
    user_id: null,
    username: r.un,
    message: r.msg,
    message_type: r.sys ? 'join' : 'message',
    created_at: r.ca,
    dedupe_key: r.dk || null,
    client_nonce: r.cn || null,
    user_profile: {
      name: r.un,
      element: 'alien',
      avatar_badge_id: null,
      profile_image_url: null,
    },
  }));
}

