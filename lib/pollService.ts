import { SupabaseClient } from '@supabase/supabase-js';
import { 
  CastVoteRpcParams, 
  CastVoteRpcResponse, 
  SongPoll, 
  PollResults, 
  ElementType 
} from '@/types/poll';

export class PollService {
  constructor(private supabase: SupabaseClient) {}

  async castVoteWithHeartcoin(params: CastVoteRpcParams): Promise<CastVoteRpcResponse> {
    const { data, error } = await this.supabase.rpc('cast_vote_with_heartcoin', params);
    
    if (error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('already_voted')) {
        throw new Error('ALREADY_VOTED');
      }
      if (errorMessage.includes('insufficient_heartcoins')) {
        throw new Error('INSUFFICIENT_HEARTCOINS');
      }
      throw new Error(error.message);
    }
    
    return data;
  }

  async getActivePoll(): Promise<SongPoll | null> {
    const { data, error } = await this.supabase
      .from('song_poll_options')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw new Error(`Failed to fetch active poll: ${error.message}`);
    }
    
    return data;
  }

  async getPollResults(pollId: string): Promise<PollResults> {
    // Get poll info
    const poll = await this.getActivePoll();
    if (!poll || poll.id !== pollId) {
      throw new Error('Invalid or inactive poll');
    }

    // Get vote counts for each option
    const [heartVotes, waterVotes, lightningVotes, darknessVotes] = await Promise.all([
      this.getVoteCount(poll.option_heart_song_id, pollId),
      this.getVoteCount(poll.option_water_song_id, pollId),
      this.getVoteCount(poll.option_lightning_song_id, pollId),
      this.getVoteCount(poll.option_darkness_song_id, pollId)
    ]);

    const totalVotes = heartVotes + waterVotes + lightningVotes + darknessVotes;

    return {
      pollId: poll.id,
      options: {
        heart: { songId: poll.option_heart_song_id, votes: heartVotes },
        water: { songId: poll.option_water_song_id, votes: waterVotes },
        lightning: { songId: poll.option_lightning_song_id, votes: lightningVotes },
        darkness: { songId: poll.option_darkness_song_id, votes: darknessVotes }
      },
      totalVotes
    };
  }

  private async getVoteCount(songId: string, pollId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('song_poll_votes')
      .select('*', { count: 'exact', head: true })
      .eq('song_id', songId)
      .eq('poll_id', pollId);
    
    if (error) {
      throw new Error(`Failed to count votes: ${error.message}`);
    }
    
    return count || 0;
  }

  validateSongOption(poll: SongPoll, songId: string, element: ElementType): boolean {
    const validOptions = {
      HEART: poll.option_heart_song_id,
      WATER: poll.option_water_song_id,
      LIGHTNING: poll.option_lightning_song_id,
      DARKNESS: poll.option_darkness_song_id
    };

    return validOptions[element] === songId;
  }
}