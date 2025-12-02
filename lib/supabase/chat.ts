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
    profile_image_url: string | null;
  };
}

export interface ChatUser {
  id: string;
  name: string | null;
  element: ElementType | null;
  avatar_badge_id: string | null;
  profile_image_url: string | null;
  last_seen: string;
}

export class ChatService {
  private channel: RealtimeChannel | null = null;
  private currentSessionId: string | null = null;
  // Session tracking for first-time user connections
  private sessionConnectedUsers: Set<string> = new Set();

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
                    avatar_badge_id,
                    profile_image_url
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
   * Post a system message (for automated events)
   * These appear as special messages not attributed to any user
   */
  async postSystemMessage(message: string): Promise<ChatMessage | null> {
    try {
      const sessionId = await this.getCurrentStreamSession();
      
      // Create a system message with special user_id 'system'
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .insert({
          user_id: 'system',
          message: message.trim(),
          stream_session_id: sessionId,
          message_type: 'message'
        })
        .select(`
          *,
          user_profile:profiles!user_id (
            name,
            element,
            avatar_badge_id,
            profile_image_url
          )
        `)
        .single();

      if (error) {
        console.error('Error posting system message:', error);
        return null;
      }

      // Return the system message with special system profile
      return {
        ...data,
        user_profile: {
          name: 'SYSTEM',
          element: null,
          avatar_badge_id: null,
          profile_image_url: null
        }
      } as ChatMessage;
    } catch (error) {
      console.error('Error in postSystemMessage:', error);
      return null;
    }
  }

  /**
   * Check if this is the user's first-ever message
   */
  async isFirstEverMessage(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .select('id')
        .eq('user_id', userId)
        .eq('message_type', 'message')
        .limit(1);

      if (error) {
        console.error('Error checking first message status:', error);
        return false;
      }

      // If no messages found, this is their first message
      return !data || data.length === 0;
    } catch (error) {
      console.error('Error in isFirstEverMessage:', error);
      return false;
    }
  }

  /**
   * Handle first-time user connection to chat session
   * Triggers welcome message only once per session
   */
  async handleFirstTimeConnection(userId: string, userName: string): Promise<void> {
    // Skip if already connected this session or if anonymous
    if (this.sessionConnectedUsers.has(userId) || userId === 'anonymous') {
      return;
    }

    // Mark user as connected this session
    this.sessionConnectedUsers.add(userId);

    // Post welcome system message
    const welcomeMessage = `✨ ${userName} has connected to the Heartverse. Welcome home.`;
    await this.postSystemMessage(welcomeMessage);
    
    console.log(`🎉 First-time connection: ${userName} (${userId})`);
  }

  /**
   * Handle user sending their first-ever message
   * Triggers first transmission message and posts it BEFORE their message
   */
  async handleFirstEverMessage(userId: string, userName: string): Promise<void> {
    if (userId === 'anonymous' || userId === 'system') {
      return;
    }

    const isFirst = await this.isFirstEverMessage(userId);
    if (isFirst) {
      // Post first transmission system message BEFORE their actual message
      const firstTransmissionMessage = `⭐ First Transmission Received from ${userName}`;
      await this.postSystemMessage(firstTransmissionMessage);
      
      console.log(`🌟 First-ever message from: ${userName} (${userId})`);
    }
  }

  /**
   * Handle HeartCoin transfer system message
   * Called after successful HeartCoin transfer
   */
  async handleHeartCoinTransfer(senderUserId: string, receiverUserId: string): Promise<void> {
    try {
      // Get both users' profile names
      const { data: profiles, error } = await supabaseClient
        .from('profiles')
        .select('id, name')
        .in('id', [senderUserId, receiverUserId]);

      if (error || !profiles || profiles.length !== 2) {
        console.error('Error getting user profiles for HeartCoin transfer:', error);
        return;
      }

      const sender = profiles.find(p => p.id === senderUserId);
      const receiver = profiles.find(p => p.id === receiverUserId);

      if (!sender || !receiver) {
        console.error('Could not find sender or receiver profiles');
        return;
      }

      // Post HeartCoin transfer system message
      const transferMessage = `💛 ${sender.name} sent a HeartCoin to ${receiver.name} — the signal strengthens.`;
      await this.postSystemMessage(transferMessage);
      
      console.log(`💛 HeartCoin transfer: ${sender.name} → ${receiver.name}`);
    } catch (error) {
      console.error('Error in handleHeartCoinTransfer:', error);
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
            avatar_badge_id: null,
            profile_image_url: null
          }
        } as ChatMessage;
        console.log('🔥 Returning mock message:', mockMessage);
        return mockMessage;
      }

      // For authenticated users sending regular messages, check if it's their first message
      if (messageType === 'message') {
        // Get user profile for the name
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.name) {
          // Trigger first-ever message check BEFORE sending their message
          await this.handleFirstEverMessage(session.user.id, profile.name);
        }
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
            avatar_badge_id,
            profile_image_url
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
            avatar_badge_id,
            profile_image_url
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
            avatar_badge_id,
            profile_image_url
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
          profile_image_url: message.user_profile.profile_image_url,
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