import { useState, useEffect, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useProfile } from '@/contexts/ProfileContext';

// Author profile data from public_profiles view
export type Author = {
  id: string;
  name: string | null;
  profile_image_url: string | null;
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

      // Build query for journal entries with author from public_profiles_table
      let query = supabaseBrowser
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
          author:public_profiles_table!soul_journal_entries_user_id_public_profiles_table_fkey (
            id,
            name,
            profile_image_url
          )
        `)
        .not('entry_text', 'is', null)
        .not('entry_text', 'eq', '')
        .order('created_at', { ascending: false });

      // Filter by specific user if provided (only meaningful when includePrivate or explicit user view)
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      // Handle privacy filtering
      if (!options.includePrivate) {
        // Public feed: only fetch public entries; do not depend on current user
        query = query.eq('is_public', true);
      } else {
        // Include private entries owned by the current user along with public entries
        query = query.or(`is_public.eq.true,user_id.eq.${user!.id}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch soul journal entries:', error);
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
          author: entry.author ? {
            id: entry.author.id,
            name: entry.author.name,
            profile_image_url: entry.author.profile_image_url
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

// Hook specifically for public entries (convenience wrapper)
export function usePublicSoulJournalEntries() {
  return useSoulJournalEntries({ includePrivate: false });
}

// Hook specifically for a user's own entries (convenience wrapper)
export function useUserSoulJournalEntries(userId?: string) {
  return useSoulJournalEntries({ includePrivate: true, userId });
}
