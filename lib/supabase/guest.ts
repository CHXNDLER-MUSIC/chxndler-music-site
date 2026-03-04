import { supabaseClient } from '@/lib/supabaseClient';

// LocalStorage key for guest identity
const GUEST_ID_KEY = 'heartverse_guest_id';
const GUEST_USERNAME_KEY = 'heartverse_guest_username';

export interface GuestIdentity {
  guest_id: string;
  username: string;
}

/**
 * Generate a random guest ID (UUID format)
 */
function generateGuestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `guest_${crypto.randomUUID()}`;
  }
  // Fallback for environments without crypto.randomUUID
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a random guest name (ALIEN + 6 digits)
 */
function generateGuestName(): string {
  const alienNumber = Math.floor(Math.random() * 999999) + 1;
  return `ALIEN${alienNumber.toString().padStart(6, '0')}`;
}

/**
 * SYNCHRONOUS: Get or create guest ID from localStorage.
 * Safe to call during useState initialization.
 * Returns a placeholder on server, real value on client.
 */
export function getOrCreateGuestIdSync(): string {
  if (typeof window === 'undefined') {
    return 'guest_ssr_placeholder';
  }

  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = generateGuestId();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

/**
 * SYNCHRONOUS: Get or create guest name from localStorage.
 * Safe to call during useState initialization.
 * Returns a placeholder on server, real value on client.
 */
export function getOrCreateGuestNameSync(): string {
  if (typeof window === 'undefined') {
    return 'ALIEN0000000';
  }

  let guestName = localStorage.getItem(GUEST_USERNAME_KEY);
  if (!guestName) {
    guestName = generateGuestName();
    localStorage.setItem(GUEST_USERNAME_KEY, guestName);
  }
  return guestName;
}

/**
 * SYNCHRONOUS: Get stable guest identity for immediate use.
 * Creates identity if it doesn't exist.
 */
export function getOrCreateGuestIdentitySync(): GuestIdentity {
  return {
    guest_id: getOrCreateGuestIdSync(),
    username: getOrCreateGuestNameSync(),
  };
}

/**
 * Get or create a stable guest identity for logged-out users.
 * - Checks localStorage for existing guest_id
 * - If missing, calls supabase.rpc("create_guest_profile") to create one
 * - Stores the guest_id and username in localStorage for persistence
 * - Returns the guest identity (guest_id and username)
 */
export async function getOrCreateGuestIdentity(): Promise<GuestIdentity> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    throw new Error('getOrCreateGuestIdentity must be called from the browser');
  }

  // Check localStorage for existing guest_id
  const storedGuestId = localStorage.getItem(GUEST_ID_KEY);
  const storedUsername = localStorage.getItem(GUEST_USERNAME_KEY);

  if (storedGuestId && storedUsername) {
    // Verify this ID is actually registered in guest_profiles before trusting it.
    // IDs created by getOrCreateGuestIdSync() are localStorage-only and won't be in the DB.
    try {
      const { data, error } = await supabaseClient
        .from('guest_profiles')
        .select('guest_id')
        .eq('guest_id', storedGuestId)
        .maybeSingle();

      if (!error && data) {
        // ID is registered — safe to use
        if (process.env.NODE_ENV !== "production") console.log('🔥 Using verified guest identity from localStorage:', { guest_id: storedGuestId, username: storedUsername });
        return { guest_id: storedGuestId, username: storedUsername };
      }

      // Not in DB — stale/local-only ID. Clear it and fall through to create a new registered one.
      if (process.env.NODE_ENV !== "production") console.warn('🔥 Stale guest_id not found in DB, clearing and registering new identity:', storedGuestId);
      localStorage.removeItem(GUEST_ID_KEY);
      localStorage.removeItem(GUEST_USERNAME_KEY);
    } catch {
      // DB check failed (network error, offline) — use cached ID optimistically.
      // The API route will handle unregistered IDs gracefully.
      if (process.env.NODE_ENV !== "production") console.warn('🔥 Could not verify guest_id, using cached identity optimistically');
      return { guest_id: storedGuestId, username: storedUsername };
    }
  }

  // If we have a guest_id but no username, try to fetch the username
  if (storedGuestId && !storedUsername) {
    try {
      const { data, error } = await supabaseClient
        .from('guest_profiles')
        .select('username')
        .eq('guest_id', storedGuestId)
        .single();

      if (!error && data?.username) {
        localStorage.setItem(GUEST_USERNAME_KEY, data.username);
        if (process.env.NODE_ENV !== "production") console.log('🔥 Recovered guest username from DB:', data.username);
        return {
          guest_id: storedGuestId,
          username: data.username,
        };
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.warn('Failed to recover guest username, creating new identity');
    }
  }

  // Create new guest profile via RPC
  if (process.env.NODE_ENV !== "production") console.log('🔥 Creating new guest identity via RPC...');

  try {
    const { data, error } = await supabaseClient.rpc('create_guest_profile');

    if (error) {
      console.error('Error creating guest profile:', error);
      throw error;
    }

    if (!data || !data.guest_id || !data.username) {
      throw new Error('Invalid response from create_guest_profile RPC');
    }

    const { guest_id, username } = data;

    // Store in localStorage for persistence across sessions
    localStorage.setItem(GUEST_ID_KEY, guest_id);
    localStorage.setItem(GUEST_USERNAME_KEY, username);

    if (process.env.NODE_ENV !== "production") console.log('🔥 Created new guest identity:', { guest_id, username });

    return {
      guest_id,
      username,
    };
  } catch (error) {
    console.error('Failed to create guest identity:', error);

    // Fallback: generate a local-only identity (won't be in DB but allows UI to work)
    const fallbackGuestId = crypto.randomUUID();
    const alienNumber = Math.floor(Math.random() * 99999999) + 1;
    const fallbackUsername = `ALIEN${alienNumber.toString().padStart(8, '0')}`;

    localStorage.setItem(GUEST_ID_KEY, fallbackGuestId);
    localStorage.setItem(GUEST_USERNAME_KEY, fallbackUsername);

    if (process.env.NODE_ENV !== "production") console.log('🔥 Using fallback guest identity:', { guest_id: fallbackGuestId, username: fallbackUsername });

    return {
      guest_id: fallbackGuestId,
      username: fallbackUsername,
    };
  }
}

/**
 * Get the current guest identity from localStorage without creating a new one.
 * Returns null if no guest identity exists.
 */
export function getGuestIdentity(): GuestIdentity | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const guestId = localStorage.getItem(GUEST_ID_KEY);
  const username = localStorage.getItem(GUEST_USERNAME_KEY);

  if (guestId && username) {
    return {
      guest_id: guestId,
      username,
    };
  }

  return null;
}

/**
 * Clear the guest identity from localStorage.
 * Useful when a user logs in and we want to switch to their authenticated identity.
 */
export function clearGuestIdentity(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(GUEST_ID_KEY);
  localStorage.removeItem(GUEST_USERNAME_KEY);
  if (process.env.NODE_ENV !== "production") console.log('🔥 Cleared guest identity from localStorage');
}

/**
 * Check if a guest identity exists in localStorage.
 */
export function hasGuestIdentity(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return !!localStorage.getItem(GUEST_ID_KEY);
}
