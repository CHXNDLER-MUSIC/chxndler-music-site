import { SupabaseClient } from '@supabase/supabase-js';
import { logHeartcoinTransaction } from '@/utils/heartcoins';

export interface SongPoll {
  id: string;
  created_by: string;
  title: string;
  status: 'open' | 'closed';
  created_at: string;
  closes_at: string | null;
  is_live: boolean;
  options: SongPollOption[];
}

export interface SongPollOption {
  id: string;
  poll_id: string;
  song_slug: string;
  song_title: string;
  element: 'HEART' | 'WATER' | 'LIGHTNING' | 'DARKNESS';
  sort_order: number;
  total_heartcoins: number;
  created_at: string;
}

export interface SongPollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  heartcoins_spent: number;
  created_at: string;
}

export interface CreatePollPayload {
  title: string;
  options: {
    song_slug: string;
    song_title: string;
    element: 'HEART' | 'WATER' | 'LIGHTNING' | 'DARKNESS';
  }[];
  closes_at?: string;
}

/**
 * Get the currently active poll with its options
 * @param supabase Supabase client
 * @param userId Current user ID (optional, for checking user's existing votes)
 * @returns Active poll with options or null if no active poll
 */
export async function getActivePoll(
  supabase: SupabaseClient,
  userId?: string
): Promise<SongPoll | null> {
  try {
    const { data: poll, error: pollError } = await supabase
      .from('song_polls')
      .select('*')
      .eq('status', 'open')
      .eq('is_live', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pollError) {
      console.error('Error fetching active poll:', pollError);
      throw new Error(`Failed to fetch active poll: ${pollError.message}`);
    }

    if (!poll) {
      return null;
    }

    // Fetch poll options
    const { data: options, error: optionsError } = await supabase
      .from('song_poll_options')
      .select('*')
      .eq('poll_id', poll.id)
      .order('sort_order', { ascending: true });

    if (optionsError) {
      console.error('Error fetching poll options:', optionsError);
      throw new Error(`Failed to fetch poll options: ${optionsError.message}`);
    }

    return {
      ...poll,
      options: options || []
    };
  } catch (error) {
    console.error('Error in getActivePoll:', error);
    throw error;
  }
}

/**
 * Create a new poll with four song options
 * @param supabase Supabase client
 * @param creatorUserId User ID of the poll creator
 * @param payload Poll data with four song options
 * @returns Created poll with options
 */
export async function createPoll(
  supabase: SupabaseClient,
  creatorUserId: string,
  payload: CreatePollPayload
): Promise<SongPoll> {
  try {
    if (payload.options.length !== 4) {
      throw new Error('Poll must have exactly 4 song options');
    }

    // Validate that we have one option for each element
    const elements = payload.options.map(opt => opt.element);
    const uniqueElements = new Set(elements);
    const expectedElements = new Set(['HEART', 'WATER', 'LIGHTNING', 'DARKNESS']);
    
    if (uniqueElements.size !== 4 || !Array.from(expectedElements).every(el => uniqueElements.has(el))) {
      throw new Error('Poll must have one option for each element: HEART, WATER, LIGHTNING, DARKNESS');
    }

    // Close any existing live polls first
    await supabase
      .from('song_polls')
      .update({ 
        status: 'closed',
        is_live: false 
      })
      .eq('status', 'open')
      .eq('is_live', true);

    // Create the poll
    const { data: poll, error: pollError } = await supabase
      .from('song_polls')
      .insert({
        created_by: creatorUserId,
        title: payload.title,
        status: 'open',
        is_live: true,
        closes_at: payload.closes_at || null
      })
      .select()
      .single();

    if (pollError) {
      console.error('Error creating poll:', pollError);
      throw new Error(`Failed to create poll: ${pollError.message}`);
    }

    // Create poll options
    const optionsToInsert = payload.options.map((option, index) => ({
      poll_id: poll.id,
      song_slug: option.song_slug,
      song_title: option.song_title,
      element: option.element,
      sort_order: index,
      total_heartcoins: 0
    }));

    const { data: options, error: optionsError } = await supabase
      .from('song_poll_options')
      .insert(optionsToInsert)
      .select();

    if (optionsError) {
      console.error('Error creating poll options:', optionsError);
      // Clean up the poll if options failed
      await supabase.from('song_polls').delete().eq('id', poll.id);
      throw new Error(`Failed to create poll options: ${optionsError.message}`);
    }

    return {
      ...poll,
      options: options || []
    };
  } catch (error) {
    console.error('Error in createPoll:', error);
    throw error;
  }
}

/**
 * Close a poll
 * @param supabase Supabase client
 * @param pollId Poll ID to close
 * @returns Success status
 */
export async function closePoll(
  supabase: SupabaseClient,
  pollId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('song_polls')
      .update({
        status: 'closed',
        is_live: false
      })
      .eq('id', pollId);

    if (error) {
      console.error('Error closing poll:', error);
      throw new Error(`Failed to close poll: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in closePoll:', error);
    throw error;
  }
}

/**
 * Cast a vote on a poll option
 * @param supabase Supabase client
 * @param userId User ID casting the vote
 * @param pollId Poll ID
 * @param optionId Option ID to vote for
 * @param heartcoinsToSpend Number of HeartCoins to spend
 * @returns Updated poll with new vote totals
 */
export async function castVote(
  supabase: SupabaseClient,
  userId: string,
  pollId: string,
  optionId: string,
  heartcoinsToSpend: number
): Promise<SongPoll> {
  try {
    if (heartcoinsToSpend <= 0) {
      throw new Error('HeartCoins amount must be positive');
    }

    // Check user's current balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('heartcoin_balance')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    const currentBalance = profile?.heartcoin_balance || 0;
    if (currentBalance < heartcoinsToSpend) {
      throw new Error('You do not have enough HeartCoins to vote that much');
    }

    // Verify the poll is still open and live
    const { data: poll, error: pollCheckError } = await supabase
      .from('song_polls')
      .select('id, status, is_live')
      .eq('id', pollId)
      .single();

    if (pollCheckError) {
      console.error('Error checking poll status:', pollCheckError);
      throw new Error('Failed to verify poll status');
    }

    if (!poll || poll.status !== 'open' || !poll.is_live) {
      throw new Error('This poll is no longer active');
    }

    // Verify the option belongs to this poll
    const { data: option, error: optionError } = await supabase
      .from('song_poll_options')
      .select('id')
      .eq('id', optionId)
      .eq('poll_id', pollId)
      .single();

    if (optionError || !option) {
      throw new Error('Invalid poll option');
    }

    // Debit HeartCoins via transaction insert
    await logHeartcoinTransaction(supabase, {
      user_id: userId,
      amount: -heartcoinsToSpend,
      reason: 'SONG_VOTE',
      description: 'Song poll vote',
      transaction_type: 'debit',
      metadata: {
        poll_id: pollId,
        option_id: optionId,
        amount: heartcoinsToSpend,
        source: 'song_vote'
      }
    });

    // Record the vote
    const { error: voteError } = await supabase
      .from('song_poll_votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: userId,
        heartcoins_spent: heartcoinsToSpend
      });

    if (voteError) {
      console.error('Error recording vote:', voteError);
      // Try to refund the HeartCoins if vote recording failed
      try {
        await logHeartcoinTransaction(supabase, {
          user_id: userId,
          amount: heartcoinsToSpend,
          reason: 'SONG_VOTE_REFUND',
          description: 'Refund for song poll vote',
          transaction_type: 'credit',
          metadata: {
            poll_id: pollId,
            option_id: optionId,
            amount: heartcoinsToSpend,
            source: 'song_vote_refund'
          }
        });
      } catch (refundError) {
        console.error('Failed to refund HeartCoins after vote error:', refundError);
      }
      throw new Error(`Failed to record vote: ${voteError.message}`);
    }

    // The database trigger should update total_heartcoins automatically,
    // but let's fetch the updated poll to return current state
    const updatedPoll = await getActivePoll(supabase, userId);
    if (!updatedPoll || updatedPoll.id !== pollId) {
      throw new Error('Failed to retrieve updated poll data');
    }

    return updatedPoll;
  } catch (error) {
    console.error('Error in castVote:', error);
    throw error;
  }
}

/**
 * Get user's votes for a specific poll
 * @param supabase Supabase client
 * @param userId User ID
 * @param pollId Poll ID
 * @returns Array of user's votes for this poll
 */
export async function getUserVotesForPoll(
  supabase: SupabaseClient,
  userId: string,
  pollId: string
): Promise<SongPollVote[]> {
  try {
    const { data: votes, error } = await supabase
      .from('song_poll_votes')
      .select('*')
      .eq('user_id', userId)
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user votes:', error);
      throw new Error(`Failed to fetch user votes: ${error.message}`);
    }

    return votes || [];
  } catch (error) {
    console.error('Error in getUserVotesForPoll:', error);
    throw error;
  }
}
