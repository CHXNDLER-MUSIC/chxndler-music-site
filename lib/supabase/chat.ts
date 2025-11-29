import { supabaseClient } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Element color mappings
export const ELEMENT_COLORS = {
  heart: '#FC54AF',
  water: '#38B6FF', 
  lightning: '#F2EF1D',
  darkness: 'linear-gradient(135deg, #1a1a2e 0%, #000000 100%)',
  alien: '#00FF00'
} as const;

export type ElementType = keyof typeof ELEMENT_COLORS;

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  stream_session_id: string;
  message_type: 'message' | 'join' | 'leave';
  created_at: string;
  
  // Joined user profile data
  user_profile?: {
    name: string | null;
    element: string | null;
    avatar_badge_id: string | null;
  };
}

export interface ChatUser {
  id: string;
  name: string | null;
  element: ElementType | null;
  avatar_badge_id: string | null;
  last_seen: string;
}

export class ChatService {
  private channel: RealtimeChannel | null = null;
  private currentSessionId: string | null = null;

  /**
   * Get the current stream session ID
   */
  async getCurrentStreamSession(): Promise<string> {
    if (this.currentSessionId) {
      return this.currentSessionId;
    }

    try {
      const { data, error } = await supabaseClient.rpc('get_current_stream_session');
      if (error) {
        console.warn('Stream session RPC not available, using fallback:', error.message || 'Unknown error');
        throw error;
      }
      
      this.currentSessionId = data;
      console.log('✅ Got stream session from DB:', data);
      return data;
    } catch (error) {
      // Fallback: generate session ID client-side
      const fallback = `stream_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}_${String(new Date().getDate()).padStart(2, '0')}_${String(new Date().getHours()).padStart(2, '0')}`;
      this.currentSessionId = fallback;
      console.log('⚡ Using fallback session ID:', fallback);
      return fallback;
    }
  }

  /**
   * Subscribe to real-time chat messages
   */
  async subscribeToChat(
    onMessage: (message: ChatMessage) => void,
    onError?: (error: any) => void,
    onTyping?: (typingData: { user_id: string, display_name: string, is_typing: boolean }) => void
  ): Promise<RealtimeChannel> {
    try {
      const sessionId = await this.getCurrentStreamSession();
      
      // Unsubscribe from existing channel
      if (this.channel) {
        await supabaseClient.removeChannel(this.channel);
      }

      this.channel = supabaseClient
        .channel(`chat:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `stream_session_id=eq.${sessionId}`
          },
          async (payload) => {
            try {
              // Fetch complete message with user profile data
              const { data: messageWithProfile, error } = await supabaseClient
                .from('chat_messages')
                .select(`
                  *,
                  user_profile:profiles!user_id (
                    name,
                    element,
                    avatar_badge_id
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (error) {
                console.error('Error fetching message with profile:', error);
                return;
              }

              onMessage(messageWithProfile as ChatMessage);
            } catch (error) {
              console.error('Error processing new message:', error);
              onError?.(error);
            }
          }
        )
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (onTyping && payload.payload) {
            onTyping(payload.payload);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Chat subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Chat subscription error');
            onError?.('Chat subscription failed');
          }
        });

      return this.channel;
    } catch (error) {
      console.error('Error subscribing to chat:', error);
      onError?.(error);
      throw error;
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(message: string, messageType: 'message' | 'join' | 'leave' = 'message', anonymousName?: string): Promise<ChatMessage | null> {
    try {
      const sessionId = await this.getCurrentStreamSession();
      
      // Check if user is authenticated
      const { data: { session } } = await supabaseClient.auth.getSession();
      console.log('🔥 SendMessage session check:', { hasSession: !!session, hasUser: !!session?.user, anonymousName });
      
      if (!session?.user) {
        // For anonymous users, return a mock message with alien name for local display
        console.log('🔥 Anonymous user message:', message, 'Display name:', anonymousName);
        const mockMessage = {
          id: `anonymous-${Date.now()}`,
          user_id: 'anonymous',
          message: message.trim(),
          stream_session_id: sessionId,
          message_type: messageType,
          created_at: new Date().toISOString(),
          user_profile: {
            name: anonymousName || 'ALIEN [0000]',
            element: 'alien',
            avatar_badge_id: null
          }
        } as ChatMessage;
        console.log('🔥 Returning mock message:', mockMessage);
        return mockMessage;
      }
      
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .insert({
          message: message.trim(),
          stream_session_id: sessionId,
          message_type: messageType
        })
        .select(`
          *,
          user_profile:profiles!user_id (
            name,
            element,
            avatar_badge_id
          )
        `)
        .single();

      if (error) {
        console.warn('Database not accessible for sending message:', error.message || 'Unknown error');
        return null;
      }

      return data as ChatMessage;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return null;
    }
  }

  /**
   * Send a user join message
   */
  async sendJoinMessage(displayName: string): Promise<ChatMessage | null> {
    return this.sendMessage(`✨ ${displayName} has entered the room`, 'join');
  }

  /**
   * Send a signal sync message when user opens chat
   */
  async sendSyncMessage(displayName: string): Promise<ChatMessage | null> {
    return this.sendMessage(`${displayName} connected to the signal`, 'join', displayName);
  }

  /**
   * Send a user leave message
   */
  async sendLeaveMessage(displayName: string): Promise<ChatMessage | null> {
    return this.sendMessage(`👋 ${displayName} has left the room`, 'leave');
  }

  /**
   * Load recent chat messages for the current session
   */
  async loadRecentMessages(limit: number = 50): Promise<ChatMessage[]> {
    try {
      const sessionId = await this.getCurrentStreamSession();
      
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .select(`
          *,
          user_profile:profiles!user_id (
            name,
            element,
            avatar_badge_id
          )
        `)
        .eq('stream_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Database not accessible for chat messages, using empty state:', error.message || 'Unknown error');
        return [];
      }

      return (data || []).reverse() as ChatMessage[];
    } catch (error) {
      console.warn('Chat messages unavailable, starting fresh session');
      return [];
    }
  }

  /**
   * Get list of users currently in the chat
   */
  async getChatUsers(): Promise<ChatUser[]> {
    try {
      const sessionId = await this.getCurrentStreamSession();
      
      // Get unique users from recent messages (last 30 minutes)
      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
      
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .select(`
          user_id,
          created_at,
          user_profile:profiles!user_id (
            name,
            element,
            avatar_badge_id
          )
        `)
        .eq('stream_session_id', sessionId)
        .gte('created_at', thirtyMinutesAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Database not accessible for chat users, using local state:', error.message || 'Unknown error');
        return [];
      }

      // Remove duplicates and format data
      const uniqueUsers = new Map<string, ChatUser>();
      
      for (const message of data || []) {
        if (!message.user_profile || uniqueUsers.has(message.user_id)) continue;
        
        uniqueUsers.set(message.user_id, {
          id: message.user_id,
          name: message.user_profile.name,
          element: message.user_profile.element as ElementType | null,
          avatar_badge_id: message.user_profile.avatar_badge_id,
          last_seen: message.created_at
        });
      }

      return Array.from(uniqueUsers.values());
    } catch (error) {
      console.warn('Chat users unavailable, relying on local state');
      return [];
    }
  }

  /**
   * Check if user is currently live streaming
   */
  async checkLiveStatus(): Promise<boolean> {
    try {
      // Get current user first
      const { data: session } = await supabaseClient.auth.getSession();
      if (!session?.session?.user) {
        return false;
      }

      // Check current user's profile for twitch_live_status
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('twitch_live_status')
        .eq('id', session.session.user.id)
        .single();

      if (error) {
        // Only log non-empty errors to avoid console spam
        if (error && Object.keys(error).length > 0 && error.message) {
          console.error('Error checking live status:', {
            message: error.message,
            code: error.code || 'unknown',
            details: error.details || 'none'
          });
        }
        return false;
      }

      return data?.twitch_live_status || false;
    } catch (error) {
      if (error && error instanceof Error && error.message) {
        console.error('Error in checkLiveStatus:', error.message);
      }
      return false;
    }
  }

  /**
   * Update user avatar badge
   */
  async updateAvatarBadge(badgeId: string | null): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ avatar_badge_id: badgeId })
        .eq('id', (await supabaseClient.auth.getSession()).data.session?.user.id);

      if (error) {
        console.error('Error updating avatar badge:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateAvatarBadge:', error);
      return false;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(displayName: string, isTyping: boolean): Promise<void> {
    if (!this.channel) return;
    
    try {
      const sessionId = await this.getCurrentStreamSession();
      const { data: { session } } = await supabaseClient.auth.getSession();
      const userId = session?.user?.id || 'anonymous';
      
      await this.channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: userId,
          display_name: displayName,
          is_typing: isTyping,
          session_id: sessionId,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Cleanup - unsubscribe from chat
   */
  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await supabaseClient.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Clean up old messages (admin function)
   */
  async cleanupOldMessages(): Promise<boolean> {
    try {
      const { error } = await supabaseClient.rpc('cleanup_old_chat_messages');
      
      if (error) {
        console.error('Error cleaning up messages:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in cleanupOldMessages:', error);
      return false;
    }
  }
}

// Singleton instance
export const chatService = new ChatService();

// Utility functions
export function getElementColor(element: string | null | undefined): string {
  if (!element) return '#FFFFFF';
  const normalizedElement = element.toLowerCase() as ElementType;
  return ELEMENT_COLORS[normalizedElement] || '#FFFFFF';
}

export function getElementIcon(element: string | null | undefined): string {
  if (!element) return '/elements/chxndler.webp';
  const normalizedElement = element.toLowerCase();
  return `/elements/${normalizedElement}.webp`;
}

export function formatChatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export function sanitizeMessage(message: string): string {
  // Basic sanitization - remove potential XSS
  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 500); // Max length
}