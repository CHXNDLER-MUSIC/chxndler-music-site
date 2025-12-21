import { useState, useEffect, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useProfile } from '@/contexts/ProfileContext';

// Author profile data from profiles table (used for private/authenticated queries)
export type Author = {
  id: string;
  name: string | null;
  profile_image_url: string | null; // mapped from avatar_url
};

export type SoulJournalEntry = {
  entry_id: string;
  user_id: string;
  content: string;
  is_public: boolean;
  created_at: string;
  entry_date: string;
  element: string;
  entry_text: string | null;
  stars_count?: number;
  // Denormalized author fields (for public feed - no profiles join needed)
  author_name?: string | null;
  author_avatar_url?: string | null;
  // Legacy author object (for private queries that still join profiles)
  author?: Author | null;
};

export interface UseSoulJournalEntriesOptions {
  includePrivate?: boolean; // If true, include private entries (requires user to be owner)
  userId?: string; // If provided, only fetch entries from this user
}

export function useSoulJournalEntries(options: UseSoulJournalEntriesOptions = {}) {
  const { user } = useProfile();
  const [entries, setEntries] = useState<SoulJournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchEntries = useCallback(async () => {
    // For public-only queries, do not gate on auth
    const requireUser = options.includePrivate === true;
    if (requireUser && !user?.id) {
      setEntries([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Use different select strings for public vs private queries
      // Public feed: use denormalized author fields (no profiles join - works for anon)
      // Private feed: can join profiles since user is authenticated
      const isPublicFeed = !options.includePrivate;

      const publicSelectString = `
        entry_id,
        user_id,
        entry_text,
        element,
        entry_date,
        created_at,
        is_public,
        stars_count,
        author_name,
        author_avatar_url
      `;

      const privateSelectString = `
        entry_id,
        user_id,
        entry_text,
        element,
        entry_date,
        created_at,
        is_public,
        stars_count,
        author_name,
        author_avatar_url,
        author:profiles!soul_journal_entries_user_id_fkey (
          id,
          name,
          avatar_url
        )
      `;

      const selectString = isPublicFeed ? publicSelectString : privateSelectString;

      let query = supabaseBrowser
        .from('soul_journal_entries')
        .select(selectString)
        .not('entry_text', 'is', null)
        .not('entry_text', 'eq', '')
        .order('created_at', { ascending: false });

      // Filter by specific user if provided (only meaningful when includePrivate or explicit user view)
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      // Handle privacy filtering
      if (isPublicFeed) {
        // Public feed: only fetch public entries; do not depend on current user
        query = query.eq('is_public', true);
      } else {
        // Include private entries owned by the current user along with public entries
        query = query.or(`is_public.eq.true,user_id.eq.${user!.id}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useSoulJournalEntries] Supabase error object:', error);
        console.error('[useSoulJournalEntries] Error code:', error.code);
        console.error('[useSoulJournalEntries] Error message:', error.message);
        console.error('[useSoulJournalEntries] Error details:', error.details);
        setError(`Failed to load entries: ${error.message}`);
        return;
      }

      // Map the data to our expected format
      const mappedEntries: SoulJournalEntry[] = (data || []).map((entry: any) => {
        return {
          entry_id: entry.entry_id,
          user_id: entry.user_id,
          content: entry.entry_text || '',
          is_public: entry.is_public ?? false,
          created_at: entry.created_at,
          entry_date: entry.entry_date,
          element: entry.element,
          entry_text: entry.entry_text,
          stars_count: entry.stars_count ?? 0,
          // Denormalized author fields (always available)
          author_name: entry.author_name ?? null,
          author_avatar_url: entry.author_avatar_url ?? null,
          // Legacy author object (only from private queries with profiles join)
          author: entry.author ? {
            id: entry.author.id,
            name: entry.author.name,
            profile_image_url: entry.author.avatar_url
          } : null
        };
      });

      setEntries(mappedEntries);
    } catch (err) {
      console.error('Error fetching soul journal entries:', err);
      setError(`Failed to load entries: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id, options.userId, options.includePrivate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Function to refresh entries
  const refreshEntries = useCallback(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Function to add a new entry to the local state (for optimistic updates)
  const addEntry = useCallback((entry: SoulJournalEntry) => {
    setEntries(prev => [entry, ...prev]);
  }, []);

  // Function to update an entry in the local state
  const updateEntry = useCallback((entryId: string, updates: Partial<SoulJournalEntry>) => {
    setEntries(prev => prev.map(entry => 
      entry.entry_id === entryId ? { ...entry, ...updates } : entry
    ));
  }, []);

  // Function to remove an entry from the local state
  const removeEntry = useCallback((entryId: string) => {
    setEntries(prev => prev.filter(entry => entry.entry_id !== entryId));
  }, []);

  return {
    entries,
    loading,
    error,
    refreshEntries,
    addEntry,
    updateEntry,
    removeEntry
  };
}

// Hook specifically for public entries - DOES NOT depend on auth/user state
// This works for logged-out (anon) users
export function usePublicSoulJournalEntries() {
  const [entries, setEntries] = useState<SoulJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Public feed query - no profiles join, no auth dependency
      const { data, error: queryError } = await supabaseBrowser
        .from('soul_journal_entries')
        .select(`
          entry_id,
          user_id,
          entry_text,
          element,
          entry_date,
          created_at,
          is_public,
          stars_count,
          author_name,
          author_avatar_url
        `)
        .eq('is_public', true)
        .not('entry_text', 'is', null)
        .not('entry_text', 'eq', '')
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('[usePublicSoulJournalEntries] Error:', queryError);
        setError(`Failed to load entries: ${queryError.message}`);
        return;
      }

      const mappedEntries: SoulJournalEntry[] = (data || []).map((entry: any) => ({
        entry_id: entry.entry_id,
        user_id: entry.user_id,
        content: entry.entry_text || '',
        is_public: true,
        created_at: entry.created_at,
        entry_date: entry.entry_date,
        element: entry.element || 'heart',
        entry_text: entry.entry_text,
        stars_count: entry.stars_count ?? 0,
        author_name: entry.author_name ?? null,
        author_avatar_url: entry.author_avatar_url ?? null,
        author: null // Not using profiles join for public feed
      }));

      setEntries(mappedEntries);
    } catch (err) {
      console.error('[usePublicSoulJournalEntries] Exception:', err);
      setError(`Failed to load entries: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - this query is static

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const refreshEntries = useCallback(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, error, refreshEntries };
}

// Hook specifically for a user's own entries (convenience wrapper)
export function useUserSoulJournalEntries(userId?: string) {
  return useSoulJournalEntries({ includePrivate: true, userId });
}
