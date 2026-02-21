import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Award HeartCoins to a user by creating a transaction record.
 * The database trigger will automatically update heartcoin_balance and heartcoin_total.
 * 
 * @param supabaseClient - The Supabase client instance
 * @param userId - The user ID to award HeartCoins to
 * @param amount - The amount of HeartCoins to award (can be negative for spending)
 * @param reason - Description of why the HeartCoins were awarded/spent
 * @param metadata - Additional data about the transaction
 */
export type HeartcoinTransactionInput = {
  user_id: string;
  amount: number; // negative for spending
  reason: string; // canonical reason code
  description?: string;
  metadata?: Record<string, any>;
  transaction_type?: string;
  from_user_id?: string;
  to_user_id?: string;
};

/**
 * Insert a HeartCoin transaction row. Postgres trigger updates balances.
 * Never mutate profiles. Callers should refresh profile after success.
 */
export async function logHeartcoinTransaction(
  supabaseClient: SupabaseClient,
  input: HeartcoinTransactionInput
): Promise<{ id: string }> {
  const payload: any = {
    user_id: input.user_id,
    amount: input.amount,
    reason: input.reason,
    description: input.description ?? input.reason,
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString(),
  };
  if (input.transaction_type) payload.transaction_type = input.transaction_type;
  if (input.from_user_id) payload.from_user_id = input.from_user_id;
  if (input.to_user_id) payload.to_user_id = input.to_user_id;

  if (process.env.NODE_ENV !== "production") console.debug('🪙 Inserting heartcoin transaction', payload);

  const { data, error } = await supabaseClient
    .from('heartcoin_transactions')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    // Defensive logging: surface PG error
    console.error('HeartCoin transaction insert failed:', error);
    const message = (error as any)?.message || 'Unknown error';
    throw new Error(`Failed to record HeartCoin transaction: ${message}`);
  }

  if (!data) {
    throw new Error('Failed to record HeartCoin transaction: No data returned');
  }

  // NOTE: Celebration is handled by HeartcoinBalanceProvider's realtime subscription
  // on heartcoin_transactions INSERT. Do NOT trigger here - it consumes the
  // suppression flag before the realtime handler fires, causing double celebrations.

  return { id: data.id };
}

// Backward compatibility: route all legacy calls through the new helper
export async function awardHeartCoins(
  supabaseClient: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  await logHeartcoinTransaction(supabaseClient, {
    user_id: userId,
    amount,
    reason,
    description: reason,
    transaction_type: amount > 0 ? 'bonus' : 'debit',
    metadata,
  });
}

/**
 * Transfer HeartCoins from one user to another using the heartcoin_transfers table.
 * Uses the transfer_heartcoins RPC function for atomic balance updates and logging.
 * Automatically triggers chat system message on successful transfer.
 * 
 * @param supabaseClient - The Supabase client instance
 * @param senderUserId - The user ID sending HeartCoins
 * @param receiverUserId - The user ID receiving HeartCoins
 * @param amount - The amount of HeartCoins to transfer (must be positive)
 * @param note - Description/note for the transfer
 */
export async function transferHeartCoins(
  supabaseClient: SupabaseClient,
  senderUserId: string,
  receiverUserId: string,
  amount: number = 1,
  note: string = 'HeartCoin sent via chat'
): Promise<{ success: boolean; error?: string; transfer?: any }> {
  try {
    // Validate amount
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    if (senderUserId === receiverUserId) {
      return { success: false, error: 'Cannot transfer to yourself' };
    }

    // Use the RPC function which handles balance checks, updates, and logging atomically
    const { data: transfer, error: transferError } = await supabaseClient
      .rpc('transfer_heartcoins', {
        p_receiver_profile_id: receiverUserId,
        p_amount: amount,
        p_note: note
      });

    if (transferError) {
      console.error('HeartCoin transfer RPC error:', transferError);
      
      // Parse specific error messages for better user feedback
      if (transferError.message.includes('Insufficient HeartCoins')) {
        return { success: false, error: 'Insufficient HeartCoins' };
      } else if (transferError.message.includes('Receiver profile not found')) {
        return { success: false, error: 'Receiver not found' };
      } else if (transferError.message.includes('Not authenticated')) {
        return { success: false, error: 'Not authenticated' };
      } else {
        return { success: false, error: 'Transfer failed' };
      }
    }

    if (!transfer) {
      return { success: false, error: 'Transfer failed - no data returned' };
    }

    // Get profile names for logging and chat messages
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, name')
      .in('id', [senderUserId, receiverUserId]);

    const senderProfile = profiles?.find(p => p.id === senderUserId);
    const receiverProfile = profiles?.find(p => p.id === receiverUserId);

    // Trigger chat system message
    try {
      const { chatService } = await import('@/lib/supabase/chat');
      await chatService.handleHeartCoinTransfer(senderUserId, receiverUserId);
    } catch (chatError) {
      console.error('Failed to post HeartCoin transfer chat message:', chatError);
      // Don't fail the transfer if chat message fails
    }

    if (process.env.NODE_ENV !== "production") console.log(`💛 HeartCoin transfer successful: ${senderProfile?.name} → ${receiverProfile?.name} (${amount})`);
    return { success: true, transfer };

  } catch (error) {
    console.error('HeartCoin transfer error:', error);
    return { success: false, error: 'Transfer failed due to unexpected error' };
  }
}
