import { useState, useEffect, useCallback } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { 
  getActivePoll, 
  castVote as castVoteHelper, 
  SongPoll,
  getUserVotesForPoll,
  SongPollVote
} from '@/lib/songVoting';

interface UseSongVotingReturn {
  activePoll: SongPoll | null;
  isLoading: boolean;
  error: string | null;
  userVotes: SongPollVote[];
  castVote: (optionId: string, heartcoinsToSpend: number) => Promise<void>;
  refreshActivePoll: () => Promise<void>;
  isVoting: boolean;
}

export function useSongVoting(): UseSongVotingReturn {
  const { user, profile, refreshProfile } = useProfile();
  const [activePoll, setActivePoll] = useState<SongPoll | null>(null);
  const [userVotes, setUserVotes] = useState<SongPollVote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active poll and user votes
  const loadActivePoll = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const poll = await getActivePoll(supabaseBrowser, user.id);
      setActivePoll(poll);

      // If there's an active poll, load user's votes for it
      if (poll && user.id) {
        try {
          const votes = await getUserVotesForPoll(supabaseBrowser, user.id, poll.id);
          setUserVotes(votes);
        } catch (votesError) {
          console.error('Error loading user votes:', votesError);
          // Don't fail the whole operation if votes can't be loaded
          setUserVotes([]);
        }
      } else {
        setUserVotes([]);
      }
    } catch (err) {
      console.error('Error loading active poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to load active poll');
      setActivePoll(null);
      setUserVotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Cast a vote
  const castVote = useCallback(async (optionId: string, heartcoinsToSpend: number) => {
    if (!user || !activePoll) {
      throw new Error('Must be logged in and have an active poll to vote');
    }

    if (!profile) {
      throw new Error('Profile not loaded');
    }

    setIsVoting(true);
    setError(null);

    try {
      // Call the backend helper to cast the vote
      const updatedPoll = await castVoteHelper(
        supabaseBrowser,
        user.id,
        activePoll.id,
        optionId,
        heartcoinsToSpend
      );

      // Update the local state with the new poll data
      setActivePoll(updatedPoll);

      // Refresh user votes
      const votes = await getUserVotesForPoll(supabaseBrowser, user.id, updatedPoll.id);
      setUserVotes(votes);

      // Refresh the user's profile to update HeartCoin balance
      await refreshProfile();

      // Show success via toast if available
      if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: {
            message: `Successfully voted with ${heartcoinsToSpend} HeartCoins!`,
            type: 'success'
          }
        }));
      }

    } catch (err) {
      console.error('Error casting vote:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to cast vote';
      setError(errorMessage);

      // Show error via toast if available
      if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: {
            message: errorMessage,
            type: 'error'
          }
        }));
      }

      throw err;
    } finally {
      setIsVoting(false);
    }
  }, [user, profile, activePoll, refreshProfile]);

  // Refresh active poll (public API)
  const refreshActivePoll = useCallback(async () => {
    await loadActivePoll();
  }, [loadActivePoll]);

  // Load poll on mount and when user changes
  useEffect(() => {
    loadActivePoll();
  }, [loadActivePoll]);

  // Subscribe to real-time updates for active polls
  useEffect(() => {
    if (!user || !activePoll) return;

    const channel = supabaseBrowser
      .channel(`song-polls:${activePoll.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'song_poll_votes',
          filter: `poll_id=eq.${activePoll.id}`
        },
        (payload) => {
          if (process.env.NODE_ENV !== "production") console.log('Song poll vote update:', payload);
          // Refresh the poll data when votes change
          loadActivePoll();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'song_poll_options',
          filter: `poll_id=eq.${activePoll.id}`
        },
        (payload) => {
          if (process.env.NODE_ENV !== "production") console.log('Song poll option update:', payload);
          // Refresh the poll data when options change
          loadActivePoll();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'song_polls',
          filter: `id=eq.${activePoll.id}`
        },
        (payload) => {
          if (process.env.NODE_ENV !== "production") console.log('Song poll status update:', payload);
          // Refresh if poll status changes
          loadActivePoll();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [user, activePoll?.id, loadActivePoll]);

  // Subscribe to new active polls
  useEffect(() => {
    if (!user) return;

    const channel = supabaseBrowser
      .channel('active-polls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'song_polls',
          filter: 'is_live=eq.true'
        },
        (payload) => {
          if (process.env.NODE_ENV !== "production") console.log('New active poll created:', payload);
          loadActivePoll();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [user, loadActivePoll]);

  return {
    activePoll,
    isLoading,
    error,
    userVotes,
    castVote,
    refreshActivePoll,
    isVoting
  };
}