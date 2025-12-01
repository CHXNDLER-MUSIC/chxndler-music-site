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
export async function awardHeartCoins(
  supabaseClient: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const { error } = await supabaseClient
    .from('heartcoin_transactions')
    .insert({
      user_id: userId,
      amount: amount,
      reason: reason,
      metadata: metadata,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to award HeartCoins:', error);
    throw new Error(`Failed to award HeartCoins: ${error.message}`);
  }
}

/**
 * Transfer HeartCoins from one user to another.
 * This creates two transactions: one negative for sender, one positive for receiver.
 * Automatically triggers chat system message on successful transfer.
 * 
 * @param supabaseClient - The Supabase client instance
 * @param senderUserId - The user ID sending HeartCoins
 * @param receiverUserId - The user ID receiving HeartCoins
 * @param amount - The amount of HeartCoins to transfer (must be positive)
 * @param reason - Description of the transfer
 */
export async function transferHeartCoins(
  supabaseClient: SupabaseClient,
  senderUserId: string,
  receiverUserId: string,
  amount: number = 1,
  reason: string = 'HeartCoin transfer'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate amount
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    // Check sender's balance
    const { data: senderProfile, error: senderError } = await supabaseClient
      .from('profiles')
      .select('heartcoin_balance, name')
      .eq('id', senderUserId)
      .single();

    if (senderError || !senderProfile) {
      return { success: false, error: 'Could not fetch sender profile' };
    }

    if (senderProfile.heartcoin_balance < amount) {
      return { success: false, error: 'Insufficient HeartCoins' };
    }

    // Check receiver exists
    const { data: receiverProfile, error: receiverError } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('id', receiverUserId)
      .single();

    if (receiverError || !receiverProfile) {
      return { success: false, error: 'Could not find receiver' };
    }

    // Create both transactions in a batch
    const { error: transactionError } = await supabaseClient
      .from('heartcoin_transactions')
      .insert([
        {
          user_id: senderUserId,
          amount: -amount,
          reason: `Sent HeartCoin to ${receiverProfile.name}`,
          metadata: {
            transfer_type: 'outgoing',
            recipient_id: receiverUserId,
            recipient_name: receiverProfile.name
          }
        },
        {
          user_id: receiverUserId,
          amount: amount,
          reason: `Received HeartCoin from ${senderProfile.name}`,
          metadata: {
            transfer_type: 'incoming',
            sender_id: senderUserId,
            sender_name: senderProfile.name
          }
        }
      ]);

    if (transactionError) {
      console.error('HeartCoin transfer transaction error:', transactionError);
      return { success: false, error: 'Transfer failed' };
    }

    // Trigger chat system message
    try {
      const { chatService } = await import('@/lib/supabase/chat');
      await chatService.handleHeartCoinTransfer(senderUserId, receiverUserId);
    } catch (chatError) {
      console.error('Failed to post HeartCoin transfer chat message:', chatError);
      // Don't fail the transfer if chat message fails
    }

    console.log(`💛 HeartCoin transfer successful: ${senderProfile.name} → ${receiverProfile.name} (${amount})`);
    return { success: true };

  } catch (error) {
    console.error('HeartCoin transfer error:', error);
    return { success: false, error: 'Transfer failed due to unexpected error' };
  }
}