import { useState, useEffect, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useProfile } from '@/contexts/ProfileContext';

// Updated types with joined profile data
export type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

export type SoulJournalEntry = {
  entry_id: string;
  user_id: string;
  content: string;
  is_public: boolean;
  created_at: string;
  entry_date: string;
  element: string;
  soul_star: string | null;
  profiles?: Profile | null;
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
    if (!user?.id) {
      setEntries([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Build query for journal entries with profile joins
      let query = supabaseBrowser
        .from('soul_journal_entries')
        .select(`
          entry_id,
          user_id,
          soul_star,
          element,
          entry_date,
          created_at,
          is_public,
          profiles (
            id,
            name,
            profile_image_url
          )
        `)
        .not('soul_star', 'is', null)
        .not('soul_star', 'eq', '')
        .order('created_at', { ascending: false });

      // Filter by specific user if provided
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      // Handle privacy filtering
      if (!options.includePrivate) {
        // Show only public entries
        query = query.eq('is_public', true);
      } else {
        // Show both public entries and private entries owned by current user
        query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch soul journal entries:', error);
        setError(`Failed to load entries: ${error.message}`);
        return;
      }

      // Map the data to our expected format
      const mappedEntries: SoulJournalEntry[] = (data || []).map((entry: any) => ({
        entry_id: entry.entry_id,
        user_id: entry.user_id,
        content: entry.soul_star || '',
        is_public: entry.is_public ?? false,
        created_at: entry.created_at,
        entry_date: entry.entry_date,
        element: entry.element,
        soul_star: entry.soul_star,
        profiles: entry.profiles ? {
          id: entry.profiles.id,
          name: entry.profiles.name,
          avatar_url: entry.profiles.profile_image_url
        } : null
      }));

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
