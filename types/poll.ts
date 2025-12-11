export type ElementType = 'HEART' | 'WATER' | 'LIGHTNING' | 'DARKNESS';

export interface SongPoll {
  id: string;
  title: string;
  is_active: boolean;
  poll_id: string;
  option_heart_song_id: string;
  option_water_song_id: string;
  option_lightning_song_id: string;
  option_darkness_song_id: string;
  created_at: string;
}

export interface SongPollVote {
  id: string;
  poll_id: string;
  user_id: string;
  song_id: string;
  element: ElementType;
  heartcoins_spent: number;
  created_at: string;
}

export interface PollOption {
  songId: string;
  title?: string;
  votes: number;
}

export interface PollResults {
  pollId: string;
  options: {
    heart: PollOption;
    water: PollOption;
    lightning: PollOption;
    darkness: PollOption;
  };
  totalVotes: number;
}

export interface VoteRequest {
  pollId: string;
  songId: string;
  element: ElementType;
}

export interface VoteResponse {
  success: boolean;
  error?: 'ALREADY_VOTED' | 'INSUFFICIENT_HEARTCOINS' | 'INVALID_POLL' | 'INVALID_SONG';
  results?: PollResults;
}

export interface CastVoteRpcParams {
  p_poll_id: string;
  p_user_id: string;
  p_song_id: string;
  p_element: ElementType;
}

export interface CastVoteRpcResponse {
  id: string;
  poll_id: string;
  user_id: string;
  song_id: string;
  element: ElementType;
  heartcoins_spent: number;
  created_at: string;
}